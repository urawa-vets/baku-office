globalThis.process ??= {};
globalThis.process.env ??= {};
import { g as googleApiError } from "./google-err_DkenUeeQ.mjs";
function extractGoogleId(input) {
  const s = (input ?? "").trim();
  if (!s) return s;
  if (!/^https?:/i.test(s) && !/[/\s]/.test(s)) return s;
  const m = s.match(/\/d\/e\/([a-zA-Z0-9_-]+)/) ?? // 公開フォーム viewform（responder id）
  s.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? // spreadsheets/document/presentation/forms の編集URL
  s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : s;
}
const GOOGLE_OPS = {
  // ── カレンダー ──
  "google.calendar.list": { perm: "google:calendar:read", group: "calendar", effect: "read", plan: "plus", args: [], desc: "google.calendar.list（予定を一覧。任意 timeMin/timeMax=ISO日時, query, max）" },
  "google.calendar.create": { perm: "google:calendar:write", group: "calendar", effect: "write", plan: "pro", args: ["title", "start", "end"], desc: "google.calendar.create（予定作成。title, start, end=ISO日時, 任意 description, withMeet=true でMeet発行）" },
  "google.calendar.update": { perm: "google:calendar:write", group: "calendar", effect: "write", plan: "pro", args: ["eventId"], desc: "google.calendar.update（予定更新。eventId＋変更する title/start/end/description）" },
  "google.calendar.delete": { perm: "google:calendar:write", group: "calendar", effect: "delete", plan: "pro", args: ["eventId"], desc: "google.calendar.delete（予定削除。eventId）" },
  // ── スプレッドシート ──
  "google.sheets.read": { perm: "google:sheets:read", group: "sheets", effect: "read", plan: "plus", args: ["id"], desc: "google.sheets.read（値を読取。id=シートID/URL, 任意 range 例 'シート1!A1:D20'）" },
  "google.sheets.create": { perm: "google:sheets:write", group: "sheets", effect: "write", plan: "pro", args: ["title"], desc: "google.sheets.create（新規スプレッドシート作成。title）" },
  "google.sheets.append": { perm: "google:sheets:write", group: "sheets", effect: "write", plan: "pro", args: ["id", "values"], desc: "google.sheets.append（行を追記。id, 任意 range=左上, values=2次元配列）" },
  "google.sheets.update": { perm: "google:sheets:write", group: "sheets", effect: "write", plan: "pro", args: ["id", "range", "values"], desc: "google.sheets.update（範囲を上書き。id, range, values=2次元配列）" },
  "google.sheets.deleteRows": { perm: "google:sheets:write", group: "sheets", effect: "delete", plan: "pro", args: ["id", "sheetId", "startIndex", "endIndex"], desc: "google.sheets.deleteRows（行を削除。id, sheetId=数値のシートID(gid), startIndex/endIndex=0始まりの行範囲・end含まず）" },
  "google.sheets.deleteTab": { perm: "google:sheets:write", group: "sheets", effect: "delete", plan: "pro", args: ["id", "sheetId"], desc: "google.sheets.deleteTab（シート(タブ)を削除。id, sheetId=数値のシートID(gid)）" },
  // ── ドキュメント ──
  "google.docs.read": { perm: "google:docs:read", group: "docs", effect: "read", plan: "plus", args: ["id"], desc: "google.docs.read（本文を読取。id=ドキュメントID/URL）" },
  "google.docs.create": { perm: "google:docs:write", group: "docs", effect: "write", plan: "pro", args: ["title"], desc: "google.docs.create（新規ドキュメント作成。title, 任意 body）" },
  "google.docs.append": { perm: "google:docs:write", group: "docs", effect: "write", plan: "pro", args: ["id", "text"], desc: "google.docs.append（末尾に追記。id, text）" },
  "google.docs.deleteRange": { perm: "google:docs:write", group: "docs", effect: "delete", plan: "pro", args: ["id", "startIndex", "endIndex"], desc: "google.docs.deleteRange（本文の範囲を削除。id, startIndex/endIndex=文字インデックス）" },
  // ── スライド ──
  "google.slides.read": { perm: "google:slides:read", group: "slides", effect: "read", plan: "plus", args: ["id"], desc: "google.slides.read（各スライドのテキストを読取。id）" },
  "google.slides.create": { perm: "google:slides:write", group: "slides", effect: "write", plan: "pro", args: ["title"], desc: "google.slides.create（新規スライド作成。title）" },
  "google.slides.add": { perm: "google:slides:write", group: "slides", effect: "write", plan: "pro", args: ["id", "text"], desc: "google.slides.add（スライド追加しテキスト挿入。id, text）" },
  "google.slides.deleteSlide": { perm: "google:slides:write", group: "slides", effect: "delete", plan: "pro", args: ["id", "slideId"], desc: "google.slides.deleteSlide（スライドを削除。id, slideId=スライドのobjectId。read で各スライドのIDが分かる）" },
  // ── フォーム ──
  "google.forms.read": { perm: "google:forms:read", group: "forms", effect: "read", plan: "plus", args: ["id"], desc: "google.forms.read（フォーム構造=タイトル・設問一覧を読取。id=編集URL/ID）" },
  "google.forms.responses": { perm: "google:forms:read", group: "forms", effect: "read", plan: "plus", args: ["id"], desc: "google.forms.responses（回答を取得。id）" },
  "google.forms.create": { perm: "google:forms:write", group: "forms", effect: "write", plan: "pro", args: ["title"], desc: "google.forms.create（新規フォーム作成。title）" },
  "google.forms.addQuestion": { perm: "google:forms:write", group: "forms", effect: "write", plan: "pro", args: ["id", "title"], desc: "google.forms.addQuestion（設問追加。id, title, 任意 qType='text'|'paragraph'|'choice', options[], required）" },
  "google.forms.deleteQuestion": { perm: "google:forms:write", group: "forms", effect: "delete", plan: "pro", args: ["id", "index"], desc: "google.forms.deleteQuestion（設問を削除。id, index=0始まりの設問位置。read で順番が分かる。※回答の削除はGoogle APIに無く不可）" },
  // ── ToDo（Tasks） ──
  "google.tasks.list": { perm: "google:tasks:read", group: "tasks", effect: "read", plan: "plus", args: [], desc: "google.tasks.list（ToDo一覧。任意 showCompleted=true）" },
  "google.tasks.add": { perm: "google:tasks:write", group: "tasks", effect: "write", plan: "pro", args: ["title"], desc: "google.tasks.add（ToDo追加。title, 任意 due='2026-06-30', notes）" },
  "google.tasks.complete": { perm: "google:tasks:write", group: "tasks", effect: "write", plan: "pro", args: ["taskId"], desc: "google.tasks.complete（ToDoを完了。taskId）" },
  "google.tasks.delete": { perm: "google:tasks:write", group: "tasks", effect: "delete", plan: "pro", args: ["taskId"], desc: "google.tasks.delete（ToDoを削除。taskId。list で id が分かる）" },
  // ── 連絡先（People） ──
  "google.contacts.search": { perm: "google:contacts:read", group: "contacts", effect: "read", plan: "plus", args: ["query"], desc: "google.contacts.search（連絡先検索。query=名前やメールの一部。結果に resourceName が入る）" },
  "google.contacts.create": { perm: "google:contacts:write", group: "contacts", effect: "write", plan: "pro", args: ["name"], desc: "google.contacts.create（連絡先追加。name, 任意 email, phone）" },
  "google.contacts.update": { perm: "google:contacts:write", group: "contacts", effect: "write", plan: "pro", args: ["resourceName"], desc: "google.contacts.update（連絡先を更新。resourceName（search で取得）＋変更する name/email/phone）" },
  "google.contacts.delete": { perm: "google:contacts:write", group: "contacts", effect: "delete", plan: "pro", args: ["resourceName"], desc: "google.contacts.delete（連絡先を削除。resourceName。search で取得）" },
  // ── Gmail ──
  "google.gmail.list": { perm: "google:gmail:read", group: "gmail_read", effect: "read", plan: "plus", args: [], desc: "google.gmail.list（メール一覧。任意 query=Gmail検索式, max）" },
  "google.gmail.send": { perm: "google:gmail:send", group: "gmail_send", effect: "send", plan: "pro", args: ["to", "subject", "body"], desc: "google.gmail.send（メール送信。to, subject, body）※常に承認ゲート" },
  "google.gmail.trash": { perm: "google:gmail:modify", group: "gmail_modify", effect: "delete", plan: "pro", args: ["id"], desc: "google.gmail.trash（メールをゴミ箱へ移動=削除・復元可能。id。list で id が分かる）" },
  "google.gmail.archive": { perm: "google:gmail:modify", group: "gmail_modify", effect: "write", plan: "pro", args: ["id"], desc: "google.gmail.archive（メールを受信トレイから外す=アーカイブ。id）" },
  "google.gmail.markRead": { perm: "google:gmail:modify", group: "gmail_modify", effect: "write", plan: "pro", args: ["id"], desc: "google.gmail.markRead（既読/未読を変更。id, 任意 read=false で未読化。既定=既読）" },
  "google.gmail.label": { perm: "google:gmail:modify", group: "gmail_modify", effect: "write", plan: "pro", args: ["id"], desc: "google.gmail.label（ラベルを変更。id, 任意 add=付与するラベルID配列, remove=外すラベルID配列）" },
  // ── Meet ──
  "google.meet.records": { perm: "google:meet:read", group: "meet", effect: "read", plan: "plus", args: [], desc: "google.meet.records（会議記録の一覧。任意 max）" },
  // ── ドライブ ──
  "google.drive.search": { perm: "google:drive:read", group: "drive", effect: "read", plan: "plus", args: ["query"], desc: "google.drive.search（ファイル検索。query=名前の一部）" },
  "google.drive.read": { perm: "google:drive:read", group: "drive", effect: "read", plan: "plus", args: ["id"], desc: "google.drive.read（ファイル本文を読取。id。Google形式はドキュメント/シートopを使う）" },
  // ファイル本体の削除/移動/リネームは Drive API 経由（google:drive:write）。スプレッドシート/ドキュメント/フォーム/スライドの
  // 「本体」削除もこれで行う（＝Driveファイルとしてゴミ箱へ）。削除は完全削除でなく trashed=true（復元可能）。
  "google.drive.trash": { perm: "google:drive:write", group: "drive", effect: "delete", plan: "pro", args: ["id"], desc: "google.drive.trash（ファイルをゴミ箱へ移動=削除・復元可能。id。スプレッドシート/ドキュメント/フォーム/スライドの本体削除もこれ）" },
  "google.drive.rename": { perm: "google:drive:write", group: "drive", effect: "write", plan: "pro", args: ["id", "name"], desc: "google.drive.rename（ファイル名を変更。id, name）" },
  "google.drive.move": { perm: "google:drive:write", group: "drive", effect: "write", plan: "pro", args: ["id", "addParents"], desc: "google.drive.move（フォルダ間で移動。id, addParents=移動先フォルダID, 任意 removeParents=元フォルダID）" }
};
const GOOGLE_OP_IDS = Object.keys(GOOGLE_OPS);
function isGoogleOp(op) {
  return op.startsWith("google.") && op in GOOGLE_OPS;
}
function validateGoogleStep(op, google) {
  if (google === void 0 || google === null || typeof google !== "object" || Array.isArray(google)) {
    return `${op} には引数オブジェクト google:{...} が必要です（例 google:{id:'$id'}）。`;
  }
  const g = google;
  const missing = GOOGLE_OPS[op].args.filter((k) => g[k] === void 0 || g[k] === null || g[k] === "");
  return missing.length ? `${op} には ${missing.join("・")} が必要です（google:{...} の中に指定）。` : null;
}
const enc = encodeURIComponent;
const TZ = "Asia/Tokyo";
const NEED = "Google 連携が未設定か、この機能の権限が未許可です。管理者に「設定 → Google連携」での連携・権限追加をご依頼ください。";
const asStr = (v) => v == null ? "" : String(v);
function asGrid(v) {
  if (Array.isArray(v) && v.every((r) => Array.isArray(r))) return v;
  if (Array.isArray(v)) return [v];
  return [];
}
function mimeSubject(s) {
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  return `=?UTF-8?B?${b64}?=`;
}
function b64urlBytes(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function runGoogleOp(google, op, a, dryRun) {
  const meta = GOOGLE_OPS[op];
  if (!meta) throw new Error(`未対応の Google op: ${op}`);
  if (dryRun && meta.effect !== "read") return "（動作確認：Google への書き込み/送信はスキップしました）";
  const g = (url, init) => google.fetch(url, init);
  switch (op) {
    // ── カレンダー ──
    case "google.calendar.list": {
      const u = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      u.searchParams.set("singleEvents", "true");
      u.searchParams.set("orderBy", "startTime");
      u.searchParams.set("maxResults", String(Math.min(Number(a.max) || 20, 50)));
      u.searchParams.set("timeMin", asStr(a.timeMin) || (/* @__PURE__ */ new Date(0)).toISOString());
      if (a.timeMax) u.searchParams.set("timeMax", asStr(a.timeMax));
      if (a.query) u.searchParams.set("q", asStr(a.query));
      const r = await g(u.toString());
      if (!r) return NEED;
      if (!r.ok) return googleApiError("カレンダー取得", r.status);
      const d = await r.json();
      const items = d.items ?? [];
      if (!items.length) return "該当する予定はありません。";
      return items.map((e) => `・${(e.start?.dateTime ?? e.start?.date ?? "?").replace("T", " ").slice(0, 16)} ${e.summary ?? "(無題)"}${e.hangoutLink ? `
  Meet: ${e.hangoutLink}` : ""}（id:${e.id}）`).join("\n");
    }
    case "google.calendar.create": {
      const body = { summary: asStr(a.title), description: a.description ? asStr(a.description) : void 0, start: { dateTime: asStr(a.start), timeZone: TZ }, end: { dateTime: asStr(a.end), timeZone: TZ } };
      const u = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      if (a.withMeet) {
        body.conferenceData = { createRequest: { requestId: `bo-${asStr(a.title).slice(0, 8)}-${asStr(a.start)}`, conferenceSolutionKey: { type: "hangoutsMeet" } } };
        u.searchParams.set("conferenceDataVersion", "1");
      }
      const r = await g(u.toString(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("予定作成", r.status);
      const e = await r.json();
      return `予定を作成しました：${e.summary ?? asStr(a.title)}${e.hangoutLink ? `
Meet: ${e.hangoutLink}` : ""}${e.htmlLink ? `
${e.htmlLink}` : ""}`;
    }
    case "google.calendar.update": {
      const body = {};
      if (a.title !== void 0) body.summary = asStr(a.title);
      if (a.description !== void 0) body.description = asStr(a.description);
      if (a.start) body.start = { dateTime: asStr(a.start), timeZone: TZ };
      if (a.end) body.end = { dateTime: asStr(a.end), timeZone: TZ };
      const r = await g(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${enc(asStr(a.eventId))}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("予定の更新", r.status);
      return "予定を更新しました。";
    }
    case "google.calendar.delete": {
      const r = await g(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${enc(asStr(a.eventId))}`, { method: "DELETE" });
      if (!r) return NEED;
      if (!r.ok && r.status !== 410) return googleApiError("予定の削除", r.status);
      return "予定を削除しました。";
    }
    // ── スプレッドシート ──
    case "google.sheets.read": {
      const r = await g(`https://sheets.googleapis.com/v4/spreadsheets/${enc(extractGoogleId(asStr(a.id)))}/values/${enc(asStr(a.range) || "A1:Z200")}`);
      if (!r) return NEED;
      if (!r.ok) return googleApiError("読み取り", r.status, "スプレッドシートIDと範囲をご確認ください。");
      const d = await r.json();
      const rows = d.values ?? [];
      return rows.length ? rows.map((row) => row.join("	")).join("\n") : "（データがありません）";
    }
    case "google.sheets.create": {
      const r = await g("https://sheets.googleapis.com/v4/spreadsheets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ properties: { title: asStr(a.title) } }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("作成", r.status);
      const d = await r.json();
      return `スプレッドシートを作成しました：${d.spreadsheetUrl ?? d.spreadsheetId}（id:${d.spreadsheetId}）`;
    }
    case "google.sheets.append": {
      const r = await g(`https://sheets.googleapis.com/v4/spreadsheets/${enc(extractGoogleId(asStr(a.id)))}/values/${enc(asStr(a.range) || "A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: asGrid(a.values) }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("追記", r.status);
      const d = await r.json();
      return `追記しました（${d.updates?.updatedRows ?? 0} 行）。`;
    }
    case "google.sheets.update": {
      const r = await g(`https://sheets.googleapis.com/v4/spreadsheets/${enc(extractGoogleId(asStr(a.id)))}/values/${enc(asStr(a.range))}?valueInputOption=USER_ENTERED`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: asGrid(a.values) }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("更新", r.status);
      const d = await r.json();
      return `更新しました（${d.updatedCells ?? 0} セル）。`;
    }
    case "google.sheets.deleteRows": {
      const requests = [{ deleteDimension: { range: { sheetId: Number(a.sheetId), dimension: "ROWS", startIndex: Number(a.startIndex), endIndex: Number(a.endIndex) } } }];
      const r = await g(`https://sheets.googleapis.com/v4/spreadsheets/${enc(extractGoogleId(asStr(a.id)))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("行の削除", r.status);
      return `行を削除しました（${Number(a.endIndex) - Number(a.startIndex)} 行）。`;
    }
    case "google.sheets.deleteTab": {
      const requests = [{ deleteSheet: { sheetId: Number(a.sheetId) } }];
      const r = await g(`https://sheets.googleapis.com/v4/spreadsheets/${enc(extractGoogleId(asStr(a.id)))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("シートの削除", r.status);
      return "シート（タブ）を削除しました。";
    }
    // ── ドキュメント ──
    case "google.docs.read": {
      const r = await g(`https://docs.googleapis.com/v1/documents/${enc(extractGoogleId(asStr(a.id)))}`);
      if (!r) return NEED;
      if (!r.ok) return googleApiError("読み取り", r.status, "ドキュメントIDをご確認ください。");
      const d = await r.json();
      const text = (d.body?.content ?? []).map((c) => (c.paragraph?.elements ?? []).map((e) => e.textRun?.content ?? "").join("")).join("").trim();
      return `【${d.title ?? "(無題)"}】
${text || "（本文は空です）"}`;
    }
    case "google.docs.create": {
      const r = await g("https://docs.googleapis.com/v1/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: asStr(a.title) }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("作成", r.status);
      const d = await r.json();
      if (a.body && d.documentId) {
        await g(`https://docs.googleapis.com/v1/documents/${enc(d.documentId)}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests: [{ insertText: { endOfSegmentLocation: {}, text: asStr(a.body).endsWith("\n") ? asStr(a.body) : asStr(a.body) + "\n" } }] }) });
      }
      return `ドキュメントを作成しました：https://docs.google.com/document/d/${d.documentId}/edit （id:${d.documentId}）`;
    }
    case "google.docs.append": {
      const text = asStr(a.text);
      const r = await g(`https://docs.googleapis.com/v1/documents/${enc(extractGoogleId(asStr(a.id)))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests: [{ insertText: { endOfSegmentLocation: {}, text: text.endsWith("\n") ? text : text + "\n" } }] }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("追記", r.status);
      return "ドキュメントに追記しました。";
    }
    case "google.docs.deleteRange": {
      const requests = [{ deleteContentRange: { range: { startIndex: Number(a.startIndex), endIndex: Number(a.endIndex) } } }];
      const r = await g(`https://docs.googleapis.com/v1/documents/${enc(extractGoogleId(asStr(a.id)))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("本文の削除", r.status);
      return "本文の指定範囲を削除しました。";
    }
    // ── スライド ──
    case "google.slides.read": {
      const r = await g(`https://slides.googleapis.com/v1/presentations/${enc(extractGoogleId(asStr(a.id)))}?fields=title,slides.pageElements.shape.text.textElements.textRun.content`);
      if (!r) return NEED;
      if (!r.ok) return googleApiError("読み取り", r.status, "プレゼンテーションIDをご確認ください。");
      const d = await r.json();
      const slides = d.slides ?? [];
      const lines = slides.map((s, i) => `スライド${i + 1}: ${(s.pageElements ?? []).flatMap((p) => (p.shape?.text?.textElements ?? []).map((t) => t.textRun?.content ?? "")).join("").trim() || "(テキストなし)"}`);
      return `【${d.title ?? "(無題)"}】全${slides.length}枚
${lines.join("\n")}`;
    }
    case "google.slides.create": {
      const r = await g("https://slides.googleapis.com/v1/presentations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: asStr(a.title) }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("作成", r.status);
      const d = await r.json();
      return `スライドを作成しました：https://docs.google.com/presentation/d/${d.presentationId}/edit （id:${d.presentationId}）`;
    }
    case "google.slides.add": {
      const slideId = `s_${enc(asStr(a.id)).slice(0, 6)}${asStr(a.text).length}`;
      const boxId = `t_${slideId}`;
      const requests = [
        { createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: "BLANK" } } },
        { createShape: { objectId: boxId, shapeType: "TEXT_BOX", elementProperties: { pageObjectId: slideId, size: { width: { magnitude: 6e6, unit: "EMU" }, height: { magnitude: 3e6, unit: "EMU" } }, transform: { scaleX: 1, scaleY: 1, translateX: 6e5, translateY: 6e5, unit: "EMU" } } } },
        { insertText: { objectId: boxId, text: asStr(a.text) } }
      ];
      const r = await g(`https://slides.googleapis.com/v1/presentations/${enc(extractGoogleId(asStr(a.id)))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("スライド追加", r.status);
      return "スライドを追加しました。";
    }
    case "google.slides.deleteSlide": {
      const requests = [{ deleteObject: { objectId: asStr(a.slideId) } }];
      const r = await g(`https://slides.googleapis.com/v1/presentations/${enc(extractGoogleId(asStr(a.id)))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("スライドの削除", r.status);
      return "スライドを削除しました。";
    }
    // ── フォーム ──
    case "google.forms.read": {
      const id = extractGoogleId(asStr(a.id));
      const r = await g(`https://forms.googleapis.com/v1/forms/${enc(id)}`);
      if (!r) return NEED;
      if (!r.ok) return r.status === 404 ? `フォームが見つかりません（404）。編集URL（.../forms/d/{ID}/edit）またはフォームIDを指定してください。` : googleApiError("フォーム取得", r.status);
      const d = await r.json();
      const title = d.info?.title ?? d.info?.documentTitle ?? "(無題)";
      const items = d.items ?? [];
      if (!items.length) return `フォーム「${title}」（id:${d.formId ?? id}）：設問はまだありません。`;
      const lines = items.map((it, i) => `${i + 1}. ${it.title ?? "(無題設問)"}${it.questionItem?.question?.required ? "（必須）" : ""}`);
      return `フォーム「${title}」（id:${d.formId ?? id}）
${lines.join("\n")}`;
    }
    case "google.forms.responses": {
      const r = await g(`https://forms.googleapis.com/v1/forms/${enc(extractGoogleId(asStr(a.id)))}/responses`);
      if (!r) return NEED;
      if (!r.ok) return googleApiError("回答取得", r.status);
      const d = await r.json();
      const responses = d.responses ?? [];
      if (!responses.length) return "回答はまだありません。";
      const lines = responses.slice(0, 30).map((resp, i) => `回答${i + 1}: ${Object.values(resp.answers ?? {}).map((x) => (x.textAnswers?.answers ?? []).map((v) => v.value).join(", ")).filter(Boolean).join(" / ")}`);
      return `全${responses.length}件
${lines.join("\n")}`;
    }
    case "google.forms.create": {
      const r = await g("https://forms.googleapis.com/v1/forms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ info: { title: asStr(a.title) } }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("作成", r.status);
      const d = await r.json();
      return `フォームを作成しました：${d.responderUri ?? `https://docs.google.com/forms/d/${d.formId}/edit`}（id:${d.formId}）`;
    }
    case "google.forms.addQuestion": {
      const type = asStr(a.qType);
      const options = Array.isArray(a.options) ? a.options.map(asStr) : [];
      const isChoice = (type === "choice" || type === "radio") && options.length > 0;
      const question = isChoice ? { required: !!a.required, choiceQuestion: { type: "RADIO", options: options.map((v) => ({ value: v })) } } : { required: !!a.required, textQuestion: { paragraph: type === "paragraph" } };
      const requests = [{ createItem: { item: { title: asStr(a.title), questionItem: { question } }, location: { index: 0 } } }];
      const r = await g(`https://forms.googleapis.com/v1/forms/${enc(extractGoogleId(asStr(a.id)))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("設問追加", r.status);
      return "設問を追加しました。";
    }
    case "google.forms.deleteQuestion": {
      const requests = [{ deleteItem: { location: { index: Number(a.index) } } }];
      const r = await g(`https://forms.googleapis.com/v1/forms/${enc(extractGoogleId(asStr(a.id)))}:batchUpdate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requests }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("設問の削除", r.status);
      return "設問を削除しました。";
    }
    // ── ToDo（Tasks） ──
    case "google.tasks.list": {
      const u = new URL("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks");
      u.searchParams.set("showCompleted", a.showCompleted ? "true" : "false");
      u.searchParams.set("maxResults", "50");
      const r = await g(u.toString());
      if (!r) return NEED;
      if (!r.ok) return googleApiError("ToDoの取得", r.status);
      const d = await r.json();
      const items = d.items ?? [];
      if (!items.length) return "ToDo はありません。";
      return items.map((t) => `・${t.status === "completed" ? "[完了] " : ""}${t.title ?? "(無題)"}${t.due ? `（期限 ${t.due.slice(0, 10)}）` : ""}（id:${t.id}）`).join("\n");
    }
    case "google.tasks.add": {
      const body = { title: asStr(a.title), notes: a.notes ? asStr(a.notes) : void 0 };
      if (a.due) body.due = /T/.test(asStr(a.due)) ? asStr(a.due) : `${asStr(a.due)}T00:00:00.000Z`;
      const r = await g("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("ToDoの追加", r.status);
      return `ToDo「${asStr(a.title)}」を追加しました。`;
    }
    case "google.tasks.complete": {
      const r = await g(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${enc(asStr(a.taskId))}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "completed" }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("ToDoの完了", r.status);
      return "ToDo を完了にしました。";
    }
    case "google.tasks.delete": {
      const r = await g(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${enc(asStr(a.taskId))}`, { method: "DELETE" });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("ToDoの削除", r.status);
      return "ToDo を削除しました。";
    }
    // ── 連絡先（People） ──
    case "google.contacts.search": {
      const u = new URL("https://people.googleapis.com/v1/people:searchContacts");
      u.searchParams.set("query", asStr(a.query));
      u.searchParams.set("readMask", "names,emailAddresses,phoneNumbers");
      u.searchParams.set("pageSize", "20");
      const r = await g(u.toString());
      if (!r) return NEED;
      if (!r.ok) return googleApiError("連絡先の検索", r.status);
      const d = await r.json();
      const people = (d.results ?? []).map((x) => x.person).filter(Boolean);
      if (!people.length) return "該当する連絡先はありません。";
      return people.map((p) => `・${p.names?.[0]?.displayName ?? "(名前なし)"}${p.emailAddresses?.[0]?.value ? ` / ${p.emailAddresses[0].value}` : ""}${p.phoneNumbers?.[0]?.value ? ` / ${p.phoneNumbers[0].value}` : ""}`).join("\n");
    }
    case "google.contacts.create": {
      const person = { names: [{ givenName: asStr(a.name) }], emailAddresses: a.email ? [{ value: asStr(a.email) }] : void 0, phoneNumbers: a.phone ? [{ value: asStr(a.phone) }] : void 0 };
      const r = await g("https://people.googleapis.com/v1/people:createContact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(person) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("連絡先の追加", r.status);
      return `連絡先「${asStr(a.name)}」を追加しました。`;
    }
    case "google.contacts.update": {
      const rn = asStr(a.resourceName);
      const cur = await g(`https://people.googleapis.com/v1/${rn}?personFields=names,emailAddresses,phoneNumbers`);
      if (!cur) return NEED;
      if (!cur.ok) return googleApiError("連絡先の取得", cur.status, "resourceName をご確認ください。");
      const person = await cur.json();
      const fields = [];
      const body = { etag: person.etag };
      if (a.name !== void 0) {
        body.names = [{ givenName: asStr(a.name) }];
        fields.push("names");
      }
      if (a.email !== void 0) {
        body.emailAddresses = [{ value: asStr(a.email) }];
        fields.push("emailAddresses");
      }
      if (a.phone !== void 0) {
        body.phoneNumbers = [{ value: asStr(a.phone) }];
        fields.push("phoneNumbers");
      }
      if (!fields.length) return "更新する項目（name/email/phone）が指定されていません。";
      const r = await g(`https://people.googleapis.com/v1/${rn}:updateContact?updatePersonFields=${fields.join(",")}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("連絡先の更新", r.status);
      return "連絡先を更新しました。";
    }
    case "google.contacts.delete": {
      const r = await g(`https://people.googleapis.com/v1/${asStr(a.resourceName)}:deleteContact`, { method: "DELETE" });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("連絡先の削除", r.status);
      return "連絡先を削除しました。";
    }
    // ── Gmail ──
    case "google.gmail.list": {
      const u = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      u.searchParams.set("maxResults", String(Math.min(Number(a.max) || 10, 25)));
      if (a.query) u.searchParams.set("q", asStr(a.query));
      else u.searchParams.set("labelIds", "INBOX");
      const r = await g(u.toString());
      if (!r) return NEED;
      if (!r.ok) return googleApiError("メール一覧の取得", r.status);
      const d = await r.json();
      const ids = (d.messages ?? []).map((m) => m.id).slice(0, 10);
      if (!ids.length) return "該当するメールはありません。";
      const lines = [];
      for (const id of ids) {
        const mr = await g(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${enc(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`);
        if (!mr || !mr.ok) continue;
        const m = await mr.json();
        const h = (n) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
        lines.push(`・${h("from")}｜${h("subject")}（id:${id}）`);
      }
      return lines.length ? lines.join("\n") : "該当するメールはありません。";
    }
    case "google.gmail.send": {
      const raw = `To: ${asStr(a.to)}\r
Subject: ${mimeSubject(asStr(a.subject))}\r
Content-Type: text/plain; charset="UTF-8"\r
\r
${asStr(a.body)}`;
      const r = await g("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ raw: b64urlBytes(new TextEncoder().encode(raw)) }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("メール送信", r.status);
      return `メールを送信しました（宛先 ${asStr(a.to)}）。`;
    }
    case "google.gmail.trash": {
      const r = await g(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${enc(asStr(a.id))}/trash`, { method: "POST" });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("メールの削除", r.status);
      return "メールをゴミ箱へ移動しました（復元可能）。";
    }
    case "google.gmail.archive": {
      const r = await g(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${enc(asStr(a.id))}/modify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ removeLabelIds: ["INBOX"] }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("アーカイブ", r.status);
      return "メールをアーカイブしました（受信トレイから外しました）。";
    }
    case "google.gmail.markRead": {
      const read = a.read !== false;
      const body = read ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] };
      const r = await g(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${enc(asStr(a.id))}/modify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("既読状態の変更", r.status);
      return read ? "既読にしました。" : "未読にしました。";
    }
    case "google.gmail.label": {
      const add = Array.isArray(a.add) ? a.add.map(asStr) : [];
      const remove = Array.isArray(a.remove) ? a.remove.map(asStr) : [];
      if (!add.length && !remove.length) return "付与/除去するラベル（add/remove）が指定されていません。";
      const r = await g(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${enc(asStr(a.id))}/modify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("ラベルの変更", r.status);
      return "ラベルを変更しました。";
    }
    // ── Meet ──
    case "google.meet.records": {
      const u = new URL("https://meet.googleapis.com/v2/conferenceRecords");
      u.searchParams.set("pageSize", String(Math.min(Number(a.max) || 10, 25)));
      const r = await g(u.toString());
      if (!r) return NEED;
      if (!r.ok) return googleApiError("会議記録の取得", r.status);
      const d = await r.json();
      const recs = d.conferenceRecords ?? [];
      if (!recs.length) return "会議記録はありません（Meet の文字起こしが有効な会議のみ取得できます）。";
      return recs.map((c) => `・[${c.name}] ${(c.startTime ?? "").slice(0, 16).replace("T", " ")}`).join("\n");
    }
    // ── ドライブ ──
    case "google.drive.search": {
      const u = new URL("https://www.googleapis.com/drive/v3/files");
      u.searchParams.set("q", `name contains '${asStr(a.query).replace(/'/g, "\\'")}' and trashed=false`);
      u.searchParams.set("pageSize", "20");
      u.searchParams.set("fields", "files(id,name,mimeType,modifiedTime)");
      const r = await g(u.toString());
      if (!r) return NEED;
      if (!r.ok) return googleApiError("ファイル検索", r.status);
      const d = await r.json();
      const files = d.files ?? [];
      if (!files.length) return "該当するファイルはありません。";
      return files.map((f) => `・${f.name ?? "(名称なし)"}（${f.mimeType ?? ""}・id:${f.id}）`).join("\n");
    }
    case "google.drive.read": {
      const id = extractGoogleId(asStr(a.id));
      const metaRes = await g(`https://www.googleapis.com/drive/v3/files/${enc(id)}?fields=name,mimeType`);
      if (!metaRes) return NEED;
      if (!metaRes.ok) return googleApiError("ファイル取得", metaRes.status, "ファイルIDをご確認ください。");
      const m = await metaRes.json();
      if ((m.mimeType ?? "").startsWith("application/vnd.google-apps")) {
        return `「${m.name ?? id}」は Google 形式（${m.mimeType}）です。本文は google.docs.read / google.sheets.read など各機能のopで読み取ってください。`;
      }
      const r = await g(`https://www.googleapis.com/drive/v3/files/${enc(id)}?alt=media`);
      if (!r) return NEED;
      if (!r.ok) return googleApiError("ファイル読み取り", r.status);
      const text = (await r.text()).slice(0, 1e5);
      return `【${m.name ?? id}】
${text}`;
    }
    case "google.drive.trash": {
      const r = await g(`https://www.googleapis.com/drive/v3/files/${enc(extractGoogleId(asStr(a.id)))}?fields=name`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ trashed: true }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("ファイルの削除", r.status, "ファイルIDをご確認ください。");
      const d = await r.json();
      return `「${d.name ?? asStr(a.id)}」をゴミ箱へ移動しました（復元可能）。`;
    }
    case "google.drive.rename": {
      const r = await g(`https://www.googleapis.com/drive/v3/files/${enc(extractGoogleId(asStr(a.id)))}?fields=name`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: asStr(a.name) }) });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("名前の変更", r.status);
      return `ファイル名を「${asStr(a.name)}」に変更しました。`;
    }
    case "google.drive.move": {
      const u = new URL(`https://www.googleapis.com/drive/v3/files/${enc(extractGoogleId(asStr(a.id)))}`);
      u.searchParams.set("addParents", asStr(a.addParents));
      if (a.removeParents) u.searchParams.set("removeParents", asStr(a.removeParents));
      u.searchParams.set("fields", "name");
      const r = await g(u.toString(), { method: "PATCH", headers: { "content-type": "application/json" }, body: "{}" });
      if (!r) return NEED;
      if (!r.ok) return googleApiError("ファイルの移動", r.status);
      return "ファイルを移動しました。";
    }
    default:
      throw new Error(`未対応の Google op: ${op}`);
  }
}
export {
  GOOGLE_OP_IDS as G,
  GOOGLE_OPS as a,
  extractGoogleId as e,
  isGoogleOp as i,
  runGoogleOp as r,
  validateGoogleStep as v
};
