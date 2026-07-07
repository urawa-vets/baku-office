globalThis.process ??= {};
globalThis.process.env ??= {};
import { kvPut } from "./kv_Bpi6S22S.mjs";
import { saveApiKey, getApiKey, deleteApiKey } from "./client_DbLECgB2.mjs";
import { n as nowSec } from "./accounting_D4tRmfws.mjs";
import { clearServiceAccount, serviceAccountConfigured, serviceAccountAccessToken } from "./google-sa_CQhkCQaQ.mjs";
const SCOPE_GROUPS = {
  calendar: {
    label: "カレンダー（予定の閲覧・作成・編集・削除）",
    risk: "予定の作成・削除・編集ができます。",
    restricted: false,
    scopes: ["https://www.googleapis.com/auth/calendar.events"]
  },
  gmail_read: {
    // 本アプリの Gmail 操作は一覧/取得/添付取得（読取）のみ＝readonly で足りる。
    // 旧 gmail.modify からスコープを縮小（最小権限・Google審査の軽量化・P1-1）。
    label: "Gmail 閲覧（読み取りのみ）",
    risk: "メール本文・添付・メタデータを読み取れます（変更・削除・送信はしません）。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"]
  },
  gmail_send: {
    label: "Gmail 送信",
    risk: "あなたのアカウントからメールを送信できます。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/gmail.send"]
  },
  gmail_modify: {
    label: "Gmail 整理（削除・アーカイブ・既読化・ラベル変更）",
    // gmail.modify は削除（ゴミ箱へ移動）・ラベル操作・既読/未読の変更を許可する Restricted scope。
    // 完全削除（mail.google.com）は付与しない＝取り消し可能なゴミ箱移動までに留める（最小権限・安全側）。
    risk: "メールをゴミ箱へ移動・アーカイブ・既読化・ラベル変更できます（完全削除はしません＝ゴミ箱から復元可能）。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/gmail.modify"]
  },
  meet: {
    label: "Meet 会議スペース・会議記録",
    risk: "会議スペースの作成・参照、会議記録（トランスクリプト）の取得ができます。",
    restricted: false,
    scopes: ["https://www.googleapis.com/auth/meetings.space.created", "https://www.googleapis.com/auth/meetings.space.readonly"]
  },
  drive: {
    label: "ドライブ（読み取り・作成＋削除・移動・リネーム）",
    // full drive スコープ＝ドライブ内の任意ファイルの読取・作成・削除（ゴミ箱移動）・移動・リネームを許可する。
    // 影響が大きい（AI/アプリが任意ファイルを操作しうる）ため Restricted・管理者承認・承認ゲートで統制する。
    // 削除は完全削除でなくゴミ箱移動（trashed=true・復元可能）を既定にする（安全側）。
    risk: "ドライブ内のファイルの読み取り・作成に加え、削除（ゴミ箱へ移動）・移動・名前変更ができます（削除はゴミ箱から復元可能）。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/drive"]
  },
  sheets: {
    label: "スプレッドシート（閲覧・編集）",
    risk: "スプレッドシートの読み取り・作成・編集（追記・更新）ができます。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  },
  docs: {
    label: "ドキュメント（閲覧・編集）",
    risk: "ドキュメントの読み取り・作成・追記ができます。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/documents"]
  },
  slides: {
    label: "スライド（閲覧・編集）",
    risk: "スライドの読み取り・作成・スライド追加ができます。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/presentations"]
  },
  forms: {
    label: "フォーム（作成・回答取得）",
    risk: "フォームの作成・設問追加と、回答の取得ができます。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/forms.body", "https://www.googleapis.com/auth/forms.responses.readonly"]
  },
  contacts: {
    label: "連絡先（検索・追加）",
    risk: "連絡先の検索・追加ができます。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/contacts"]
  },
  tasks: {
    label: "ToDo（閲覧・追加・完了）",
    risk: "Google ToDo リストの閲覧・追加・完了ができます。",
    restricted: true,
    scopes: ["https://www.googleapis.com/auth/tasks"]
  }
};
const ALL_GROUPS = Object.keys(SCOPE_GROUPS);
const DEFAULT_GROUPS = ALL_GROUPS.filter((g) => !SCOPE_GROUPS[g].restricted);
const REFRESH_KEY = "google_refresh";
async function clientId(env) {
  return env.GOOGLE_CLIENT_ID ?? await getApiKey(env, "google_client_id");
}
async function clientSecret(env) {
  return env.GOOGLE_CLIENT_SECRET ?? await getApiKey(env, "google_client_secret");
}
const SCOPES_KEY = "google_scopes";
const LAST_USED_KEY = "google_last_used";
const CONNECTED_KEY = "google_connected_at";
const REFRESH_FAIL_KEY = "google_refresh_fail";
function normalizeGroups(groups) {
  const valid = (groups ?? []).filter((g) => g in SCOPE_GROUPS);
  return valid.length ? Array.from(new Set(valid)) : DEFAULT_GROUPS;
}
function scopesFor(groups) {
  return Array.from(new Set(groups.flatMap((g) => SCOPE_GROUPS[g].scopes))).join(" ");
}
function groupsFromScopeString(scope) {
  if (!scope) return [];
  const granted = new Set(scope.split(/\s+/).filter(Boolean));
  return ALL_GROUPS.filter((g) => SCOPE_GROUPS[g].scopes.every((s) => granted.has(s)));
}
async function googleConfigured(env) {
  if (await serviceAccountConfigured(env)) return true;
  return !!await clientId(env) && !!await clientSecret(env);
}
async function grantedScopeString(env) {
  const groups = await grantedGroups(env);
  return scopesFor(groups.length ? groups : DEFAULT_GROUPS);
}
async function setGoogleGroups(env, groups) {
  await kvPut(env, SCOPES_KEY, JSON.stringify(normalizeGroups(groups)));
  await kvPut(env, CONNECTED_KEY, String(nowSec()));
}
function redirectUri(origin) {
  return `${origin}/api/google/callback`;
}
async function googleAuthUrl(env, origin, state, groups) {
  const cid = await clientId(env);
  if (!cid) return null;
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", cid);
  u.searchParams.set("redirect_uri", redirectUri(origin));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", scopesFor(normalizeGroups(groups)));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  u.searchParams.set("state", state);
  return u.toString();
}
async function grantedGroups(env) {
  try {
    const arr = JSON.parse(await env.LICENSE.get(SCOPES_KEY) ?? "[]");
    return (Array.isArray(arr) ? arr : []).filter((g) => g in SCOPE_GROUPS);
  } catch {
    return [];
  }
}
async function exchangeGoogleCode(env, origin, code, groups) {
  const cid = await clientId(env);
  const cs = await clientSecret(env);
  if (!cid || !cs) return false;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri(origin), client_id: cid, client_secret: cs })
  });
  if (!r.ok) {
    console.log("[google-token]", r.status, (await r.text()).slice(0, 200));
    return false;
  }
  const t = await r.json();
  if (!t.refresh_token) return false;
  await saveApiKey(env, REFRESH_KEY, t.refresh_token);
  const fromResp = groupsFromScopeString(t.scope);
  const merged = Array.from(new Set(
    t.scope ? [...await grantedGroups(env), ...fromResp] : [...await grantedGroups(env), ...normalizeGroups(groups)]
  ));
  await kvPut(env, SCOPES_KEY, JSON.stringify(merged));
  await kvPut(env, CONNECTED_KEY, String(nowSec()));
  await env.LICENSE.delete(REFRESH_FAIL_KEY).catch(() => {
  });
  return true;
}
async function googleConnected(env) {
  return !!await getApiKey(env, REFRESH_KEY);
}
async function googleStatus(env) {
  const sa = await serviceAccountConfigured(env);
  const oauth = await googleConnected(env);
  const connected = sa || oauth;
  const num = async (k) => {
    const v = Number(await env.LICENSE.get(k));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  return { connected, mode: sa ? "sa" : oauth ? "oauth" : null, groups: connected ? await grantedGroups(env) : [], lastUsed: await num(LAST_USED_KEY), connectedAt: await num(CONNECTED_KEY), reauthFailedAt: oauth ? await num(REFRESH_FAIL_KEY) : null };
}
async function disconnectGoogle(env) {
  const refresh = await getApiKey(env, REFRESH_KEY);
  if (refresh) {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refresh })
    }).catch(() => {
    });
  }
  await deleteApiKey(env, REFRESH_KEY);
  await clearServiceAccount(env);
  await env.LICENSE.delete(SCOPES_KEY);
  await env.LICENSE.delete(LAST_USED_KEY);
  await env.LICENSE.delete(CONNECTED_KEY);
  await env.LICENSE.delete(REFRESH_FAIL_KEY);
}
async function googleAccessToken(env) {
  if (await serviceAccountConfigured(env)) {
    const token = await serviceAccountAccessToken(env, await grantedScopeString(env));
    if (token) await kvPut(env, LAST_USED_KEY, String(nowSec()));
    return token;
  }
  const refresh = await getApiKey(env, REFRESH_KEY);
  const cid = await clientId(env);
  const cs = await clientSecret(env);
  if (!refresh || !cid || !cs) return null;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh, client_id: cid, client_secret: cs })
  });
  if (!r.ok) {
    await kvPut(env, REFRESH_FAIL_KEY, String(nowSec())).catch(() => {
    });
    return null;
  }
  await env.LICENSE.delete(REFRESH_FAIL_KEY).catch(() => {
  });
  await kvPut(env, LAST_USED_KEY, String(nowSec()));
  return (await r.json()).access_token ?? null;
}
async function googleFetch(env, url, init) {
  const token = await googleAccessToken(env);
  if (!token) return null;
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
export {
  SCOPE_GROUPS,
  disconnectGoogle,
  exchangeGoogleCode,
  googleAccessToken,
  googleAuthUrl,
  googleConfigured,
  googleConnected,
  googleFetch,
  googleStatus,
  grantedScopeString,
  groupsFromScopeString,
  normalizeGroups,
  setGoogleGroups
};
