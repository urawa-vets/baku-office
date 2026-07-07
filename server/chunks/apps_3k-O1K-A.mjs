globalThis.process ??= {};
globalThis.process.env ??= {};
import { e as enabledPartIds, r as registeredParts, s as setEnabledPartIds, a as scopeCtx } from "./parts_CYwgYHWx.mjs";
import { disabledBuiltins } from "./client_DbLECgB2.mjs";
const PERMISSIONS = [
  { id: "db:read", label: "データの読取（一覧・検索）" },
  { id: "db:write", label: "データの書込（登録・更新）", privileged: true },
  { id: "storage:read", label: "ファイル/KVの読取（アップロードされたファイルの読み込み等）" },
  { id: "storage:write", label: "ファイル/KVの書込（生成ファイルの保存等）", privileged: true },
  { id: "ai", label: "AI推論（要約・生成・分類）" },
  { id: "agent", label: "エージェント実行（自律処理・他ツール連携）" },
  { id: "members:read", label: "メンバー・名簿の参照", privileged: true },
  { id: "net", label: "外部送信（Gmail/カレンダー連携・外部送信。将来 allowlist 必須）", privileged: true },
  { id: "notify", label: "通知・メール送信（アプリ内通知／組織のGmailからメール送信）", privileged: true },
  // LINE/Discord/Slack 連携（message.send op／外部イベントトリガ）。宛先・トークンはサーバ側で解決しアプリJSには渡らない。
  { id: "messaging:send", label: "LINE/Discord/Slack への送信（連携済みチャンネルへメッセージ送信）", privileged: true },
  { id: "messaging:receive", label: "LINE/Discord/Slack からの受信（着信をアプリの画面に取り込む）", privileged: true },
  { id: "knowledge", label: "組織ナレッジの検索（社内文書を根拠にAIが回答・RAG）", privileged: true },
  // Google 連携をアプリのボタンから使うための細分化権限（google.* op）。実処理はサーバ側 googleFetch を通し、
  // アクセストークンはアプリHTML/JSに渡らない（安全境界）。read=Plus／write=Pro、書込/削除/送信は承認ゲート対象。
  { id: "google:calendar:read", label: "Google カレンダーの閲覧（予定の一覧）", privileged: true },
  { id: "google:calendar:write", label: "Google カレンダーの作成・編集・削除", privileged: true },
  { id: "google:sheets:read", label: "Google スプレッドシートの読取", privileged: true },
  { id: "google:sheets:write", label: "Google スプレッドシートの作成・追記・更新", privileged: true },
  { id: "google:docs:read", label: "Google ドキュメントの読取", privileged: true },
  { id: "google:docs:write", label: "Google ドキュメントの作成・追記", privileged: true },
  { id: "google:slides:read", label: "Google スライドの読取", privileged: true },
  { id: "google:slides:write", label: "Google スライドの作成・追加", privileged: true },
  { id: "google:forms:read", label: "Google フォームの読取・回答取得", privileged: true },
  { id: "google:forms:write", label: "Google フォームの作成・設問追加", privileged: true },
  { id: "google:tasks:read", label: "Google ToDo の閲覧", privileged: true },
  { id: "google:tasks:write", label: "Google ToDo の追加・完了", privileged: true },
  { id: "google:contacts:read", label: "Google 連絡先の検索", privileged: true },
  { id: "google:contacts:write", label: "Google 連絡先の追加", privileged: true },
  { id: "google:gmail:read", label: "Gmail の閲覧（一覧・検索）", privileged: true },
  { id: "google:gmail:send", label: "Gmail からのメール送信（常に承認）", privileged: true },
  { id: "google:gmail:modify", label: "Gmail の整理（削除=ゴミ箱・アーカイブ・既読化・ラベル変更）", privileged: true },
  { id: "google:meet:read", label: "Google Meet の会議記録の閲覧", privileged: true },
  { id: "google:drive:read", label: "Google ドライブのファイル検索・読取", privileged: true },
  { id: "google:drive:write", label: "Google ドライブのファイル削除・移動・名前変更", privileged: true }
];
const ALLOWED_PERMISSIONS = new Set(PERMISSIONS.map((p) => p.id));
const PRIVILEGED_PERMISSIONS = new Set(PERMISSIONS.filter((p) => "privileged" in p && p.privileged).map((p) => p.id));
const permissionCatalogText = (exclude = []) => PERMISSIONS.filter((p) => !exclude.includes(p.id)).map((p) => `${p.id}（${p.label}）`).join("、");
function appCatalog() {
  return registeredParts().map((p) => ({
    id: p.id,
    name: p.name,
    version: p.version,
    description: p.description,
    category: p.category,
    minPlan: p.minPlan,
    permissions: p.permissions ?? [],
    actions: (p.actions ?? []).map((a) => a.name)
  }));
}
const MANDATORY_APPS = ["chat"];
const DEFAULT_APPS = ["chat", "members", "accounting", "knowledge", "reminders", "memo"];
function defaultAppIds(known) {
  return DEFAULT_APPS.filter((id) => known.has(id));
}
async function installedAppIds(ctx) {
  const known = new Set(registeredParts().map((p) => p.id));
  const stored = await enabledPartIds(ctx);
  const ids = stored ?? defaultAppIds(known);
  for (const m of MANDATORY_APPS) if (known.has(m) && !ids.includes(m)) ids.push(m);
  const disabled = new Set((await disabledBuiltins(ctx.env)).filter((id) => !MANDATORY_APPS.includes(id)));
  return ids.filter((id) => known.has(id) && !disabled.has(id));
}
async function installApp(ctx, id) {
  const base = await enabledPartIds(ctx) ?? defaultAppIds(new Set(registeredParts().map((p) => p.id)));
  return setEnabledPartIds(ctx, base.includes(id) ? base : [...base, id]);
}
async function uninstallApp(ctx, id) {
  if (MANDATORY_APPS.includes(id)) throw new Error("このアプリは必須のため削除できません。");
  const base = await enabledPartIds(ctx) ?? defaultAppIds(new Set(registeredParts().map((p) => p.id)));
  return setEnabledPartIds(ctx, base.filter((x) => x !== id));
}
function makeAppsApi(ctx) {
  return {
    list: () => registeredParts().map((p) => ({ id: p.id, name: p.name, actions: (p.actions ?? []).map((a) => a.name) })),
    call: async (appId, action, args = {}, caller) => {
      const app = registeredParts().find((p) => p.id === appId);
      if (!app) throw new Error(`アプリが見つかりません: ${appId}`);
      const act = (app.actions ?? []).find((a) => a.name === action);
      if (!act) throw new Error(`操作が見つかりません: ${appId}.${action}`);
      if (act.requiredPermission && caller) {
        const callerApp = registeredParts().find((p) => p.id === caller);
        const granted = callerApp?.permissions ?? [];
        if (!granted.includes(act.requiredPermission)) throw new Error(`権限がありません: ${caller} は ${act.requiredPermission} を保有していません`);
      }
      return act.run(scopeCtx(ctx, app.permissions), args, caller);
    }
  };
}
export {
  ALLOWED_PERMISSIONS,
  DEFAULT_APPS,
  MANDATORY_APPS,
  PERMISSIONS,
  PRIVILEGED_PERMISSIONS,
  appCatalog,
  installApp,
  installedAppIds,
  makeAppsApi,
  permissionCatalogText,
  uninstallApp
};
