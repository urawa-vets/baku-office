globalThis.process ??= {};
globalThis.process.env ??= {};
import { getApiKey } from "./client_DbLECgB2.mjs";
import { DiscordInbound } from "./discord_DPe7Z3mk.mjs";
import { c as checkAccess, d as decideApprovalFromChat, j as joinViaInvite, r as respondInbound } from "./approval-chat_CDhLgBum.mjs";
import { r as resolveUserLabels, e as extOfName, i as isSecretName, m as maskVal } from "./storage-admin_DVOON2RH.mjs";
import { softDeleteFile, audit, inboundFileLimitBytes, buildFallbackName, saveFile } from "./storage_4EcGQgty.mjs";
import { kvPut } from "./kv_Bpi6S22S.mjs";
import { H as verifyLineSignature, I as lineLoadingStart, J as lineReply, l as linePush, K as lineReplyQuick, h as cfEgressGateway } from "./ctx_DH8R7Lvm.mjs";
import { getDriveSave } from "./drive_wIZSRvWd.mjs";
import { getWorkersPaid } from "./settings_DI_y7gTJ.mjs";
import { logDiag, looksLikeLimit, PAID_HINT } from "./diag_CsI0yNfw.mjs";
import { env } from "cloudflare:workers";
const ok = () => new Response("ok", { status: 200 });
class SlackInbound {
  id = "slack";
  gw;
  signingSecret;
  botToken;
  constructor(gw, creds) {
    this.gw = gw;
    this.signingSecret = creds.signingSecret;
    this.botToken = creds.botToken;
  }
  async handleInbound(req, ic) {
    const ts = req.headers.get("x-slack-request-timestamp") ?? "";
    const sig = req.headers.get("x-slack-signature") ?? "";
    const body = await req.text();
    if (!ts || !sig || !await verifySlack(this.signingSecret, ts, body, sig)) {
      return new Response("invalid signature", { status: 401 });
    }
    if ((req.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded")) {
      const payloadStr = new URLSearchParams(body).get("payload");
      if (payloadStr) {
        try {
          const p = JSON.parse(payloadStr);
          const sender = p.user?.id;
          const value = p.actions?.[0]?.value ?? p.actions?.[0]?.action_id ?? "";
          if (p.type === "block_actions" && sender && value) {
            const responseUrl = p.response_url;
            ic.waitUntil((async () => {
              const out = await ic.decideApproval("slack", sender, value).catch(() => null);
              if (out && responseUrl) await this.postResponseUrl(responseUrl, out);
            })());
          }
        } catch {
        }
      }
      return ok();
    }
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return new Response("bad request", { status: 400 });
    }
    if (data.type === "url_verification") return new Response(data.challenge ?? "", { status: 200 });
    const ev = data.event;
    const addressed = ev?.type === "app_mention" || ev?.type === "message" && ev.channel_type === "im";
    if (ev && !ev.bot_id && !ev.subtype && addressed) {
      const sender = ev.user;
      const text = stripMention(ev.text ?? "");
      const channel = ev.channel;
      if (sender && text && channel) {
        ic.waitUntil(
          (async () => {
            const out = await ic.respond({ connector: "slack", sender, text, channel });
            await this.postMessage(channel, out.text);
          })()
        );
      }
    }
    return ok();
  }
  async postMessage(channel, text) {
    await this.gw.fetch("slack", "https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.botToken}` },
      body: JSON.stringify({ channel, text })
    });
  }
  // インタラクティブ応答は response_url（署名不要の一時URL）へ POST する。ボタン押下の結果通知に使う。
  async postResponseUrl(url, text) {
    await this.gw.fetch("slack", url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, replace_original: false })
    }).catch(() => {
    });
  }
}
function stripMention(text) {
  return text.replace(/<@[^>]+>/g, "").trim();
}
async function verifySlack(signingSecret, timestamp, body, signature, nowSec) {
  const now = Math.floor(Date.now() / 1e3);
  if (!/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 60 * 5) return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(signingSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`v0:${timestamp}:${body}`));
    const expected = "v0=" + Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
    return timingSafeEqual(expected, signature);
  } catch {
    return false;
  }
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const PENDING_KEY = (uid) => `dm_pending:${uid}`;
const fmtSize = (n) => n == null ? "—" : n < 1024 ? n + "B" : n < 1048576 ? Math.round(n / 1024) + "KB" : (n / 1048576).toFixed(1) + "MB";
const HELP = [
  "📊 データ管理（管理者）",
  "・ファイル一覧 [語]",
  "・テーブル一覧",
  "・行 <テーブル>",
  "・KV一覧 [prefix]",
  "・削除 ファイル <id>",
  "・削除 行 <テーブル> <rowid>",
  "・削除 KV <名前空間> <キー>",
  "※削除は確認ボタンで実行。編集は Web の「データ管理」画面から。"
].join("\n");
function classifyDmText(text) {
  const t = (text ?? "").trim();
  if (t === "データ" || t === "データ管理") return "help";
  if (/^ファイル一覧/.test(t) || /^ファイル\s+/.test(t)) return "files";
  if (t === "テーブル一覧") return "tables";
  if (/^行\s+/.test(t)) return "rows";
  if (/^KV一覧/i.test(t)) return "kv";
  if (/^削除\s+/.test(t)) return "del";
  if (t === "削除OK") return "delok";
  if (t === "キャンセル") return "cancel";
  return null;
}
function parseDeleteTarget(rest) {
  let m;
  if (m = /^ファイル\s+(\S+)/.exec(rest)) return { kind: "file", id: m[1] };
  if (m = /^行\s+(\S+)\s+(\d+)/.exec(rest)) return { kind: "d1", table: m[1], rowid: m[2] };
  if (m = /^KV\s+(\S+)\s+(\S+)/i.exec(rest)) return { kind: "kv", ns: m[1], key: m[2] };
  return null;
}
async function tableExists(env2, name) {
  const r = await env2.DB.prepare("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name=?").bind(name).first().catch(() => null);
  return !!r;
}
async function handleDataAdminCommand(ctx, env2, connector, userId, text, baseUrl) {
  const t = (text ?? "").trim();
  const cmd = classifyDmText(t);
  if (!cmd) return { handled: false };
  const acc = await checkAccess(ctx, env2, connector, userId);
  if (!acc.ok || acc.role !== "admin") return { handled: false };
  const uid = acc.uid;
  if (cmd === "help") return { handled: true, text: HELP };
  if (cmd === "files") {
    const q = t.replace(/^ファイル一覧\s*/, "").replace(/^ファイル\s+/, "").trim();
    const binds = [];
    let where = "";
    if (q) {
      where = " WHERE name LIKE ?";
      binds.push(`%${q}%`);
    }
    const total = (await env2.DB.prepare(`SELECT COUNT(*) AS n FROM files${where}`).bind(...binds).first())?.n ?? 0;
    const rows = (await env2.DB.prepare(`SELECT id,name,size,created_by FROM files${where} ORDER BY created_at DESC LIMIT 8`).bind(...binds).all()).results;
    const labels = await resolveUserLabels(env2, rows.map((r) => r.created_by));
    const lines = rows.map((r) => `・${r.name}${extOfName(r.name) ? "" : "（拡張子なし）"}（${fmtSize(r.size)}・${labels[String(r.created_by)] ?? r.created_by ?? "?"}）
  ${baseUrl}/files/${r.id}`);
    return { handled: true, text: `📂 ファイル（${rows.length}/${total}件）
${lines.join("\n") || "なし"}

削除は「削除 ファイル <id>」` };
  }
  if (cmd === "tables") {
    const names = (await env2.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()).results;
    return { handled: true, text: `📋 テーブル（${names.length}）
${names.map((n) => n.name).join(" / ")}

中身は「行 <テーブル>」` };
  }
  if (cmd === "rows") {
    const table = t.replace(/^行\s+/, "").trim().split(/\s+/)[0] ?? "";
    if (!await tableExists(env2, table)) return { handled: true, text: `テーブル「${table}」が見つかりません。「テーブル一覧」で確認してください。` };
    const cols = (await env2.DB.prepare(`PRAGMA table_info("${table}")`).all()).results.map((c) => c.name);
    const rows = (await env2.DB.prepare(`SELECT rowid AS __rowid, * FROM "${table}" LIMIT 6`).all()).results;
    const show = cols.filter((c) => c !== "__rowid").slice(0, 4);
    const lines = rows.map((r) => {
      const parts = show.map((c) => `${c}=${isSecretName(c) ? maskVal(r[c]) : String(r[c] ?? "").slice(0, 24)}`);
      return `#${r.__rowid} ${parts.join(" / ")}`;
    });
    return { handled: true, text: `🗂 ${table}（先頭${rows.length}行・列は先頭4つ）
${lines.join("\n") || "なし"}

削除は「削除 行 ${table} <rowid>」` };
  }
  if (cmd === "kv") {
    const prefix = t.replace(/^KV一覧\s*/i, "").trim();
    const res = await env2.LICENSE.list({ prefix: prefix || void 0, limit: 20 });
    const lines = res.keys.map((k) => `・${k.name}${isSecretName(k.name) ? " 🔒" : ""}`);
    return { handled: true, text: `🔑 KV LICENSE（${res.keys.length}件${res.list_complete ? "" : "＋"}）
${lines.join("\n") || "なし"}

削除は「削除 KV LICENSE <キー>」` };
  }
  if (cmd === "del") {
    const rest = t.replace(/^削除\s+/, "").trim();
    const pending = parseDeleteTarget(rest);
    if (!pending) return { handled: true, text: "削除の指定が不正です。例：削除 ファイル <id> / 削除 行 <テーブル> <rowid> / 削除 KV LICENSE <キー>" };
    const desc = pending.kind === "file" ? `ファイル ${pending.id}` : pending.kind === "d1" ? `行 ${pending.table}#${pending.rowid}` : `KV ${pending.ns}:${pending.key}`;
    if (pending.kind === "d1" && !await tableExists(env2, pending.table)) return { handled: true, text: `テーブル「${pending.table}」が見つかりません。` };
    await kvPut(env2, PENDING_KEY(uid), JSON.stringify(pending), { expirationTtl: 300 });
    return { handled: true, text: `⚠️ ${desc} を削除します。よろしいですか？（5分以内に「削除OK」）`, menu: ["削除OK", "キャンセル"] };
  }
  if (cmd === "cancel") {
    const raw = await env2.LICENSE.get(PENDING_KEY(uid));
    if (!raw) return { handled: false };
    await env2.LICENSE.delete(PENDING_KEY(uid)).catch(() => {
    });
    return { handled: true, text: "削除をキャンセルしました。" };
  }
  if (cmd === "delok") {
    const raw = await env2.LICENSE.get(PENDING_KEY(uid));
    if (!raw) return { handled: true, text: "確認対象の削除がありません（期限切れの可能性）。もう一度「削除 …」からやり直してください。" };
    await env2.LICENSE.delete(PENDING_KEY(uid)).catch(() => {
    });
    let p;
    try {
      p = JSON.parse(raw);
    } catch {
      return { handled: true, text: "削除情報の読み取りに失敗しました。" };
    }
    if (p.kind === "file") {
      await softDeleteFile(env2, p.id);
      await audit(env2, uid, "storage.file.delete", `line:${p.id}`);
      return { handled: true, text: `🗑 ファイル ${p.id} を削除しました（30日後に実体消去）。` };
    }
    if (p.kind === "d1") {
      if (!await tableExists(env2, p.table)) return { handled: true, text: "テーブルが見つかりません。" };
      const r = await env2.DB.prepare(`DELETE FROM "${p.table}" WHERE rowid=?`).bind(Number(p.rowid)).run();
      await audit(env2, uid, "storage.d1.delete", `line:${p.table}#${p.rowid}`);
      return { handled: true, text: `🗑 ${p.table}#${p.rowid} を削除しました（${r.meta?.changes ?? 0}行）。` };
    }
    if (p.kind === "kv") {
      const kv = p.ns === "MEDIA" ? env2.MEDIA : env2.LICENSE;
      if (!kv) return { handled: true, text: "名前空間が見つかりません。" };
      await kv.delete(p.key);
      await audit(env2, uid, "storage.kv.delete", `line:${p.ns}:${p.key}`);
      return { handled: true, text: `🗑 KV ${p.ns}:${p.key} を削除しました。` };
    }
    return { handled: true, text: "不明な削除対象です。" };
  }
  return { handled: false };
}
class LineInbound {
  id = "line";
  gw;
  ctx;
  env;
  baseUrl = "";
  secret;
  accessToken;
  constructor(gw, ctx, env2, creds) {
    this.gw = gw;
    this.ctx = ctx;
    this.env = env2;
    this.secret = creds.secret;
    this.accessToken = creds.accessToken;
  }
  async handleInbound(req, ic) {
    const body = await req.text();
    if (!await verifyLineSignature(this.secret, body, req.headers.get("x-line-signature") ?? "")) {
      return new Response("invalid signature", { status: 401 });
    }
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("bad request", { status: 400 });
    }
    this.baseUrl = new URL(req.url).origin;
    ic.waitUntil(this.process(payload.events ?? [], ic));
    return new Response("ok");
  }
  async process(events, ic) {
    for (const ev of events) {
      if (ev.type === "postback" && ev.replyToken && ev.source?.userId) {
        const out = await ic.decideApproval("line", ev.source.userId, ev.postback?.data ?? "").catch(() => null);
        if (out) await this.reply(ev.replyToken, out);
        continue;
      }
      if (ev.type !== "message" || !ev.replyToken || !ev.source?.userId) continue;
      const userId = ev.source.userId;
      await this.env.LICENSE?.put("line_last_sender", userId, { expirationTtl: 3600 })?.catch(() => {
      });
      const reply = ev.replyToken;
      const m = ev.message;
      const send = (text) => this.reply(reply, text);
      const sendQuick = (text, items) => lineReplyQuick(this.gw, this.accessToken, reply, text, items).catch((e) => this.logSendFail("reply", e));
      try {
        if (m.type === "text") {
          const text = (m.text ?? "").trim();
          const join = text.match(/^参加[\s　]+(\S+)/);
          if (join) {
            await send((await ic.link(userId, join[1].trim())).message);
            continue;
          }
          if (text === "リセット" || text === "reset") {
            await this.resetSession(userId);
            await send("会話の文脈をリセットしました。");
            continue;
          }
          const dm = await handleDataAdminCommand(this.ctx, this.env, "line", userId, text, this.baseUrl);
          if (dm.handled) {
            if (dm.menu) await sendQuick(dm.text ?? "", dm.menu);
            else await send(dm.text ?? "");
            continue;
          }
          if (await this.handleUploadText(userId, text, send)) continue;
          await this.showLoading(userId);
          await this.replyOrPush(reply, userId, this.respond(ic, userId, text));
        } else if ((m.type === "image" || m.type === "video" || m.type === "file" || m.type === "audio") && m.id) {
          const acc = await checkAccess(this.ctx, this.env, "line", userId);
          if (!acc.ok) {
            await send(acc.message);
            continue;
          }
          await this.showLoading(userId);
          const limit = await inboundFileLimitBytes(this.env).catch(() => 25 * 1024 * 1024);
          const limitMb = Math.max(1, Math.floor(limit / (1024 * 1024)));
          if (m.fileSize && m.fileSize > limit) {
            await send(`ファイルが大きすぎて受け取れません（1件あたり${limitMb}MBまで）。圧縮するか、分けてお送りください。`);
            continue;
          }
          const content = await this.fetchContent(m.id, limit);
          if (content === "too_large") {
            await send(`ファイルが大きすぎて受け取れません（1件あたり${limitMb}MBまで）。圧縮するか、分けてお送りください。`);
            continue;
          }
          if (!content) {
            await send("ファイルを取得できませんでした。もう一度お送りください。");
            continue;
          }
          const name = m.fileName ?? buildFallbackName(m.type, content.mime, "line");
          const file = new File([content.buf], name, { type: content.mime });
          const ds = await getDriveSave(this.env).catch(() => ({ enabled: false, folder: "" }));
          const saved = await saveFile(this.env, file, acc.uid, "personal", ds.enabled ? { dest: "drive", folderName: ds.folder } : void 0).catch(() => null);
          if (!saved) {
            await send(`ファイルを保存できませんでした。大きすぎる場合は圧縮・分割してお送りいただくか、担当者にご相談ください（1件あたり${limitMb}MBまで）。`);
            continue;
          }
          const { enqueueUpload, uploadAck, MENU_ITEMS, WAIT_SEC, processReadyUploads } = await import("./upload-queue_nduVK_vU.mjs");
          const q = await enqueueUpload(this.ctx, { owner: `line:${userId}`, connector: "line", role: acc.role, fileId: saved.id, name, mime: content.mime });
          const ack = uploadAck(q);
          if (ack.menu) await sendQuick(ack.text, MENU_ITEMS);
          else await send(ack.text);
          ic.waitUntil((async () => {
            await new Promise((r) => setTimeout(r, (WAIT_SEC + 2) * 1e3));
            await processReadyUploads(this.ctx, this.baseUrl).catch(() => {
            });
          })());
        }
      } catch (e) {
        const msg = e.message ?? String(e);
        const limit = looksLikeLimit(msg);
        const paid = limit ? await getWorkersPaid(this.env).catch(() => false) : false;
        await logDiag(this.env, "error", limit ? "limit" : "ai", `line inbound: ${msg}`).catch(() => void 0);
        await send(limit && !paid ? "処理が混み合い完了できませんでした。\n" + PAID_HINT : limit ? "処理が混み合い完了できませんでした。時間をおいて再度お試しください。" : "処理中にエラーが発生しました。時間をおいて再度お試しください。");
      }
    }
  }
  async respond(ic, userId, text, image) {
    return (await ic.respond({ connector: "line", sender: userId, text, image, sessionId: userId })).text;
  }
  // アップロードの選択（ボタンのタップ）／自然文の指示を処理。処理したら true（＝通常のAI応答へ回さない）。共通ロジックを使用。
  async handleUploadText(userId, text, send) {
    const { resolveUploadText } = await import("./upload-queue_nduVK_vU.mjs");
    const r = await resolveUploadText(this.ctx, `line:${userId}`, text);
    if (r.handled) await send(r.reply);
    return r.handled;
  }
  // P1-07：会話セッション（直近履歴）を破棄。inbound.ts の sessionKey と同じ規約 `chatsess:line:<userId>`。
  async resetSession(userId) {
    await this.env.LICENSE.delete(`chatsess:line:${userId}`).catch(() => void 0);
  }
  async fetchContent(messageId, limitBytes = 0) {
    const r = await this.gw.fetch("line", `https://api-data.line.me/v2/bot/message/${messageId}/content`, { headers: { authorization: `Bearer ${this.accessToken}` } });
    if (!r.ok) return null;
    const len = Number(r.headers.get("content-length") ?? 0);
    if (limitBytes && len > limitBytes) return "too_large";
    return { buf: await r.arrayBuffer(), mime: r.headers.get("content-type") ?? "application/octet-stream" };
  }
  // 遅い応答でも取りこぼさない返信戦略。respond が短時間で終われば replyToken で返し（push quota を消費しない）、
  // 時間がかかる場合は replyToken が失効する前に受付ACKを reply で返し、本応答は push で届ける。
  // WHY: LINE の replyToken は短命で、agent 応答（30〜60秒）を待ってから reply すると失効し 400→無音化していた
  //   （初回は cold start で最も遅く頻発）。空応答時の無音化は respondInbound 側の空ガードで別途封鎖する。
  async replyOrPush(replyToken, userId, work) {
    const ACK_AFTER_MS = 12e3;
    const settled = work.then((t) => ({ ok: true, t }), (e) => ({ ok: false, e }));
    let timer;
    const slow = new Promise((r2) => {
      timer = setTimeout(() => r2("slow"), ACK_AFTER_MS);
    });
    const first = await Promise.race([settled, slow]);
    if (timer) clearTimeout(timer);
    const acked = first === "slow";
    if (acked) await this.reply(replyToken, "受け付けました。ただいま処理しています。少しお待ちください。");
    const r = await settled;
    if (!r.ok) await this.logSendFail("respond", r.e);
    const text = r.ok ? r.t : "処理中にエラーが発生しました。お手数ですが、時間をおいて再度お試しください。";
    if (acked) await this.push(userId, text);
    else await this.reply(replyToken, text);
  }
  // 受信直後の「ローディング（…）」表示。1対1のみ有効・月次quota非消費・応答送信で自動解除。best-effort（失敗無視）。
  async showLoading(userId) {
    await lineLoadingStart(this.gw, this.accessToken, userId).catch((e) => this.logSendFail("loading", e));
  }
  async reply(replyToken, text) {
    await lineReply(this.gw, this.accessToken, replyToken, text).catch((e) => this.logSendFail("reply", e));
  }
  async push(userId, text) {
    await linePush(this.gw, this.accessToken, userId, text).catch((e) => this.logSendFail("push", e));
  }
  // reply/push の送信失敗（replyToken 失効・push quota 超過等）を可視化。従来は握り潰しで初回無反応の主因が観測不能だった（P0-4）。
  async logSendFail(kind, e) {
    await logDiag(this.env, "error", "line", `line ${kind} failed: ${e?.message ?? String(e)}`).catch(() => void 0);
  }
}
async function resolveInboundHandler(ctx, env2, gw, connector) {
  if (connector === "discord") {
    const appId = await getApiKey(env2, "discord_app_id");
    const publicKey = await getApiKey(env2, "discord_public_key");
    if (!appId || !publicKey) return null;
    return new DiscordInbound(gw, { appId, publicKey });
  }
  if (connector === "slack") {
    const signingSecret = await getApiKey(env2, "slack_signing_secret");
    const botToken = await getApiKey(env2, "slack_bot_token");
    if (!signingSecret || !botToken) return null;
    return new SlackInbound(gw, { signingSecret, botToken });
  }
  if (connector === "line") {
    const secret = await getApiKey(env2, "line_secret");
    const accessToken = await getApiKey(env2, "line_token");
    if (!secret || !accessToken) return null;
    return new LineInbound(gw, ctx, env2, { secret, accessToken });
  }
  return null;
}
const prerender = false;
const POST = async ({ request, params, locals }) => {
  const connector = params.connector ?? "";
  const gw = cfEgressGateway(env);
  const handler = await resolveInboundHandler(locals.ctx, env, gw, connector);
  if (!handler) return new Response("connector not configured", { status: 404 });
  const origin = new URL(request.url).origin;
  return handler.handleInbound(request, {
    baseUrl: origin,
    waitUntil: (p) => locals.cfContext.waitUntil(p),
    respond: (msg) => respondInbound(locals.ctx, env, origin, msg),
    link: (externalId, code, name) => joinViaInvite(env, connector, externalId, code, name),
    decideApproval: (conn, externalId, data) => decideApprovalFromChat(locals.ctx, env, conn, externalId, data, origin)
  });
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
