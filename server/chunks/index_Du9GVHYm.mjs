globalThis.process ??= {};
globalThis.process.env ??= {};
import { b as registerPart } from "./parts_CYwgYHWx.mjs";
import { r as randomId } from "./stripe_r-RFTlbb.mjs";
import { n as nowSec } from "./accounting_D4tRmfws.mjs";
import { b as setReminder, c as remindersPart, i as invoicesPart } from "./invoices_Cm4Zc-nT.mjs";
import { a as saveKnowledge, k as knowledgePart } from "./knowledge_XqYblUMu.mjs";
import { r as runGoogleOp, e as extractGoogleId } from "./google-bridge_CxaeMFe4.mjs";
import { calendarPart } from "./calendar_Djyklg7w.mjs";
import "./google_Wg8wFnLQ.mjs";
import { g as googleApiError } from "./google-err_DkenUeeQ.mjs";
const chatApp = {
  id: "chat",
  name: "AIチャット",
  icon: "💬",
  version: "1.0.0",
  category: "core",
  description: "AIと対話して操作・他アプリ呼び出し・各種設定/開発を行うハブ（Plus以上で必須）。",
  permissions: ["ai", "agent", "db:read"],
  menu: [{ href: "/", label: "AIチャット" }]
};
async function recordExpense(ctx, owner, a) {
  await ctx.db.run(
    "INSERT INTO personal_items (id,owner_user_id,type,title,amount,date,share_scope,review_status,created_at) VALUES (?,?,?,?,?,?,'personal','none',?)",
    [randomId(), owner, "receipt", a.title, Math.round(a.amount), a.date ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), nowSec()]
  );
  return `領収書を記録：${a.title} ¥${Math.round(a.amount).toLocaleString("ja-JP")}（個人→組織へ共有で会計申請）`;
}
async function listExpenses(ctx, owner) {
  const results = await ctx.db.all("SELECT title,amount FROM personal_items WHERE owner_user_id=? AND type='receipt' ORDER BY created_at DESC LIMIT 10", [owner]);
  if (!results.length) return "領収書の記録はありません。";
  return results.map((r) => `・${r.title} ¥${(r.amount ?? 0).toLocaleString("ja-JP")}`).join("\n");
}
const accountingPart = {
  id: "accounting",
  name: "お金の記録",
  icon: "💰",
  version: "1.0.0",
  category: "会計",
  description: "支出/領収書の記録と一覧。",
  permissions: ["db:read", "db:write"],
  menu: [{ href: "/accounting", label: "お金の記録" }],
  widgets: [
    { id: "tx_count", title: "取引数", run: async (ctx) => {
      const r = await ctx.db.first("SELECT count(*) AS n FROM transactions WHERE deleted_at IS NULL").catch(() => null);
      return { value: String(r?.n ?? 0) + " 件", sub: "会計取引" };
    } }
  ],
  agentTools: [
    {
      name: "record_expense",
      description: "支出/領収書を記録",
      parameters: { type: "object", properties: { amount: { type: "number" }, title: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" } }, required: ["amount", "title"] },
      run: (ctx, owner, _baseUrl, a) => recordExpense(ctx, owner, { amount: Number(a.amount), title: String(a.title), date: a.date ? String(a.date) : void 0 })
    },
    {
      name: "list_expenses",
      description: "記録した領収書一覧",
      parameters: { type: "object", properties: {} },
      run: (ctx, owner) => listExpenses(ctx, owner)
    }
  ]
};
async function saveMemo(ctx, owner, a) {
  await ctx.db.run(
    "INSERT INTO personal_items (id,owner_user_id,type,title,body,share_scope,review_status,created_at) VALUES (?,?,?,?,?,'personal','none',?)",
    [randomId(), owner, "memo", a.title, a.body ?? null, nowSec()]
  );
  return `メモを保存：${a.title}`;
}
async function submitReceipt(ctx, owner, a) {
  const amount = a.amount != null && Number.isFinite(a.amount) && a.amount > 0 ? Math.round(a.amount) : null;
  await ctx.db.run(
    "INSERT INTO personal_items (id,owner_user_id,type,title,body,amount,date,share_scope,review_status,created_at) VALUES (?,?,?,?,?,?,?,'org','pending',?)",
    [randomId(), owner, "receipt", a.title, a.body ?? null, amount, a.date ?? null, nowSec()]
  );
  return `領収書「${a.title}」${amount != null ? `（¥${amount.toLocaleString("ja-JP")}）` : ""}を申請しました（組織の承認待ち）。承認の状況は「個人の作業領域」、管理者は承認画面で確認できます。`;
}
const memoPart = {
  id: "memo",
  name: "メモ",
  icon: "📝",
  version: "1.0.0",
  category: "庶務",
  description: "メモの保存（組織・個人）。",
  permissions: ["db:write"],
  menu: [{ href: "/personal", label: "メモ" }],
  agentTools: [
    {
      name: "save_memo",
      description: "メモを保存",
      parameters: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title"] },
      run: (ctx, owner, _baseUrl, a) => saveMemo(ctx, owner, { title: String(a.title), body: a.body ? String(a.body) : void 0 })
    },
    {
      name: "submit_receipt",
      description: "領収書（経費精算）を作成し、そのまま組織へ申請（承認待ち）にする。『領収書を申請して』に対応。title必須、amount(円)・date(YYYY-MM-DD)・memoは任意。",
      parameters: { type: "object", properties: { title: { type: "string", description: "領収書の内容・宛名など" }, amount: { type: "number", description: "金額（円）" }, date: { type: "string", description: "日付 YYYY-MM-DD" }, body: { type: "string", description: "メモ・補足" } }, required: ["title"] },
      run: (ctx, owner, _baseUrl, a) => submitReceipt(ctx, owner, { title: String(a.title), amount: a.amount != null ? Number(a.amount) : void 0, date: a.date ? String(a.date) : void 0, body: a.body ? String(a.body) : void 0 })
    }
  ]
};
async function searchMembers(ctx, a) {
  const members = await ctx.identity.listMemberNames();
  const out = members.filter((m) => !a.query || m.name.includes(a.query)).map((m) => `・${m.name || "(無名)"}（${m.role}）`);
  return out.length ? out.join("\n") : "該当するメンバーはいません。";
}
const membersPart = {
  id: "members",
  name: "名簿",
  icon: "👥",
  version: "1.0.0",
  category: "庶務",
  description: "会員名簿（暗号化PII）の照会。特権ロールのみ。",
  permissions: ["db:read", "members:read"],
  orgOnly: true,
  menu: [{ href: "/membership", label: "名簿" }],
  widgets: [
    { id: "members_count", title: "登録メンバー", run: async (ctx) => {
      const r = await ctx.db.first("SELECT count(*) AS n FROM membership");
      return { value: String(r?.n ?? 0) + " 名", sub: "名簿の会員数" };
    } }
  ],
  agentTools: [
    {
      name: "search_members",
      description: "メンバー（名簿）を検索",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      requiredRole: ["admin", "accounting", "clerical"],
      run: (ctx, _owner, _baseUrl, a) => searchMembers(ctx, { query: String(a.query ?? "") })
    }
  ]
};
const sitePart = {
  id: "site",
  name: "HP/LP 公開",
  version: "1.0.0",
  category: "公開",
  description: "サイト/LP の公開・会員申込フォーム。",
  minPlan: "pro",
  orgOnly: true
  // ランチャー（標準アプリ）には出さない：実体は設定→「WEB・公開サイト」(/settings/web) に集約済みで、
  // 独立アプリとして並べると設定側と内容が重複し分かりづらいため（標準アプリから除外）。
};
const importPart = {
  id: "import",
  name: "書類の取り込み・ドライブ操作",
  icon: "📥",
  version: "1.1.0",
  category: "庶務",
  description: "Notion / Google ドライブから資料を取り込み。ドライブのファイル検索・削除（ゴミ箱へ移動）・移動・名前変更。",
  permissions: ["net"],
  // AI 道具が ctx.google.fetch（Drive API）を使うため net を宣言。
  minPlan: "plus",
  orgOnly: true,
  menu: [{ href: "/import", label: "書類の取り込み" }],
  agentTools: [
    {
      name: "search_drive_files",
      description: "Google ドライブのファイルを名前で検索する（query）。ユーザーが Google Drive / Drive / ドライブ と明示した場合だけ使う。baku-office内・アプリ内・内部ストレージ・アップロード済みファイル・PDF一覧は内部ファイル一覧を使う。結果に各ファイルの id が入る",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.drive.search", { query: String(a.query) }, false)
    },
    {
      name: "delete_drive_file",
      description: "Google ドライブのファイルをゴミ箱へ移動する（=削除・復元可能。id）。スプレッドシート/ドキュメント/フォーム/スライドの本体削除もこれを使う",
      minPlan: "pro",
      unattended: false,
      // 破壊系＝無人実行させない・承認ゲート対象
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.drive.trash", { id: String(a.id) }, false)
    },
    {
      name: "rename_drive_file",
      description: "Google ドライブのファイル名を変更する（id、name）",
      minPlan: "pro",
      unattended: false,
      parameters: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } }, required: ["id", "name"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.drive.rename", { id: String(a.id), name: String(a.name) }, false)
    },
    {
      name: "move_drive_file",
      description: "Google ドライブのファイルをフォルダ間で移動する（id、to_folder=移動先フォルダID、from_folder=元フォルダID 任意）",
      minPlan: "pro",
      unattended: false,
      parameters: { type: "object", properties: { id: { type: "string" }, to_folder: { type: "string" }, from_folder: { type: "string" } }, required: ["id", "to_folder"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.drive.move", { id: String(a.id), addParents: String(a.to_folder), removeParents: a.from_folder }, false)
    }
  ]
};
const brandingPart = {
  id: "branding",
  name: "ブランド設定（見た目）",
  icon: "🎨",
  version: "1.0.0",
  category: "カスタマイズ",
  description: "ブランド名・ロゴ・配色を団体ごとに上書き。",
  minPlan: "plus",
  orgOnly: true,
  menu: [{ href: "/settings/theme", label: "ブランド設定" }]
};
const GM = "https://gmail.googleapis.com/gmail/v1/users/me";
const NEED_CONNECT$1 = "Google 連携が未設定です。連携設定（Gmail画面）から連携してください。";
function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeB64url(data) {
  const s = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const bin = atob(s);
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
}
function extractText(p) {
  if (!p) return "";
  if (p.mimeType === "text/plain" && p.body?.data) return decodeB64url(p.body.data);
  for (const c of p.parts ?? []) {
    const t = extractText(c);
    if (t) return t;
  }
  if (p.mimeType === "text/html" && p.body?.data) return decodeB64url(p.body.data).replace(/<[^>]+>/g, " ");
  return "";
}
async function listMessages(ctx, a) {
  const u = new URL(`${GM}/messages`);
  u.searchParams.set("maxResults", String(Math.min(a.max ?? 10, 25)));
  if (a.query) u.searchParams.set("q", a.query);
  else u.searchParams.set("labelIds", "INBOX");
  const r = await ctx.google.fetch(u.toString());
  if (!r) return NEED_CONNECT$1;
  if (!r.ok) return `メール一覧の取得に失敗しました（${r.status}）。`;
  const d = await r.json();
  const ids = (d.messages ?? []).map((m) => m.id);
  if (!ids.length) return "該当するメールはありません。";
  const lines = [];
  for (const id of ids) {
    const mr = await ctx.google.fetch(`${GM}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`);
    if (!mr || !mr.ok) continue;
    const m = await mr.json();
    const h = (n) => m.payload?.headers?.find((x) => x.name === n)?.value ?? "";
    lines.push(`・[${id}] ${h("From")}
  件名: ${h("Subject")}
  ${(m.snippet ?? "").slice(0, 120)}`);
  }
  return lines.join("\n") || "メールを取得できませんでした。";
}
async function getMessage(ctx, a) {
  const r = await ctx.google.fetch(`${GM}/messages/${encodeURIComponent(a.message_id)}?format=full`);
  if (!r) return NEED_CONNECT$1;
  if (!r.ok) return `メール本文の取得に失敗しました（${r.status}）。`;
  const m = await r.json();
  const h = (n) => m.payload?.headers?.find((x) => x.name === n)?.value ?? "";
  const body = extractText(m.payload).slice(0, 4e3);
  return `差出人: ${h("From")}
件名: ${h("Subject")}
日時: ${h("Date")}

${body}`;
}
async function sendMessage(ctx, a) {
  const enc2 = new TextEncoder();
  const subjB64 = btoa(String.fromCharCode(...enc2.encode(a.subject)));
  const raw = [
    `To: ${a.to}`,
    `Subject: =?UTF-8?B?${subjB64}?=`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    a.body
  ].join("\r\n");
  const r = await ctx.google.fetch(`${GM}/messages/send`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ raw: b64url(enc2.encode(raw)) })
  });
  if (!r) return NEED_CONNECT$1;
  if (!r.ok) return `メール送信に失敗しました（${r.status}）。`;
  return `メールを送信しました：${a.to} 宛「${a.subject}」`;
}
function findAttachment(p) {
  if (!p) return null;
  if (p.filename && p.body?.attachmentId) return { attachmentId: p.body.attachmentId, filename: p.filename, mimeType: p.mimeType ?? "application/octet-stream" };
  for (const c of p.parts ?? []) {
    const f = findAttachment(c);
    if (f) return f;
  }
  return null;
}
async function getAttachment(ctx, owner, a) {
  const mr = await ctx.google.fetch(`${GM}/messages/${encodeURIComponent(a.message_id)}?format=full`);
  if (!mr) return NEED_CONNECT$1;
  if (!mr.ok) return `メールの取得に失敗しました（${mr.status}）。`;
  const m = await mr.json();
  const found = findAttachment(m.payload);
  if (!found) return "このメールに添付ファイルはありません。";
  const ar = await ctx.google.fetch(`${GM}/messages/${encodeURIComponent(a.message_id)}/attachments/${found.attachmentId}`);
  if (!ar) return NEED_CONNECT$1;
  if (!ar.ok) return `添付の取得に失敗しました（${ar.status}）。`;
  const ad = await ar.json();
  if (!ad.data) return "添付データが空です。";
  const bin = atob(ad.data.replace(/-/g, "+").replace(/_/g, "/"));
  const file = new File([Uint8Array.from(bin, (c) => c.charCodeAt(0))], found.filename || "attachment", { type: found.mimeType });
  const saved = await ctx.storage.saveFile(file, owner);
  return `添付「${found.filename}」を保存しました: file_id=${saved.id}`;
}
const gmailPart = {
  id: "gmail",
  name: "Gmail",
  version: "1.0.0",
  category: "庶務",
  description: "Gmail のメールを一覧・検索・閲覧・送信。",
  permissions: ["net", "storage:write"],
  // 添付の保存に storage:write が必要。
  minPlan: "pro",
  // ランチャー（標準アプリ）には出さない＝Google連携の接続設定は設定→「Googleとの連携」(/settings/google-setup)
  // に集約。AI操作（メールの一覧・検索・閲覧・送信）は agentTools として維持する。
  agentTools: [
    {
      name: "list_messages",
      description: "受信メールを一覧（query 未指定なら受信箱の最近分）",
      parameters: { type: "object", properties: { query: { type: "string", description: "Gmail検索クエリ（例 from:foo is:unread）" }, max: { type: "number" } } },
      run: (ctx, _o, _b, a) => listMessages(ctx, { query: a.query, max: a.max })
    },
    {
      name: "search_messages",
      description: "Gmail を検索（query 必須）",
      parameters: { type: "object", properties: { query: { type: "string" }, max: { type: "number" } }, required: ["query"] },
      run: (ctx, _o, _b, a) => listMessages(ctx, { query: String(a.query), max: a.max })
    },
    {
      name: "get_message",
      description: "メール本文を取得（message_id 指定）",
      parameters: { type: "object", properties: { message_id: { type: "string" } }, required: ["message_id"] },
      run: (ctx, _o, _b, a) => getMessage(ctx, { message_id: String(a.message_id) })
    },
    {
      name: "send_message",
      description: "メールを送信",
      unattended: false,
      // 無人ジョブでメール送信させない（プロンプトインジェクション対策・道具レベル遮断）
      parameters: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] },
      run: (ctx, _o, _b, a) => sendMessage(ctx, { to: String(a.to), subject: String(a.subject), body: String(a.body) })
    },
    {
      name: "get_attachment",
      description: "メールの添付ファイル(PDF/画像)を取得してストレージへ保存し file_id を返す（請求書登録等に使う）",
      parameters: { type: "object", properties: { message_id: { type: "string" } }, required: ["message_id"] },
      run: (ctx, owner, _b, a) => getAttachment(ctx, owner, { message_id: String(a.message_id) })
    },
    {
      name: "trash_message",
      description: "メールをゴミ箱へ移動する（=削除・復元可能。message_id 指定）",
      unattended: false,
      // 破壊系＝承認ゲート対象
      parameters: { type: "object", properties: { message_id: { type: "string" } }, required: ["message_id"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.gmail.trash", { id: String(a.message_id) }, false)
    },
    {
      name: "archive_message",
      description: "メールを受信トレイから外す（アーカイブ。message_id 指定）",
      unattended: false,
      parameters: { type: "object", properties: { message_id: { type: "string" } }, required: ["message_id"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.gmail.archive", { id: String(a.message_id) }, false)
    },
    {
      name: "mark_message_read",
      description: "メールの既読/未読を変更する（message_id、read=false で未読化。既定は既読）",
      parameters: { type: "object", properties: { message_id: { type: "string" }, read: { type: "boolean" } }, required: ["message_id"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.gmail.markRead", { id: String(a.message_id), read: a.read }, false)
    },
    {
      name: "set_message_labels",
      description: "メールのラベルを変更する（message_id、add=付与するラベルID配列、remove=外すラベルID配列）",
      unattended: false,
      parameters: { type: "object", properties: { message_id: { type: "string" }, add: { type: "array", items: { type: "string" } }, remove: { type: "array", items: { type: "string" } } }, required: ["message_id"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.gmail.label", { id: String(a.message_id), add: a.add, remove: a.remove }, false)
    }
  ]
};
const MEET = "https://meet.googleapis.com/v2";
const NEED_CONNECT = "Google 連携が未設定です。連携設定（Meet画面）から連携してください。";
async function listConferenceRecords(ctx, a) {
  const u = new URL(`${MEET}/conferenceRecords`);
  u.searchParams.set("pageSize", String(Math.min(a.max ?? 10, 25)));
  const r = await ctx.google.fetch(u.toString());
  if (!r) return NEED_CONNECT;
  if (!r.ok) return `会議記録の取得に失敗しました（${r.status}）。`;
  const d = await r.json();
  const recs = d.conferenceRecords ?? [];
  if (!recs.length) return "会議記録はありません（Meet の文字起こしが有効な会議のみ取得できます）。";
  return recs.map((c) => `・[${c.name}] ${(c.startTime ?? "").slice(0, 16).replace("T", " ")} 〜 ${(c.endTime ?? "").slice(11, 16)}`).join("\n");
}
async function fetchParticipantNames(ctx, recordId) {
  const map = /* @__PURE__ */ new Map();
  let pageToken = "";
  for (let i = 0; i < 10; i++) {
    const u = new URL(`${MEET}/${recordId}/participants`);
    u.searchParams.set("pageSize", "100");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const r = await ctx.google.fetch(u.toString());
    if (!r || !r.ok) break;
    const d = await r.json();
    for (const p of d.participants ?? []) {
      const nm = p.signedinUser?.displayName ?? p.anonymousUser?.displayName ?? p.phoneUser?.displayName;
      if (p.name && nm) map.set(p.name, nm);
    }
    if (!d.nextPageToken) break;
    pageToken = d.nextPageToken;
  }
  return map;
}
async function fetchTranscriptText(ctx, recordId, maxChars = 18e3) {
  const tr = await ctx.google.fetch(`${MEET}/${recordId}/transcripts`);
  if (!tr) return null;
  if (!tr.ok) return { text: "", error: `transcripts ${tr.status}` };
  const td = await tr.json();
  const first = td.transcripts?.[0];
  if (!first) return { text: "", error: "この会議に文字起こしがありません。" };
  const nameMap = await fetchParticipantNames(ctx, recordId);
  const speakerOf = (p) => nameMap.get(p ?? "") ?? (p ? p.split("/").pop() ?? "話者" : "話者");
  let pageToken = "";
  const parts = [];
  let total = 0;
  for (let i = 0; i < 20; i++) {
    const u = new URL(`${MEET}/${first.name}/entries`);
    u.searchParams.set("pageSize", "1000");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const er = await ctx.google.fetch(u.toString());
    if (!er || !er.ok) break;
    const ed = await er.json();
    for (const e of ed.transcriptEntries ?? []) {
      const line = `${speakerOf(e.participant)}: ${e.text ?? ""}`;
      parts.push(line);
      total += line.length;
    }
    if (total >= maxChars || !ed.nextPageToken) break;
    pageToken = ed.nextPageToken;
  }
  return { text: parts.join("\n").slice(0, maxChars) };
}
async function getTranscript(ctx, a) {
  const t = await fetchTranscriptText(ctx, a.record_id);
  if (!t) return NEED_CONNECT;
  if (t.error) return t.error;
  return t.text || "トランスクリプトが空です。";
}
async function summarizeMeeting(ctx, owner, a) {
  const t = await fetchTranscriptText(ctx, a.record_id);
  if (!t) return NEED_CONNECT;
  if (t.error) return t.error;
  if (!t.text) return "トランスクリプトが空のため要約できません。";
  const result = await ctx.ai.summarizeTranscript(t.text);
  if (!result) return "要約には Claude APIキーが必要です（連携設定で登録してください）。";
  const title = a.title || `会議 ${new Date(nowSec() * 1e3).toISOString().slice(0, 10)}`;
  const actionsText = result.actions.map((x) => `- ${x.content}${x.due ? `（期限 ${x.due}）` : ""}`).join("\n");
  const body = `${result.summary}

## アクションアイテム
${actionsText || "（なし）"}`;
  await saveKnowledge(ctx, owner, { title: `[議事録] ${title}`, body });
  let reminded = 0;
  for (const x of result.actions) {
    if (!x.due) continue;
    const msg = await setReminder(ctx, owner, { content: `[${title}] ${x.content}`, remind_at: x.due });
    if (msg.startsWith("リマインダー設定")) reminded++;
  }
  await ctx.db.run(
    `INSERT INTO meet_records (id,space_name,title,start_time,end_time,summary,actions,knowledge_saved,reminders_saved,owner,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,1,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, summary=excluded.summary, actions=excluded.actions, knowledge_saved=1, reminders_saved=excluded.reminders_saved, updated_at=excluded.updated_at`,
    [a.record_id, null, title, null, null, result.summary.slice(0, 8e3), JSON.stringify(result.actions).slice(0, 8e3), reminded > 0 ? 1 : 0, owner, nowSec(), nowSec()]
  ).catch(() => {
  });
  return `議事録を作成しました：「${title}」
ナレッジに保存・アクション${result.actions.length}件（うち${reminded}件をリマインダ登録）。`;
}
const meetPart = {
  id: "meet",
  name: "Google Meet",
  version: "1.0.0",
  category: "庶務",
  description: "Google Meet の会議記録から議事録要約を作成し、ナレッジ保存・タスク化する（会議後処理）。",
  permissions: ["net", "db:read", "db:write", "ai"],
  minPlan: "pro",
  // ランチャー（標準アプリ）には出さない＝Google連携の接続設定は設定→「Googleとの連携」(/settings/google-setup)
  // に集約。AI操作（会議記録の取得・議事録要約）は agentTools として維持する。
  agentTools: [
    {
      name: "list_conference_records",
      description: "Google Meet の会議記録を一覧（文字起こしが有効な会議）",
      parameters: { type: "object", properties: { max: { type: "number" } } },
      run: (ctx, _o, _b, a) => listConferenceRecords(ctx, { max: a.max })
    },
    {
      name: "get_transcript",
      description: "会議のトランスクリプト本文を話者名付き（「氏名: 発言」）で取得（record_id 指定）",
      parameters: { type: "object", properties: { record_id: { type: "string", description: "conferenceRecords/xxx 形式" } }, required: ["record_id"] },
      run: (ctx, _o, _b, a) => getTranscript(ctx, { record_id: String(a.record_id) })
    },
    {
      name: "summarize_meeting",
      description: "会議のトランスクリプトを要約して議事録を作成。ナレッジ保存＋アクションをリマインダ登録",
      parameters: { type: "object", properties: { record_id: { type: "string", description: "conferenceRecords/xxx 形式" }, title: { type: "string" } }, required: ["record_id"] },
      run: (ctx, owner, _b, a) => summarizeMeeting(ctx, owner, { record_id: String(a.record_id), title: a.title })
    }
  ]
};
async function listUpcoming(ctx) {
  const rows = await ctx.db.all(
    "SELECT title, event_date, location, slug FROM events WHERE published=1 ORDER BY (event_date IS NULL), event_date ASC LIMIT 20"
  );
  if (!rows.length) return "公開中のイベントはありません。";
  return rows.map((r) => `・${r.title}${r.event_date ? `（${r.event_date}）` : ""}${r.location ? ` @${r.location}` : ""} → /event/${r.slug}`).join("\n");
}
const eventsPart = {
  id: "events",
  name: "イベント",
  icon: "🎫",
  version: "1.0.0",
  category: "公開",
  description: "イベントの公開・申込・参加者管理（会員登録・会計と連動）。",
  permissions: ["db:read"],
  orgOnly: true,
  // 管理（作成・参加者確認）は組織管理者。会員の「参加イベント」は申込完了画面から /my-events へ直接遷移。
  menu: [{ href: "/settings/events", label: "イベント管理" }],
  agentTools: [
    {
      name: "list_upcoming_events",
      description: "公開中の今後のイベント一覧（件名・日時・場所・申込ページ）を返す。",
      parameters: { type: "object", properties: {} },
      run: (ctx) => listUpcoming(ctx)
    }
  ]
};
const BASE$5 = "https://sheets.googleapis.com/v4/spreadsheets";
const NEED$5 = "Google 連携（スプレッドシート）が未設定です。設定→Google連携で「スプレッドシート」を許可してください。";
const enc$4 = encodeURIComponent;
async function readSheet(ctx, a) {
  const r = await ctx.google.fetch(`${BASE$5}/${enc$4(extractGoogleId(a.id))}/values/${enc$4(a.range || "A1:Z200")}`);
  if (!r) return NEED$5;
  if (!r.ok) return googleApiError("読み取り", r.status, "スプレッドシートIDと範囲をご確認ください。");
  const d = await r.json();
  const rows = d.values ?? [];
  if (!rows.length) return "（データがありません）";
  return rows.map((row) => row.join("	")).join("\n");
}
async function updateSheet(ctx, a) {
  const r = await ctx.google.fetch(
    `${BASE$5}/${enc$4(extractGoogleId(a.id))}/values/${enc$4(a.range)}?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: a.values }) }
  );
  if (!r) return NEED$5;
  if (!r.ok) return googleApiError("更新", r.status);
  const d = await r.json();
  return `更新しました（${d.updatedCells ?? 0} セル）。`;
}
async function appendSheet(ctx, a) {
  const r = await ctx.google.fetch(
    `${BASE$5}/${enc$4(extractGoogleId(a.id))}/values/${enc$4(a.range || "A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: a.values }) }
  );
  if (!r) return NEED$5;
  if (!r.ok) return googleApiError("追記", r.status);
  const d = await r.json();
  return `追記しました（${d.updates?.updatedRows ?? 0} 行）。`;
}
async function createSpreadsheet(ctx, a) {
  const r = await ctx.google.fetch(BASE$5, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ properties: { title: a.title } }) });
  if (!r) return NEED$5;
  if (!r.ok) return googleApiError("作成", r.status);
  const d = await r.json();
  return `スプレッドシートを作成しました：${d.spreadsheetUrl ?? d.spreadsheetId}（id:${d.spreadsheetId}）`;
}
const GRID = { type: "array", description: "2次元配列（行の配列）。各行はセル値の配列。", items: { type: "array", items: { type: "string" } } };
const sheetsPart = {
  id: "sheets",
  name: "スプレッドシート",
  version: "1.0.0",
  category: "Google連携",
  description: "Google スプレッドシートの読み取り・作成・追記・更新。",
  permissions: ["net"],
  // 親パーツは plus（読取を Plus で使える）。作成/追記/更新の write は tool.minPlan=pro（P1-1）。
  minPlan: "plus",
  agentTools: [
    {
      name: "read_spreadsheet",
      description: "Googleスプレッドシートの値を読み取る（id=スプレッドシートID または 共有/編集URL、range=例 'シート1!A1:D20'）",
      parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string", description: "A1記法の範囲（省略時 A1:Z200）" } }, required: ["id"] },
      run: (ctx, _o, _b, a) => readSheet(ctx, { id: String(a.id), range: a.range })
    },
    {
      name: "append_spreadsheet",
      description: "スプレッドシートに行を追記する（id、range=表の左上 例 'シート1!A1'、values=2次元配列）",
      minPlan: "pro",
      parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" }, values: GRID }, required: ["id", "values"] },
      run: (ctx, _o, _b, a) => appendSheet(ctx, { id: String(a.id), range: a.range, values: a.values })
    },
    {
      name: "update_spreadsheet",
      description: "スプレッドシートの指定範囲を上書き更新する（id、range、values=2次元配列）",
      minPlan: "pro",
      parameters: { type: "object", properties: { id: { type: "string" }, range: { type: "string" }, values: GRID }, required: ["id", "range", "values"] },
      run: (ctx, _o, _b, a) => updateSheet(ctx, { id: String(a.id), range: String(a.range), values: a.values })
    },
    {
      name: "create_spreadsheet",
      description: "新しいスプレッドシートを作成し、URLとIDを返す",
      minPlan: "pro",
      parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      run: (ctx, _o, _b, a) => createSpreadsheet(ctx, { title: String(a.title) })
    },
    {
      name: "delete_sheet_rows",
      description: "スプレッドシートの行を削除する（id、sheet_id=数値のシートID(gid)、start/end=0始まりの行範囲・endは含まない）",
      minPlan: "pro",
      unattended: false,
      // 破壊系＝無人実行させない・承認ゲート対象
      parameters: { type: "object", properties: { id: { type: "string" }, sheet_id: { type: "number" }, start: { type: "number" }, end: { type: "number" } }, required: ["id", "sheet_id", "start", "end"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.sheets.deleteRows", { id: String(a.id), sheetId: a.sheet_id, startIndex: a.start, endIndex: a.end }, false)
    },
    {
      name: "delete_sheet_tab",
      description: "スプレッドシート内のシート(タブ)を削除する（id、sheet_id=数値のシートID(gid)）",
      minPlan: "pro",
      unattended: false,
      parameters: { type: "object", properties: { id: { type: "string" }, sheet_id: { type: "number" } }, required: ["id", "sheet_id"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.sheets.deleteTab", { id: String(a.id), sheetId: a.sheet_id }, false)
    }
  ]
};
const BASE$4 = "https://docs.googleapis.com/v1/documents";
const NEED$4 = "Google 連携（ドキュメント）が未設定です。設定→Google連携で「ドキュメント」を許可してください。";
const enc$3 = encodeURIComponent;
function docText(d) {
  const out = [];
  for (const c of d.body?.content ?? []) {
    const para = (c.paragraph?.elements ?? []).map((e) => e.textRun?.content ?? "").join("");
    if (para.trim()) out.push(para.replace(/\n+$/, ""));
  }
  return out.join("\n");
}
async function readDoc(ctx, a) {
  const r = await ctx.google.fetch(`${BASE$4}/${enc$3(extractGoogleId(a.id))}`);
  if (!r) return NEED$4;
  if (!r.ok) return googleApiError("読み取り", r.status, "ドキュメントIDをご確認ください。");
  const d = await r.json();
  const text = docText(d);
  return `【${d.title ?? "(無題)"}】
${text || "（本文は空です）"}`;
}
async function createDoc(ctx, a) {
  const r = await ctx.google.fetch(BASE$4, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: a.title }) });
  if (!r) return NEED$4;
  if (!r.ok) return googleApiError("作成", r.status);
  const d = await r.json();
  if (a.body && d.documentId) await appendDoc(ctx, { id: d.documentId, text: a.body });
  return `ドキュメントを作成しました：https://docs.google.com/document/d/${d.documentId}/edit （id:${d.documentId}）`;
}
async function appendDoc(ctx, a) {
  const requests = [{ insertText: { endOfSegmentLocation: {}, text: a.text.endsWith("\n") ? a.text : a.text + "\n" } }];
  const r = await ctx.google.fetch(`${BASE$4}/${enc$3(extractGoogleId(a.id))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
  if (!r) return NEED$4;
  if (!r.ok) return googleApiError("追記", r.status);
  return "ドキュメントに追記しました。";
}
const docsPart = {
  id: "docs",
  name: "ドキュメント",
  version: "1.0.0",
  category: "Google連携",
  description: "Google ドキュメントの読み取り・作成・末尾追記。",
  permissions: ["net"],
  // 親パーツは plus（読取を Plus で使える）。作成/追記の write は tool.minPlan=pro（P1-1）。
  minPlan: "plus",
  agentTools: [
    {
      name: "read_document",
      description: "Googleドキュメントの本文を読み取る（id=ドキュメントID または 共有/編集URL）",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      run: (ctx, _o, _b, a) => readDoc(ctx, { id: String(a.id) })
    },
    {
      name: "create_document",
      description: "新しいGoogleドキュメントを作成（body を渡すと本文も入れる）。URLとIDを返す",
      minPlan: "pro",
      parameters: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title"] },
      run: (ctx, _o, _b, a) => createDoc(ctx, { title: String(a.title), body: a.body })
    },
    {
      name: "append_document",
      description: "Googleドキュメントの末尾にテキストを追記する（id、text）",
      minPlan: "pro",
      parameters: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"] },
      run: (ctx, _o, _b, a) => appendDoc(ctx, { id: String(a.id), text: String(a.text) })
    },
    {
      name: "delete_document_range",
      description: "Googleドキュメント本文の指定範囲を削除する（id、start/end=文字インデックス）。ドキュメント本体の削除は delete_drive_file を使う",
      minPlan: "pro",
      unattended: false,
      // 破壊系＝承認ゲート対象
      parameters: { type: "object", properties: { id: { type: "string" }, start: { type: "number" }, end: { type: "number" } }, required: ["id", "start", "end"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.docs.deleteRange", { id: String(a.id), startIndex: a.start, endIndex: a.end }, false)
    }
  ]
};
const BASE$3 = "https://slides.googleapis.com/v1/presentations";
const NEED$3 = "Google 連携（スライド）が未設定です。設定→Google連携で「スライド」を許可してください。";
const enc$2 = encodeURIComponent;
async function readPres(ctx, a) {
  const r = await ctx.google.fetch(`${BASE$3}/${enc$2(a.id)}?fields=title,slides.pageElements.shape.text.textElements.textRun.content`);
  if (!r) return NEED$3;
  if (!r.ok) return googleApiError("読み取り", r.status, "プレゼンテーションIDをご確認ください。");
  const d = await r.json();
  const slides = d.slides ?? [];
  const lines = slides.map((s, i) => {
    const txt = (s.pageElements ?? []).flatMap((p) => (p.shape?.text?.textElements ?? []).map((t) => t.textRun?.content ?? "")).join("").trim();
    return `スライド${i + 1}: ${txt || "(テキストなし)"}`;
  });
  return `【${d.title ?? "(無題)"}】全${slides.length}枚
${lines.join("\n")}`;
}
async function createPres(ctx, a) {
  const r = await ctx.google.fetch(BASE$3, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: a.title }) });
  if (!r) return NEED$3;
  if (!r.ok) return googleApiError("作成", r.status);
  const d = await r.json();
  return `スライドを作成しました：https://docs.google.com/presentation/d/${d.presentationId}/edit （id:${d.presentationId}）`;
}
async function addSlide(ctx, a) {
  const slideId = "s_" + randomId().slice(0, 12);
  const boxId = "t_" + randomId().slice(0, 12);
  const requests = [
    { createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: "BLANK" } } },
    { createShape: { objectId: boxId, shapeType: "TEXT_BOX", elementProperties: { pageObjectId: slideId, size: { width: { magnitude: 6e6, unit: "EMU" }, height: { magnitude: 3e6, unit: "EMU" } }, transform: { scaleX: 1, scaleY: 1, translateX: 6e5, translateY: 6e5, unit: "EMU" } } } },
    { insertText: { objectId: boxId, text: a.text } }
  ];
  const r = await ctx.google.fetch(`${BASE$3}/${enc$2(a.id)}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
  if (!r) return NEED$3;
  if (!r.ok) return googleApiError("スライド追加", r.status);
  return "スライドを追加しました。";
}
const slidesPart = {
  id: "slides",
  name: "スライド",
  version: "1.0.0",
  category: "Google連携",
  description: "Google スライドの読み取り・作成・スライド追加。",
  permissions: ["net"],
  minPlan: "pro",
  agentTools: [
    {
      name: "read_presentation",
      description: "Googleスライドの各スライドのテキストを読み取る（id=プレゼンテーションID）",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      run: (ctx, _o, _b, a) => readPres(ctx, { id: String(a.id) })
    },
    {
      name: "create_presentation",
      description: "新しいGoogleスライドを作成。URLとIDを返す",
      parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      run: (ctx, _o, _b, a) => createPres(ctx, { title: String(a.title) })
    },
    {
      name: "add_slide",
      description: "Googleスライドに新しいスライドを追加し、テキストを入れる（id、text）",
      parameters: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"] },
      run: (ctx, _o, _b, a) => addSlide(ctx, { id: String(a.id), text: String(a.text) })
    },
    {
      name: "delete_slide",
      description: "Googleスライドの1枚を削除する（id、slide_id=スライドのobjectId。read_presentation で各スライドを確認）。プレゼン本体の削除は delete_drive_file を使う",
      unattended: false,
      // 破壊系＝承認ゲート対象
      parameters: { type: "object", properties: { id: { type: "string" }, slide_id: { type: "string" } }, required: ["id", "slide_id"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.slides.deleteSlide", { id: String(a.id), slideId: String(a.slide_id) }, false)
    }
  ]
};
const BASE$2 = "https://forms.googleapis.com/v1/forms";
const NEED$2 = "Google 連携（フォーム）が未設定です。設定→Google連携で「フォーム」を許可してください。";
const enc$1 = encodeURIComponent;
async function readForm(ctx, a) {
  const id = extractGoogleId(a.id);
  const r = await ctx.google.fetch(`${BASE$2}/${enc$1(id)}`);
  if (!r) return NEED$2;
  if (!r.ok) return r.status === 404 ? `フォームが見つかりません（${r.status}）。編集URL（.../forms/d/{ID}/edit）またはフォームIDを指定してください。公開URL（/viewform）のIDはAPIでは読めません。` : googleApiError("フォーム取得", r.status);
  const d = await r.json();
  const title = d.info?.title ?? d.info?.documentTitle ?? "(無題)";
  const items = d.items ?? [];
  if (!items.length) return `フォーム「${title}」（id:${d.formId ?? id}）：設問はまだありません。`;
  const lines = items.map((it, i) => {
    const q = it.questionItem?.question;
    const opts = q?.choiceQuestion?.options?.map((o) => o.value).filter(Boolean) ?? [];
    const meta = [q?.required ? "必須" : "", opts.length ? `選択肢: ${opts.join("／")}` : ""].filter(Boolean).join(" / ");
    return `${i + 1}. ${it.title ?? "(無題設問)"}${meta ? `（${meta}）` : ""}`;
  });
  return `フォーム「${title}」（id:${d.formId ?? id}）
${lines.join("\n")}`;
}
async function createForm(ctx, a) {
  const r = await ctx.google.fetch(BASE$2, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ info: { title: a.title } }) });
  if (!r) return NEED$2;
  if (!r.ok) return googleApiError("作成", r.status);
  const d = await r.json();
  return `フォームを作成しました：${d.responderUri ?? `https://docs.google.com/forms/d/${d.formId}/edit`}（id:${d.formId}）`;
}
async function addQuestion(ctx, a) {
  const isChoice = (a.type === "choice" || a.type === "radio") && (a.options?.length ?? 0) > 0;
  const question = isChoice ? { required: !!a.required, choiceQuestion: { type: "RADIO", options: (a.options ?? []).map((v) => ({ value: v })) } } : { required: !!a.required, textQuestion: { paragraph: a.type === "paragraph" } };
  const requests = [{ createItem: { item: { title: a.title, questionItem: { question } }, location: { index: 0 } } }];
  const r = await ctx.google.fetch(`${BASE$2}/${enc$1(extractGoogleId(a.id))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
  if (!r) return NEED$2;
  if (!r.ok) return googleApiError("設問追加", r.status);
  return "設問を追加しました。";
}
async function listResponses(ctx, a) {
  const r = await ctx.google.fetch(`${BASE$2}/${enc$1(extractGoogleId(a.id))}/responses`);
  if (!r) return NEED$2;
  if (!r.ok) return googleApiError("回答取得", r.status);
  const d = await r.json();
  const responses = d.responses ?? [];
  if (!responses.length) return "回答はまだありません。";
  const lines = responses.slice(0, 30).map((resp, i) => {
    const ans = Object.values(resp.answers ?? {}).map((x) => (x.textAnswers?.answers ?? []).map((v) => v.value).join(", ")).filter(Boolean);
    return `回答${i + 1}: ${ans.join(" / ")}`;
  });
  return `全${responses.length}件
${lines.join("\n")}`;
}
const formsPart = {
  id: "forms",
  name: "フォーム",
  version: "1.0.0",
  category: "Google連携",
  description: "Google フォームの作成・設問追加・回答取得。",
  permissions: ["net"],
  // 親パーツは plus（読取ツールを Plus で使える成長レバー・P1-1）。作成/編集の write ツールは各 tool.minPlan=pro で分離。
  minPlan: "plus",
  agentTools: [
    {
      name: "create_form",
      description: "新しいGoogleフォームを作成。回答用URLとIDを返す",
      minPlan: "pro",
      parameters: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
      run: (ctx, _o, _b, a) => createForm(ctx, { title: String(a.title) })
    },
    {
      name: "add_form_question",
      description: "フォームに設問を追加（id、title、type='text'|'paragraph'|'choice'、choice時は options 配列、required 任意）",
      minPlan: "pro",
      parameters: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, type: { type: "string", enum: ["text", "paragraph", "choice"] }, options: { type: "array", items: { type: "string" } }, required: { type: "boolean" } }, required: ["id", "title"] },
      run: (ctx, _o, _b, a) => addQuestion(ctx, { id: String(a.id), title: String(a.title), type: a.type, options: a.options, required: !!a.required })
    },
    {
      name: "list_form_responses",
      description: "Googleフォームの回答を取得して一覧する（id または回答用URL）",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      run: (ctx, _o, _b, a) => listResponses(ctx, { id: String(a.id) })
    },
    {
      name: "read_form",
      description: "Googleフォームの構造（タイトル・設問一覧）を取得する（id または編集/回答用URL）。回答ではなくフォームの中身を読む",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      run: (ctx, _o, _b, a) => readForm(ctx, { id: String(a.id) })
    },
    {
      name: "delete_form_question",
      // 回答（レスポンス）の削除は Forms API に口が無く不可＝提供しない。設問の削除のみ対応。
      description: "Googleフォームの設問を削除する（id、index=0始まりの設問位置。read_form で順番が分かる）。フォーム本体の削除は delete_drive_file を使う。※回答の削除はGoogleが提供しておらず不可",
      minPlan: "pro",
      unattended: false,
      parameters: { type: "object", properties: { id: { type: "string" }, index: { type: "number" } }, required: ["id", "index"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.forms.deleteQuestion", { id: String(a.id), index: a.index }, false)
    }
  ]
};
const BASE$1 = "https://people.googleapis.com/v1";
const NEED$1 = "Google 連携（連絡先）が未設定です。設定→Google連携で「連絡先」を許可してください。";
async function searchContacts(ctx, a) {
  const u = new URL(`${BASE$1}/people:searchContacts`);
  u.searchParams.set("query", a.query);
  u.searchParams.set("readMask", "names,emailAddresses,phoneNumbers");
  u.searchParams.set("pageSize", "20");
  const r = await ctx.google.fetch(u.toString());
  if (!r) return NEED$1;
  if (!r.ok) return googleApiError("連絡先の検索", r.status);
  const d = await r.json();
  const people = (d.results ?? []).map((x) => x.person).filter(Boolean);
  if (!people.length) return "該当する連絡先はありません。";
  return people.map((p) => {
    const name = p.names?.[0]?.displayName ?? "(名前なし)";
    const mail = p.emailAddresses?.[0]?.value ?? "";
    const tel = p.phoneNumbers?.[0]?.value ?? "";
    return `・${name}${mail ? ` / ${mail}` : ""}${tel ? ` / ${tel}` : ""}（id:${p.resourceName ?? ""}）`;
  }).join("\n");
}
async function createContact(ctx, a) {
  const person = { names: [{ givenName: a.name }], emailAddresses: a.email ? [{ value: a.email }] : void 0, phoneNumbers: a.phone ? [{ value: a.phone }] : void 0 };
  const r = await ctx.google.fetch(`${BASE$1}/people:createContact`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(person) });
  if (!r) return NEED$1;
  if (!r.ok) return googleApiError("連絡先の追加", r.status);
  return `連絡先「${a.name}」を追加しました。`;
}
const contactsPart = {
  id: "contacts",
  name: "連絡先",
  version: "1.0.0",
  category: "Google連携",
  description: "Google 連絡先の検索・追加。",
  permissions: ["net"],
  minPlan: "pro",
  agentTools: [
    {
      name: "search_contacts",
      description: "Google連絡先を検索する（query=名前やメールの一部）",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      run: (ctx, _o, _b, a) => searchContacts(ctx, { query: String(a.query) })
    },
    {
      name: "create_contact",
      description: "Google連絡先を追加する（name、email・phone は任意）",
      parameters: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, phone: { type: "string" } }, required: ["name"] },
      run: (ctx, _o, _b, a) => createContact(ctx, { name: String(a.name), email: a.email, phone: a.phone })
    },
    {
      name: "update_contact",
      description: "Google連絡先を更新する（resource_name=search_contacts の id、変更する name/email/phone を指定）",
      unattended: false,
      parameters: { type: "object", properties: { resource_name: { type: "string" }, name: { type: "string" }, email: { type: "string" }, phone: { type: "string" } }, required: ["resource_name"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.contacts.update", { resourceName: String(a.resource_name), name: a.name, email: a.email, phone: a.phone }, false)
    },
    {
      name: "delete_contact",
      description: "Google連絡先を削除する（resource_name=search_contacts の id）",
      unattended: false,
      // 破壊系＝承認ゲート対象
      parameters: { type: "object", properties: { resource_name: { type: "string" } }, required: ["resource_name"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.contacts.delete", { resourceName: String(a.resource_name) }, false)
    }
  ]
};
const BASE = "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks";
const NEED = "Google 連携（ToDo）が未設定です。設定→Google連携で「ToDo」を許可してください。";
const enc = encodeURIComponent;
async function listTasks(ctx, a) {
  const u = new URL(BASE);
  u.searchParams.set("showCompleted", a.show_completed ? "true" : "false");
  u.searchParams.set("maxResults", "50");
  const r = await ctx.google.fetch(u.toString());
  if (!r) return NEED;
  if (!r.ok) return googleApiError("ToDoの取得", r.status);
  const d = await r.json();
  const items = d.items ?? [];
  if (!items.length) return "ToDo はありません。";
  return items.map((t) => `・${t.status === "completed" ? "[完了] " : ""}${t.title ?? "(無題)"}${t.due ? `（期限 ${t.due.slice(0, 10)}）` : ""}（id:${t.id}）`).join("\n");
}
async function addTask(ctx, a) {
  const body = { title: a.title, notes: a.notes };
  if (a.due) body.due = /T/.test(a.due) ? a.due : `${a.due}T00:00:00.000Z`;
  const r = await ctx.google.fetch(BASE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r) return NEED;
  if (!r.ok) return googleApiError("ToDoの追加", r.status);
  return `ToDo「${a.title}」を追加しました。`;
}
async function completeTask(ctx, a) {
  const r = await ctx.google.fetch(`${BASE}/${enc(a.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "completed" }) });
  if (!r) return NEED;
  if (!r.ok) return googleApiError("ToDoの完了", r.status);
  return "ToDo を完了にしました。";
}
const tasksPart = {
  id: "tasks",
  name: "ToDo",
  version: "1.0.0",
  category: "Google連携",
  description: "Google ToDo（Tasks）の一覧・追加・完了。",
  permissions: ["net"],
  minPlan: "pro",
  agentTools: [
    {
      name: "list_tasks",
      description: "Google ToDo の一覧を取得（show_completed=true で完了分も含む）",
      parameters: { type: "object", properties: { show_completed: { type: "boolean" } } },
      run: (ctx, _o, _b, a) => listTasks(ctx, { show_completed: !!a.show_completed })
    },
    {
      name: "add_task",
      description: "Google ToDo を追加（title、due=期限日 例 '2026-06-30'、notes 任意）",
      parameters: { type: "object", properties: { title: { type: "string" }, due: { type: "string" }, notes: { type: "string" } }, required: ["title"] },
      run: (ctx, _o, _b, a) => addTask(ctx, { title: String(a.title), due: a.due, notes: a.notes })
    },
    {
      name: "complete_task",
      description: "Google ToDo を完了にする（id 指定）",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      run: (ctx, _o, _b, a) => completeTask(ctx, { id: String(a.id) })
    },
    {
      name: "delete_task",
      description: "Google ToDo を削除する（id 指定・list_tasks で id が分かる）",
      unattended: false,
      // 破壊系＝承認ゲート対象
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      run: (ctx, _o, _b, a) => runGoogleOp(ctx.google, "google.tasks.delete", { taskId: String(a.id) }, false)
    }
  ]
};
function registerBuiltinParts() {
  registerPart(chatApp);
  registerPart(accountingPart);
  registerPart(memoPart);
  registerPart(remindersPart);
  registerPart(knowledgePart);
  registerPart(membersPart);
  registerPart(sitePart);
  registerPart(importPart);
  registerPart(brandingPart);
  registerPart(calendarPart);
  registerPart(gmailPart);
  registerPart(meetPart);
  registerPart(invoicesPart);
  registerPart(eventsPart);
  registerPart(sheetsPart);
  registerPart(docsPart);
  registerPart(slidesPart);
  registerPart(formsPart);
  registerPart(contactsPart);
  registerPart(tasksPart);
}
registerBuiltinParts();
export {
  registerBuiltinParts
};
