globalThis.process ??= {};
globalThis.process.env ??= {};
import { getSession } from "./auth_CKZlflBM.mjs";
import { audit, softDeleteFile } from "./storage_4EcGQgty.mjs";
import { i as isSecretName, m as maskVal, r as resolveUserLabels, e as extOfName, a as isUserColumn } from "./storage-admin_DVOON2RH.mjs";
import { env } from "cloudflare:workers";
const prerender = false;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
async function d1Tables() {
  const rows = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()).results;
  return rows.map((r) => r.name);
}
async function assertTable(table) {
  return (await d1Tables()).includes(table);
}
async function d1Columns(table) {
  const rows = (await env.DB.prepare(`PRAGMA table_info("${table}")`).all()).results;
  return rows.map((r) => r.name);
}
function kvOf(ns) {
  if (ns === "LICENSE") return env.LICENSE;
  if (ns === "MEDIA") return env.MEDIA ?? null;
  return null;
}
const POST = async ({ request }) => {
  const ses = await getSession(env, request);
  if (!ses) return json({ error: "ログインが必要" }, 401);
  if (ses.role !== "admin") return json({ error: "管理者のみ" }, 403);
  const b = await request.json().catch(() => ({}));
  switch (b._action) {
    // ── D1 ─────────────────────────────────────────────
    case "d1_tables": {
      const names = await d1Tables();
      const results = await env.DB.batch(names.map((name) => env.DB.prepare(`SELECT COUNT(*) AS n FROM "${name}"`))).catch(() => []);
      const out = names.map((name, i) => ({ name, rows: results[i]?.results?.[0]?.n ?? 0 }));
      return json({ ok: true, tables: out });
    }
    case "d1_rows": {
      const table = String(b.table ?? "");
      if (!await assertTable(table)) return json({ error: "不明なテーブル" }, 400);
      const cols = await d1Columns(table);
      const limit = Math.min(200, Math.max(1, Number(b.limit) || 50));
      const offset = Math.max(0, Number(b.offset) || 0);
      const binds = [];
      let where = "";
      if (b.filterCol && cols.includes(String(b.filterCol)) && b.filterVal != null && b.filterVal !== "") {
        where = ` WHERE "${b.filterCol}" LIKE ?`;
        binds.push(`%${b.filterVal}%`);
      }
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM "${table}"${where}`).bind(...binds).first())?.n ?? 0;
      const rows = (await env.DB.prepare(`SELECT rowid AS __rowid, * FROM "${table}"${where} LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all()).results;
      const secretCols = cols.filter(isSecretName);
      const userCols = cols.filter(isUserColumn);
      const masked = rows.map((r) => {
        const o = {};
        for (const [k, v] of Object.entries(r)) o[k] = secretCols.includes(k) ? maskVal(v) : v;
        return o;
      });
      const uids = [];
      for (const r of rows) for (const c of userCols) {
        const v = r[c];
        if (v != null) uids.push(String(v));
      }
      const userLabels = userCols.length ? await resolveUserLabels(env, uids) : {};
      return json({ ok: true, table, columns: cols, secretColumns: secretCols, userColumns: userCols, userLabels, rows: masked, total, limit, offset });
    }
    case "d1_update": {
      const table = String(b.table ?? "");
      if (!await assertTable(table)) return json({ error: "不明なテーブル" }, 400);
      if (typeof b.rowid !== "number") return json({ error: "rowid が必要" }, 400);
      const cols = await d1Columns(table);
      const entries = Object.entries(b.set ?? {}).filter(([k]) => cols.includes(k));
      if (!entries.length) return json({ error: "更新対象の列がありません" }, 400);
      const setSql = entries.map(([k]) => `"${k}"=?`).join(",");
      const r = await env.DB.prepare(`UPDATE "${table}" SET ${setSql} WHERE rowid=?`).bind(...entries.map(([, v]) => v), b.rowid).run();
      await audit(env, ses.uid, "storage.d1.update", `${table}#${b.rowid}:${entries.map(([k]) => k).join(",")}`);
      return json({ ok: true, changes: r.meta?.changes ?? 0 });
    }
    case "d1_delete": {
      const table = String(b.table ?? "");
      if (!await assertTable(table)) return json({ error: "不明なテーブル" }, 400);
      if (typeof b.rowid !== "number") return json({ error: "rowid が必要" }, 400);
      const r = await env.DB.prepare(`DELETE FROM "${table}" WHERE rowid=?`).bind(b.rowid).run();
      await audit(env, ses.uid, "storage.d1.delete", `${table}#${b.rowid}`);
      return json({ ok: true, changes: r.meta?.changes ?? 0 });
    }
    // ── ファイル（実名・拡張子・投稿者つき。admin は全ユーザーのファイルを管理）─────
    case "files_list": {
      const limit = Math.min(200, Math.max(1, Number(b.limit) || 50));
      const offset = Math.max(0, Number(b.offset) || 0);
      const binds = [];
      let where = "";
      if (b.filterVal != null && b.filterVal !== "") {
        where = " WHERE name LIKE ?";
        binds.push(`%${b.filterVal}%`);
      }
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM files${where}`).bind(...binds).first())?.n ?? 0;
      const rows = (await env.DB.prepare(`SELECT id, name, size, mime, ref, created_by, created_at, deleted_at FROM files${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all()).results;
      const labels = await resolveUserLabels(env, rows.map((r) => r.created_by));
      const files = rows.map((r) => ({
        id: r.id,
        name: r.name,
        ext: extOfName(r.name),
        size: r.size,
        mime: r.mime,
        storage: r.ref.startsWith("drive:") ? "Drive" : r.ref.startsWith("r2:") ? "R2" : "KV",
        uploader: labels[String(r.created_by)] ?? (r.created_by ?? ""),
        created_at: r.created_at,
        deleted: r.deleted_at != null
      }));
      return json({ ok: true, files, total, limit, offset });
    }
    case "files_delete": {
      const id = String(b.fileId ?? "");
      if (!id) return json({ error: "fileId が必要" }, 400);
      await softDeleteFile(env, id);
      await audit(env, ses.uid, "storage.file.delete", id);
      return json({ ok: true });
    }
    // ── KV ─────────────────────────────────────────────
    case "kv_list": {
      const kv = kvOf(String(b.ns ?? ""));
      if (!kv) return json({ error: "不明な名前空間" }, 400);
      const res = await kv.list({ prefix: b.prefix || void 0, cursor: b.cursor || void 0, limit: 100 });
      const keys = res.keys.map((k) => ({ name: k.name, secret: isSecretName(k.name), expiration: k.expiration ?? null }));
      return json({ ok: true, ns: b.ns, keys, cursor: res.list_complete ? null : res.cursor });
    }
    case "kv_get": {
      const ns = String(b.ns ?? "");
      const kv = kvOf(ns);
      if (!kv) return json({ error: "不明な名前空間" }, 400);
      const key = String(b.key ?? "");
      if (ns === "MEDIA") {
        const buf = await kv.get(key, { type: "arrayBuffer" });
        const fileId = key.startsWith("f/") ? key.slice(2) : null;
        return json({ ok: true, ns, key, binary: true, size: buf?.byteLength ?? 0, fileId, note: "暗号化ファイル本体のため中身は表示しません" });
      }
      const val = await kv.get(key);
      if (isSecretName(key)) return json({ ok: true, ns, key, masked: true, value: maskVal(val) });
      return json({ ok: true, ns, key, masked: false, value: val });
    }
    case "kv_put": {
      const ns = String(b.ns ?? "");
      const kv = kvOf(ns);
      if (!kv || ns === "MEDIA") return json({ error: ns === "MEDIA" ? "MEDIA（ファイル本体）はこの画面から編集できません" : "不明な名前空間" }, 400);
      const key = String(b.key ?? "");
      if (!key) return json({ error: "key が必要" }, 400);
      await kv.put(key, String(b.value ?? ""));
      await audit(env, ses.uid, "storage.kv.put", `${ns}:${key}`);
      return json({ ok: true });
    }
    case "kv_delete": {
      const ns = String(b.ns ?? "");
      const kv = kvOf(ns);
      if (!kv) return json({ error: "不明な名前空間" }, 400);
      const key = String(b.key ?? "");
      await kv.delete(key);
      await audit(env, ses.uid, "storage.kv.delete", `${ns}:${key}`);
      return json({ ok: true });
    }
    // ── R2 ─────────────────────────────────────────────
    case "r2_list": {
      const r2 = env.MEDIA_R2;
      if (!r2) return json({ ok: true, enabled: false, objects: [], cursor: null });
      const res = await r2.list({ prefix: b.prefix || void 0, cursor: b.cursor || void 0, limit: 100 });
      const objects = res.objects.map((o) => ({ key: o.key, size: o.size, uploaded: o.uploaded instanceof Date ? o.uploaded.toISOString() : String(o.uploaded) }));
      return json({ ok: true, enabled: true, objects, cursor: res.truncated ? res.cursor : null });
    }
    case "r2_get": {
      const r2 = env.MEDIA_R2;
      if (!r2) return json({ error: "R2 未設定" }, 400);
      const head = await r2.head(String(b.r2key ?? ""));
      if (!head) return json({ error: "not found" }, 404);
      return json({ ok: true, key: head.key, size: head.size, uploaded: head.uploaded instanceof Date ? head.uploaded.toISOString() : String(head.uploaded), contentType: head.httpMetadata?.contentType ?? null, note: "本体は暗号化のため表示しません" });
    }
    case "r2_delete": {
      const r2 = env.MEDIA_R2;
      if (!r2) return json({ error: "R2 未設定" }, 400);
      await r2.delete(String(b.r2key ?? ""));
      await audit(env, ses.uid, "storage.r2.delete", String(b.r2key ?? ""));
      return json({ ok: true });
    }
    default:
      return json({ error: "不明な操作" }, 400);
  }
};
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page
};
