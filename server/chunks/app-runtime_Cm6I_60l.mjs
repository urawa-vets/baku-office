globalThis.process ??= {};
globalThis.process.env ??= {};
import { validateDefinition, appApprovalEffects, roleCanOpenScreen, isBlockedHost } from "./appdef_CcEaLpHH.mjs";
import { a as scopeCtx } from "./parts_CYwgYHWx.mjs";
import { g as getAppDesign, a as activeAppDefinition, r as roleCanUseApp } from "./external-apps_CoOdU2nO.mjs";
import { i as isGoogleOp, a as GOOGLE_OPS, r as runGoogleOp } from "./google-bridge_CxaeMFe4.mjs";
import { googleStatus, SCOPE_GROUPS } from "./google_Wg8wFnLQ.mjs";
import { entitlementForGate } from "./client_DbLECgB2.mjs";
import "./stripe_r-RFTlbb.mjs";
import { a as atLeast } from "./types_BVJxqWI9.mjs";
import { APP, AppError } from "./errors_Cz86HmdL.mjs";
import { i as isRunnableDefinition } from "./preflight_BvECTwHY.mjs";
import { enqueueReport } from "./reports_D2gzdfLq.mjs";
import { logDiag } from "./diag_CsI0yNfw.mjs";
const TOOL_SCOPE = {
  // カレンダー
  list_events: "calendar",
  create_event: "calendar",
  update_event: "calendar",
  delete_event: "calendar",
  // Gmail（読取・送信・整理で分割）
  list_messages: "gmail_read",
  search_messages: "gmail_read",
  get_message: "gmail_read",
  get_attachment: "gmail_read",
  send_message: "gmail_send",
  trash_message: "gmail_modify",
  archive_message: "gmail_modify",
  mark_message_read: "gmail_modify",
  set_message_labels: "gmail_modify",
  // Meet
  list_conference_records: "meet",
  get_transcript: "meet",
  summarize_meeting: "meet",
  // スプレッドシート
  read_spreadsheet: "sheets",
  append_spreadsheet: "sheets",
  update_spreadsheet: "sheets",
  create_spreadsheet: "sheets",
  delete_sheet_rows: "sheets",
  delete_sheet_tab: "sheets",
  // ドキュメント
  read_document: "docs",
  create_document: "docs",
  append_document: "docs",
  delete_document_range: "docs",
  // スライド
  read_presentation: "slides",
  create_presentation: "slides",
  add_slide: "slides",
  delete_slide: "slides",
  // フォーム
  read_form: "forms",
  list_form_responses: "forms",
  create_form: "forms",
  add_form_question: "forms",
  delete_form_question: "forms",
  // 連絡先
  search_contacts: "contacts",
  create_contact: "contacts",
  update_contact: "contacts",
  delete_contact: "contacts",
  // ToDo
  list_tasks: "tasks",
  add_task: "tasks",
  complete_task: "tasks",
  delete_task: "tasks",
  // ドライブ操作（検索・削除=ゴミ箱・移動・リネーム）。full drive スコープ。
  search_drive_files: "drive",
  delete_drive_file: "drive",
  rename_drive_file: "drive",
  move_drive_file: "drive"
};
async function googleToolPreflight(env, toolName, baseUrl, role) {
  const need = TOOL_SCOPE[toolName];
  if (!need) return null;
  const status = await googleStatus(env).catch(() => null);
  if (!status) return null;
  const label = SCOPE_GROUPS[need].label;
  const setup = baseUrl ? `${baseUrl}/settings/google-setup` : "/settings/google-setup";
  const askAdmin = `管理者に「${label}」の Google 連携（権限追加）をご依頼ください。`;
  if (!status.connected) {
    return role === "admin" ? `この操作には Google 連携（${label}）が必要です。${setup} で連携してください。` : `この操作には Google 連携（${label}）が必要です。${askAdmin}`;
  }
  if (status.mode === "sa") {
    if (status.groups.length === 0 || status.groups.includes(need)) return null;
    return role === "admin" ? `Google は連携済みですが「${label}」の委任スコープが未設定の可能性があります。${setup} で「${label}」を含めて委任設定をやり直してください。` : `Google は連携済みですが「${label}」の権限が未設定の可能性があります。${askAdmin}`;
  }
  if (status.groups.includes(need)) return null;
  const deepLink = baseUrl ? `${baseUrl}/api/google/start?groups=${need}` : `/api/google/start?groups=${need}`;
  return role === "admin" ? `Google は連携済みですが「${label}」の利用に同意していません。${deepLink} を開いて同意すると使えるようになります（設定 → Google連携からも追加できます）。` : `Google は連携済みですが「${label}」の利用に同意していません。${askAdmin}`;
}
function stepsOfScreen(def, screenId) {
  if (Array.isArray(def.screens) && def.screens.length > 0) {
    const sc = screenId !== void 0 && screenId !== "" ? def.screens.find((s) => s.id === screenId) : def.screens[0];
    return Array.isArray(sc?.steps) ? sc.steps : [];
  }
  return Array.isArray(def.steps) ? def.steps : [];
}
async function googleAppPreflight(ctx, def, screenId, role, baseUrl) {
  const ops = stepsOfScreen(def, screenId).map((s) => s.op).filter((op) => isGoogleOp(op));
  if (!ops.length) return null;
  const env = ctx.env;
  const setup = "/settings/google-setup";
  const ent = await entitlementForGate(env).catch(() => "free");
  for (const op of ops) {
    const need = GOOGLE_OPS[op].plan;
    if (!atLeast(ent, need)) return `この操作には「${need === "pro" ? "Pro" : "Plus"} 以上」のプランが必要です（Google連携の${GOOGLE_OPS[op].effect === "read" ? "読み取り" : "書き込み"}）。設定 → プラン/契約 をご確認ください。`;
  }
  const status = await googleStatus(env).catch(() => null);
  if (!status) return null;
  const groups = new Set(ops.map((op) => GOOGLE_OPS[op].group));
  for (const need of groups) {
    const label = SCOPE_GROUPS[need].label;
    const askAdmin = `管理者に「${label}」の Google 連携（権限追加）をご依頼ください。`;
    if (!status.connected) return role === "admin" ? `この操作には Google 連携（${label}）が必要です。${setup} で連携してください。` : `この操作には Google 連携（${label}）が必要です。${askAdmin}`;
    if (status.mode === "sa") {
      if (status.groups.length === 0 || status.groups.includes(need)) continue;
      return role === "admin" ? `Google は連携済みですが「${label}」の委任スコープが未設定の可能性があります。${setup} で委任設定をやり直してください。` : `Google は連携済みですが「${label}」の権限が未設定の可能性があります。${askAdmin}`;
    }
    if (status.groups.includes(need)) continue;
    const deepLink = `/api/google/start?groups=${need}`;
    return role === "admin" ? `Google は連携済みですが「${label}」の利用に同意していません。${deepLink} を開いて同意すると使えます。` : `Google は連携済みですが「${label}」の利用に同意していません。${askAdmin}`;
  }
  return null;
}
function platformInvariantSuspected(def, code) {
  if (code !== APP.SCREEN_MISSING && code !== APP.DEFINITION_INVALID) return false;
  try {
    return validateDefinition(def).ok && isRunnableDefinition(def);
  } catch {
    return false;
  }
}
async function escalatePlatformInvariant(ctx, info) {
  try {
    const key = info.appId ?? info.defId ?? "unknown";
    const fingerprint = `platform-invariant-${info.code}-${key}`;
    const dup = await ctx.db.first("SELECT id FROM client_report_outbox WHERE fingerprint=? AND sent=0 LIMIT 1", [fingerprint]).catch(() => null);
    if (dup) return;
    const meaning = info.code === APP.SCREEN_MISSING ? "実行できる画面定義がない" : "定義が検証不合格";
    const message = `アプリ定義は検証(validateDefinition)・実行可能判定(isRunnableDefinition)を通過しているのに、実行時に ${info.code}（${meaning}）が返りました。アプリ定義側を修正しても解消しない＝プラットフォーム（チェッカ/ランタイム）側の不整合の可能性が高いです。`;
    await enqueueReport(ctx.env, {
      kind: "error",
      severity: "error",
      category: "platform",
      title: `プラットフォーム起因疑い: ${info.code}（検証OKの定義が実行不可）`,
      message,
      context: `where=${info.where} app=${info.appId ?? "-"} def=${info.defId ?? "-"}`,
      fingerprint
    });
    await logDiag(ctx.env, "error", "platform", `invariant ${info.code} on valid definition`, `where=${info.where} app=${info.appId ?? "-"}`).catch(() => {
    });
  } catch {
  }
}
async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function canonicalize(v) {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = canonicalize(v[k]);
    return out;
  }
  return v;
}
async function appIntegrityHashes(def) {
  const defHash = await sha256hex(JSON.stringify(canonicalize(def)));
  const permsHash = await sha256hex(JSON.stringify([...def.permissions ?? []].sort()));
  return { defHash, permsHash };
}
const MAX_STEPS = 50;
const isFileRef = (v) => typeof v === "object" && v !== null && v.__file === true;
async function runApp(ctx, def, inputs, owner, screenId, appId, opts) {
  let screen = null;
  if (Array.isArray(def.screens) && def.screens.length > 0) {
    if (screenId !== void 0 && screenId !== "") {
      const found = def.screens.find((s) => s.id === screenId);
      if (!found) return { ok: false, error: "指定された画面が見つかりません。", code: APP.SCREEN_MISSING };
      screen = found;
    } else {
      screen = def.screens[0];
    }
  }
  if (!opts?.dryRun && screen?.requiredRoles?.length && !roleCanOpenScreen(opts?.role, screen.requiredRoles)) {
    return { ok: false, error: "この画面を操作する権限がありません。", code: APP.FORBIDDEN };
  }
  const defInputs = screen?.inputs ?? def.inputs ?? [];
  const defSteps = screen?.steps ?? def.steps ?? [];
  const defOutput = screen?.output ?? def.output;
  if (!Array.isArray(defSteps) || defSteps.length === 0 || !defOutput) return { ok: false, error: "実行できる画面定義がありません。", code: APP.SCREEN_MISSING };
  if (defSteps.length > MAX_STEPS) return { ok: false, error: `処理ステップが多すぎます（上限 ${MAX_STEPS}）。`, code: APP.STEP_LIMIT };
  const bind = {};
  bind._owner = owner;
  bind._app_id = appId ?? def.id;
  for (const inp of defInputs) {
    const v = inputs[inp.name];
    if ((inp.type === "file" || inp.type === "signature") && v && typeof v === "object" && "id" in v) {
      const f = v;
      bind[inp.name] = { __file: true, id: f.id, mime: f.mime, name: f.name };
    } else bind[inp.name] = v ?? inp.default ?? "";
  }
  const ref = (r) => typeof r === "string" && r.startsWith("$") ? bind[r.slice(1)] : r;
  const interp = (tpl) => tpl.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_m, k) => {
    const v = bind[k];
    return isFileRef(v) ? v.name ?? v.id : v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  });
  const asText = (v) => v == null ? "" : isFileRef(v) ? v.name ?? v.id : typeof v === "object" ? JSON.stringify(v) : String(v);
  try {
    for (const s of defSteps) {
      const out = await runStep(ctx, def, s, { ref, interp, asText, bind, owner, dryRun: !!opts?.dryRun, role: opts?.role });
      if (s.as) bind[s.as] = out;
    }
    const o = defOutput;
    const val = ref(o.from);
    if (o.type === "file") {
      if (!isFileRef(val)) return { ok: false, error: "出力ファイルが生成されませんでした。", code: APP.RUN_FAILED };
      return { ok: true, output: { type: "file", value: val.id } };
    }
    if (o.type === "table") return { ok: true, output: { type: "table", value: Array.isArray(val) ? JSON.stringify(val) : asText(val) } };
    if (o.type === "chart") return { ok: true, output: { type: "chart", value: Array.isArray(val) ? JSON.stringify(val) : asText(val), chart: o.chart ?? "bar" } };
    return { ok: true, output: { type: "text", value: asText(val) } };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.userMessage, code: e.code };
    return { ok: false, error: e instanceof Error ? e.message : String(e), code: APP.RUN_FAILED };
  }
}
async function runInstalledApp(ctx, appId, inputs, owner, screenId, role) {
  const app = await activeAppDefinition(ctx, appId);
  if (!app || !app.definition) return { ok: false, error: "アプリが見つかりません。", code: APP.NOT_FOUND };
  if (role && !roleCanUseApp(role, app.allowed_roles)) return { ok: false, error: "このアプリを利用する権限がありません。", code: APP.NOT_FOUND };
  const def = app.definition;
  if (!validateDefinition(def).ok) return { ok: false, error: "アプリ定義が不正なため実行できません。", code: APP.DEFINITION_INVALID };
  const gpre = await googleAppPreflight(ctx, def, screenId, role);
  if (gpre) return { ok: false, error: gpre, code: APP.FORBIDDEN };
  const res = await runApp(scopeCtx(ctx, def.permissions), def, inputs, owner, screenId, appId, { role });
  if (!res.ok && platformInvariantSuspected(def, res.code)) await escalatePlatformInvariant(ctx, { code: res.code, where: "runtime", appId, defId: def.id });
  return res;
}
async function runDraftApp(ctx, draftId, inputs, owner, screenId, opts) {
  const d = await getAppDesign(ctx, draftId);
  if (!d || d.source !== "draft" || !d.definition) return { ok: false, error: "生成アプリが見つかりません。", code: APP.NOT_FOUND };
  const def = d.definition;
  if (!validateDefinition(def).ok) return { ok: false, error: "アプリ定義が不正なため実行できません。", code: APP.DEFINITION_INVALID };
  if (!opts?.dryRun) {
    const gpre = await googleAppPreflight(ctx, def, screenId, opts?.role);
    if (gpre) return { ok: false, error: gpre, code: APP.FORBIDDEN };
  }
  return runApp(scopeCtx(ctx, def.permissions), def, inputs, owner, screenId, `preview:${draftId}`, opts);
}
async function authorizeAppRun(ctx, appId, screenId, role) {
  const app = await activeAppDefinition(ctx, appId);
  if (!app || !app.definition) return { ok: false, error: "アプリが見つかりません。", code: APP.NOT_FOUND };
  if (role && !roleCanUseApp(role, app.allowed_roles)) return { ok: false, error: "このアプリを利用する権限がありません。", code: APP.NOT_FOUND };
  const def = app.definition;
  const authz = await authorizeDefinition(def, screenId, role);
  if (!authz.ok) return authz;
  const { defHash, permsHash } = await appIntegrityHashes(def);
  return { ok: true, appVersion: app.version, defHash, permsHash };
}
async function authorizeDraftRun(ctx, draftId, screenId, role) {
  const d = await getAppDesign(ctx, draftId);
  if (!d || d.source !== "draft" || !d.definition) return { ok: false, error: "生成アプリが見つかりません。", code: APP.NOT_FOUND };
  const def = d.definition;
  const authz = await authorizeDefinition(def, screenId, role);
  if (!authz.ok) return authz;
  const { defHash, permsHash } = await appIntegrityHashes(def);
  return { ok: true, appVersion: "", defHash, permsHash };
}
async function authorizeDefinition(def, screenId, role) {
  if (!validateDefinition(def).ok) return { ok: false, error: "アプリ定義が不正なため実行できません。", code: APP.DEFINITION_INVALID };
  let screen = null;
  if (Array.isArray(def.screens) && def.screens.length > 0) {
    if (screenId !== void 0 && screenId !== "") {
      const found = def.screens.find((s) => s.id === screenId);
      if (!found) return { ok: false, error: "指定された画面が見つかりません。", code: APP.SCREEN_MISSING };
      screen = found;
    } else screen = def.screens[0];
  }
  if (screen?.requiredRoles?.length && !roleCanOpenScreen(role, screen.requiredRoles)) {
    return { ok: false, error: "この画面を操作する権限がありません。", code: APP.FORBIDDEN };
  }
  const steps = screen?.steps ?? def.steps ?? [];
  for (const s of steps) {
    if (s.op === "record.status" && s.requiredRoles?.length && !roleCanOpenScreen(role, s.requiredRoles)) {
      return { ok: false, error: "この承認操作を実行する権限がありません。", code: APP.FORBIDDEN };
    }
  }
  return { ok: true };
}
async function verifyApprovalIntegrity(ctx, subjectType, subjectId, defHash, permsHash) {
  let def = null;
  if (subjectType === "installed") {
    const app = await activeAppDefinition(ctx, subjectId);
    def = app?.definition ?? null;
  } else {
    const d = await getAppDesign(ctx, subjectId);
    if (d && d.source === "draft") def = d.definition ?? null;
  }
  if (!def) return { ok: false, error: "承認対象の定義が見つからないため実行できません。再申請してください。" };
  const cur = await appIntegrityHashes(def);
  if (cur.defHash !== defHash || cur.permsHash !== permsHash) {
    return { ok: false, error: "申請後にアプリ定義または権限が変更されました。内容が変わっている可能性があるため、お手数ですが再申請してください。" };
  }
  return { ok: true };
}
async function appRunNeedsApproval(ctx, appId, screenId, approvalOn, inputs) {
  const app = await activeAppDefinition(ctx, appId);
  if (!app || !app.definition) return null;
  return approvalNeedFor(app.definition, screenId, approvalOn, inputs);
}
async function draftRunNeedsApproval(ctx, draftId, screenId, approvalOn, inputs) {
  const d = await getAppDesign(ctx, draftId);
  if (!d || d.source !== "draft" || !d.definition) return null;
  return approvalNeedFor(d.definition, screenId, approvalOn, inputs);
}
function approvalNeedFor(def, screenId, approvalOn, inputs) {
  const eff = appApprovalEffects(def, screenId);
  if (!eff.external && !(eff.irreversible && approvalOn)) return null;
  const reason = eff.external ? "外部への送信を含む操作" : "取り消せない操作";
  const hosts = eff.hosts.map((v) => resolvePreviewRef(v, inputs));
  const emailTo = eff.emailTo.map((v) => resolvePreviewRef(v, inputs));
  const inputLines = inputs ? Object.entries(inputs).filter(([, v]) => v != null && v !== "" && typeof v !== "object").slice(0, 8).map(([k, v]) => `・${k}：${String(v).slice(0, 120)}`) : [];
  const lines = [
    `アプリ：${def.name}`,
    screenId ? `画面：${screenId}` : null,
    `操作：${eff.ops.join("・") || reason}`,
    hosts.length ? `送信先ホスト：${hosts.join("・")}` : null,
    emailTo.length ? `メール宛先：${emailTo.join("・")}` : null,
    inputLines.length ? `入力内容：
${inputLines.join("\n")}` : null
  ].filter(Boolean);
  return { preview: lines.join("\n"), reason };
}
function resolvePreviewRef(v, inputs) {
  if (!inputs) return v;
  if (v.startsWith("$")) {
    const r = inputs[v.slice(1)];
    return r == null || typeof r === "object" ? v : String(r);
  }
  return v.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_m, k) => {
    const r = inputs[k];
    return r == null || typeof r === "object" ? `{{${k}}}` : String(r);
  });
}
function maskAddr(v) {
  const s = (v ?? "").trim();
  if (!s) return "(none)";
  const at = s.indexOf("@");
  if (at > 0) return `${s[0]}***@${s.slice(at + 1)}`;
  return s.length <= 4 ? `${s[0] ?? ""}***` : `${s.slice(0, 4)}***`;
}
async function audit(ctx, h, op, detail) {
  try {
    await ctx.db.run(
      "INSERT INTO app_audit_log (id,app_id,owner,op,detail,created_at) VALUES (lower(hex(randomblob(8))),?,?,?,?,strftime('%s','now'))",
      [h.bind._app_id, h.owner, op, detail]
    );
  } catch {
  }
}
function resolveGoogleArg(h, v) {
  if (typeof v === "string") return v.startsWith("$") ? h.ref(v) : h.interp(v);
  if (Array.isArray(v)) return v.map((x) => resolveGoogleArg(h, x));
  return v;
}
async function runGoogleStep(ctx, def, s, h) {
  const op = s.op;
  const meta = GOOGLE_OPS[op];
  if (!def.permissions.includes(meta.perm)) throw new Error(`${op} には「${meta.perm}」権限の宣言が必要です。`);
  const raw = s.google ?? {};
  const args = {};
  for (const [k, v] of Object.entries(raw)) args[k] = resolveGoogleArg(h, v);
  const out = await runGoogleOp(ctx.google, op, args, h.dryRun);
  const target = typeof args.id === "string" ? `id=${args.id}` : typeof args.eventId === "string" ? `event=${args.eventId}` : typeof args.to === "string" ? `to=${maskAddr(args.to)}` : "";
  await audit(ctx, h, op, target);
  return out;
}
async function runStep(ctx, def, s, h) {
  if (isGoogleOp(s.op)) return runGoogleStep(ctx, def, s, h);
  switch (s.op) {
    case "ai.infer": {
      const attachments = [];
      for (const a of s.attach ?? []) {
        const v = h.ref(a);
        if (isFileRef(v) && v.id && await ctx.storage.ownsFile(v.id, h.owner)) {
          const f = await ctx.storage.getFile(v.id);
          if (f) attachments.push({ mime: f.mime, buf: f.buf, name: f.name });
        }
      }
      const concise = "あなたはアプリの処理エンジンです。前置き・解説・相づち・余計な補足を一切付けず、求められた結果だけを簡潔に出力してください。\n\n";
      return ctx.ai.infer(concise + h.interp(s.prompt ?? ""), { attachments, maxTokens: 8e3 });
    }
    case "transform": {
      if (typeof s.template === "string") return h.interp(s.template);
      let cur = h.ref(s.from);
      if (typeof cur === "string") {
        try {
          cur = JSON.parse(cur);
        } catch {
        }
      }
      for (const key of (s.path ?? "").split(".").filter(Boolean)) cur = cur == null ? void 0 : cur[key];
      return h.asText(cur);
    }
    case "file.save": {
      const content = h.asText(h.ref(s.from));
      if (h.dryRun) return { __file: true, id: "dryrun", mime: s.mime, name: s.filename ?? "output.txt" };
      const file = new File([content], s.filename ?? "output.txt", { type: s.mime ?? "text/plain" });
      const saved = await ctx.storage.saveFile(file, h.owner);
      return { __file: true, id: saved.id, mime: s.mime, name: s.filename };
    }
    case "file.read": {
      const v = h.ref(s.fileId);
      const id = isFileRef(v) ? v.id : String(v);
      if (!id || !await ctx.storage.ownsFile(id, h.owner)) return "";
      const f = await ctx.storage.getFile(id);
      return f ? new TextDecoder().decode(f.buf) : "";
    }
    case "db.query": {
      const rows = await ctx.db.all(String(s.sql), (s.params ?? []).map(h.ref));
      return rows;
    }
    case "db.write": {
      const params = (s.params ?? []).map(h.ref);
      if (h.dryRun) return { rowsWritten: 0 };
      const r = await ctx.db.run(String(s.sql), params);
      await audit(ctx, h, "db.write", (String(s.sql).match(/^\s*(\w+(?:\s+(?:into|from|table))?\s+\w+)/i)?.[1] ?? "write").slice(0, 80));
      return { rowsWritten: r.rowsWritten };
    }
    case "db.delete": {
      const id = h.asText(h.ref(s.from)).trim();
      if (!id) throw new Error("削除対象の id がありません。");
      if (h.dryRun) return { deleted: 0 };
      const appId = h.bind._app_id;
      const r = await ctx.db.run(
        "DELETE FROM app_records WHERE app_id=? AND id=? AND owner=?",
        [appId, id, h.owner]
      );
      await audit(ctx, h, "db.delete", `id=${id}`);
      return { deleted: r.rowsWritten };
    }
    case "data.list":
    case "data.get":
    case "data.create":
    case "data.update":
    case "data.remove":
      return runDataOp(ctx, def, s, h);
    case "record.status": {
      if (!h.dryRun && s.requiredRoles?.length && !roleCanOpenScreen(h.role, s.requiredRoles)) {
        throw new AppError(APP.FORBIDDEN, "この承認操作を実行する権限がありません。", 403);
      }
      const id = h.asText(h.ref(s.from)).trim();
      if (!id) throw new Error("対象の id がありません。");
      if (h.dryRun) return { updated: 0, status: s.to };
      const to = String(s.to ?? "").slice(0, 40);
      const crossUser = !!s.requiredRoles?.length;
      const where = ["app_id=?", "id=?"];
      const wp = [h.bind._app_id, id];
      if (!crossUser) {
        where.push("owner=?");
        wp.push(h.owner);
      }
      if (s.fromStatus !== void 0) {
        where.push("status=?");
        wp.push(String(s.fromStatus).slice(0, 40));
      }
      const r = await ctx.db.run(`UPDATE app_records SET status=? WHERE ${where.join(" AND ")}`, [to, ...wp]);
      if (s.fromStatus !== void 0 && r.rowsWritten === 0) {
        throw new AppError(APP.FORBIDDEN, `この状態遷移は許可されていません（${s.fromStatus}→${to} のみ可能です）。`, 409);
      }
      await audit(ctx, h, "record.status", `id=${id}→${to}`);
      return { updated: r.rowsWritten, status: s.to };
    }
    case "knowledge.search": {
      const query = h.asText(h.ref(s.from));
      const hits = await ctx.knowledge.search(query, 5);
      if (!hits.length) return "（該当する組織ナレッジは見つかりませんでした）";
      return hits.map((r) => `■ ${r.title}
${(r.body ?? "").slice(0, 600)}`).join("\n\n");
    }
    case "notify": {
      const message = h.interp(s.message ?? "");
      const to = s.to ? h.asText(h.ref(s.to)) : "";
      if (h.dryRun) return s.channel === "email" ? "（動作確認：メール送信はスキップ）" : "（動作確認：通知はスキップ）";
      if (s.channel === "email") {
        const r = await ctx.notify.email(to, h.interp(s.subject ?? ""), message);
        await audit(ctx, h, "notify.email", `to=${maskAddr(to)} ${r.ok ? "ok" : "ng"}`);
        return r.ok ? "メールを送信しました。" : r.error ?? "メール送信に失敗しました。";
      }
      const dest = to || h.owner;
      await ctx.notify.inapp(dest, message);
      await audit(ctx, h, "notify.inapp", `to=${maskAddr(dest)}`);
      return "通知しました。";
    }
    case "message.send": {
      const channelId = String(s.channel ?? "").trim();
      const rawMsg = String(s.message ?? "");
      const text = rawMsg.startsWith("$") ? h.asText(h.ref(rawMsg)) : h.interp(rawMsg);
      if (!channelId) throw new Error("message.send には channel（送信先チャンネル）が必要です。");
      if (h.dryRun) return "（動作確認：メッセージ送信はスキップ）";
      const r = await ctx.messaging.sendToChannel(channelId, { text });
      await audit(ctx, h, "message.send", `channel=${channelId} ${r.ok ? "ok" : "ng"}`);
      return r.ok ? "メッセージを送信しました。" : r.error ?? "メッセージ送信に失敗しました。";
    }
    case "http.fetch": {
      if (!def.permissions.includes("net")) throw new Error("http.fetch には net 権限が必要です。");
      const url = h.interp(s.url ?? "");
      let host;
      try {
        host = new URL(url).host;
      } catch {
        throw new Error("URL が不正です。");
      }
      if (!(def.allowHosts ?? []).includes(host)) throw new Error(`送信先 ${host} は allowHosts に未登録です。`);
      if (isBlockedHost(host)) throw new Error(`内部/ローカルのホストへは送信できません：${host}`);
      if (h.dryRun) return "（動作確認：外部リクエストはスキップ）";
      const method = s.method ?? "GET";
      try {
        const r = await ctx.egress.fetch({
          appId: String(h.bind._app_id),
          owner: h.owner,
          url,
          method,
          ...s.body ? { body: h.interp(s.body) } : {},
          allowHosts: def.allowHosts ?? []
        });
        await audit(ctx, h, "http.fetch", `${method} ${host} → ${r.status}`);
        return r.text.slice(0, 2e5);
      } catch (e) {
        await audit(ctx, h, "http.fetch", `${method} ${host} → error`);
        throw e;
      }
    }
    default:
      throw new Error(`未対応の op: ${s.op}`);
  }
}
async function runDataOp(ctx, def, s, h) {
  const appId = h.bind._app_id;
  const ownerScoped = (def.dataScope ?? "personal") === "personal";
  const coll = s.collection ?? null;
  const scope = () => {
    const parts = ["app_id=?"];
    const params = [appId];
    parts.push(coll === null ? "collection IS NULL" : "collection=?");
    if (coll !== null) params.push(coll);
    if (ownerScoped) {
      parts.push("owner=?");
      params.push(h.owner);
    }
    return { sql: parts.join(" AND "), params };
  };
  switch (s.op) {
    case "data.create": {
      const body = h.asText(h.ref(s.from));
      const status = s.status !== void 0 ? String(s.status).slice(0, 40) : null;
      if (h.dryRun) return { id: "dryrun" };
      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      await ctx.db.run(
        "INSERT INTO app_records (id,app_id,owner,collection,data,status,created_at) VALUES (?,?,?,?,?,?,strftime('%s','now'))",
        [id, appId, h.owner, coll, body, status]
      );
      await audit(ctx, h, "data.create", coll ? `collection=${coll}` : "create");
      return { id };
    }
    case "data.list": {
      const limit = Math.min(Math.max(Number(s.limit) || 100, 1), 500);
      const w = scope();
      let sql = `SELECT id,data,status,created_at FROM app_records WHERE ${w.sql}`;
      const params = [...w.params];
      if (s.status !== void 0) {
        sql += " AND status=?";
        params.push(String(s.status).slice(0, 40));
      }
      sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
      return ctx.db.all(sql, params);
    }
    case "data.get": {
      const id = h.asText(h.ref(s.recordId)).trim();
      if (!id) throw new Error("対象の id がありません。");
      const w = scope();
      return ctx.db.first(`SELECT id,data,status,created_at FROM app_records WHERE ${w.sql} AND id=?`, [...w.params, id]);
    }
    case "data.update": {
      const id = h.asText(h.ref(s.recordId)).trim();
      if (!id) throw new Error("更新対象の id がありません。");
      const body = h.asText(h.ref(s.from));
      if (h.dryRun) return { updated: 0 };
      const w = scope();
      const sets = ["data=?"];
      const setParams = [body];
      if (s.status !== void 0) {
        sets.push("status=?");
        setParams.push(String(s.status).slice(0, 40));
      }
      const r = await ctx.db.run(`UPDATE app_records SET ${sets.join(",")} WHERE ${w.sql} AND id=?`, [...setParams, ...w.params, id]);
      await audit(ctx, h, "data.update", `id=${id}`);
      return { updated: r.rowsWritten };
    }
    case "data.remove": {
      const id = h.asText(h.ref(s.recordId)).trim();
      if (!id) throw new Error("削除対象の id がありません。");
      if (h.dryRun) return { deleted: 0 };
      const w = scope();
      const r = await ctx.db.run(`DELETE FROM app_records WHERE ${w.sql} AND id=?`, [...w.params, id]);
      await audit(ctx, h, "data.remove", `id=${id}`);
      return { deleted: r.rowsWritten };
    }
    default:
      throw new Error(`未対応の data op: ${s.op}`);
  }
}
export {
  runInstalledApp as a,
  authorizeAppRun as b,
  authorizeDraftRun as c,
  draftRunNeedsApproval as d,
  escalatePlatformInvariant as e,
  appRunNeedsApproval as f,
  runApp as g,
  googleToolPreflight as h,
  platformInvariantSuspected as p,
  runDraftApp as r,
  verifyApprovalIntegrity as v
};
