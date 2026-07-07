globalThis.process ??= {};
globalThis.process.env ??= {};
import { SCOPE_GROUPS, googleFetch } from "./google_Wg8wFnLQ.mjs";
const PROBE_ID = "baku-office-probe-nonexistent";
const PROBE_URL = {
  calendar: "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1",
  // calendar.events スコープで 200
  gmail_read: "https://gmail.googleapis.com/gmail/v1/users/me/profile",
  // gmail.readonly で 200（未有効なら 403 SERVICE_DISABLED）
  gmail_send: "https://gmail.googleapis.com/gmail/v1/users/me/profile",
  gmail_modify: "https://gmail.googleapis.com/gmail/v1/users/me/profile",
  meet: "https://meet.googleapis.com/v2/conferenceRecords?pageSize=1",
  drive: `https://www.googleapis.com/drive/v3/files/${PROBE_ID}?fields=id`,
  sheets: `https://sheets.googleapis.com/v4/spreadsheets/${PROBE_ID}`,
  docs: `https://docs.googleapis.com/v1/documents/${PROBE_ID}`,
  slides: `https://slides.googleapis.com/v1/presentations/${PROBE_ID}`,
  forms: `https://forms.googleapis.com/v1/forms/${PROBE_ID}`,
  // people/me（自分のプロフィール取得）は profile スコープが必要で contacts スコープでは 403＝権限不足に誤判定する。
  // 連絡先一覧（connections.list）は contacts スコープで 200＝正しく判定できる（未有効なら 403 SERVICE_DISABLED）。
  contacts: "https://people.googleapis.com/v1/people/me/connections?personFields=names&pageSize=1",
  tasks: "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1"
};
const DISABLED_RE = /SERVICE_DISABLED|accessNotConfigured|has not been used in project|it is disabled|API has not been used/i;
async function probeOne(env, group) {
  let r = await googleFetch(env, PROBE_URL[group]).catch(() => null);
  if (r && r.status >= 500) {
    await new Promise((res) => setTimeout(res, 900));
    r = await googleFetch(env, PROBE_URL[group]).catch(() => null);
  }
  if (!r) return { state: "unauth", status: 0 };
  if (r.ok || r.status === 404) return { state: "enabled", status: r.status };
  const body = await r.text().catch(() => "");
  if (r.status === 403 && DISABLED_RE.test(body)) return { state: "disabled", status: 403 };
  if (r.status === 401 || r.status === 403) return { state: "scope", status: r.status };
  return { state: "error", status: r.status };
}
async function probeGoogleApis(env) {
  const groups = Object.keys(SCOPE_GROUPS);
  const entries = await Promise.all(groups.map(async (g) => [g, await probeOne(env, g)]));
  return Object.fromEntries(entries);
}
export {
  probeGoogleApis
};
