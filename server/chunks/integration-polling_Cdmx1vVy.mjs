globalThis.process ??= {};
globalThis.process.env ??= {};
import { a as runInstalledApp } from "./app-runtime_Cm6I_60l.mjs";
import { claimEventRun, endEventRun, listTriggeredApps } from "./app-events_q-uJflQt.mjs";
import { a as activeAppDefinition } from "./external-apps_CoOdU2nO.mjs";
import { googleFetch } from "./google_Wg8wFnLQ.mjs";
const MAX_ITEMS_PER_TRIGGER = 5;
function buildGoogleInputs(t, item) {
  const inputs = {};
  for (const [inputName, valueKey] of Object.entries(t.inputMap ?? {})) {
    if (valueKey in item.values) inputs[inputName] = item.values[valueKey];
  }
  return inputs;
}
async function getCursor(ctx, appId, triggerId) {
  const r = await ctx.db.first("SELECT cursor FROM app_event_cursors WHERE app_id=? AND trigger_id=?", [appId, triggerId]).catch(() => null);
  return r?.cursor ?? null;
}
async function setCursor(ctx, appId, triggerId, cursor) {
  await ctx.db.run(
    "INSERT INTO app_event_cursors (app_id,trigger_id,cursor,updated_at) VALUES (?,?,?,strftime('%s','now')) ON CONFLICT(app_id,trigger_id) DO UPDATE SET cursor=excluded.cursor, updated_at=excluded.updated_at",
    [appId, triggerId, cursor]
  ).catch(() => {
  });
}
async function pollGoogleTrigger(env, ctx, appId, t, opts) {
  const poller = opts?.poller ?? SERVICE_POLLERS[t.service];
  if (!poller) return 0;
  const cursor = await getCursor(ctx, appId, t.id);
  const { items, cursor: next } = await poller(env, t, cursor, MAX_ITEMS_PER_TRIGGER);
  let ran = 0;
  for (const item of items) {
    const key = `${t.service}:${item.eventKey}`;
    if (!await claimEventRun(ctx, appId, t.id, "google", key)) continue;
    try {
      const res = await runInstalledApp(ctx, appId, buildGoogleInputs(t, item), "org", t.screenId, void 0);
      await endEventRun(ctx, appId, t.id, key, res.ok ? "ok" : "failed", res.ok ? void 0 : res.error ?? "run failed");
      ran++;
    } catch (e) {
      await endEventRun(ctx, appId, t.id, key, "failed", e.message ?? String(e));
    }
  }
  if (next && next !== cursor) await setCursor(ctx, appId, t.id, next);
  return ran;
}
async function retryTrigger(env, ctx, appId, triggerId) {
  const failed = await ctx.db.all("SELECT id FROM app_event_runs WHERE app_id=? AND trigger_id=? AND status='failed'", [appId, triggerId]).catch(() => []);
  await ctx.db.run("DELETE FROM app_event_runs WHERE app_id=? AND trigger_id=? AND status='failed'", [appId, triggerId]).catch(() => {
  });
  const def = (await activeAppDefinition(ctx, appId).catch(() => null))?.definition;
  const t = def?.triggers?.find((x) => x.id === triggerId);
  let retried = 0;
  if (t && t.source === "google") retried = await pollGoogleTrigger(env, ctx, appId, t).catch(() => 0);
  return { cleared: failed.length, retried };
}
async function pollAppTriggers(env, ctx, opts) {
  const apps = await listTriggeredApps(ctx);
  let total = 0;
  for (const { appId, def } of apps) {
    for (const t of def.triggers ?? []) {
      if (t.source !== "google") continue;
      total += await pollGoogleTrigger(env, ctx, appId, t, opts).catch(() => 0);
    }
  }
  return total;
}
async function pollGmail(env, t, cursor, max) {
  const q = [t.query ?? "", cursor ? `after:${cursor}` : "newer_than:7d"].filter(Boolean).join(" ");
  const u = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  u.searchParams.set("q", q);
  u.searchParams.set("maxResults", String(max));
  const r = await googleFetch(env, u.toString());
  if (!r || !r.ok) return { items: [], cursor };
  const d = await r.json();
  const ids = (d.messages ?? []).map((m) => m.id).slice(0, max);
  const items = [];
  let maxDate = cursor ? Number(cursor) || 0 : 0;
  for (const id of ids) {
    const mr = await googleFetch(env, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`);
    if (!mr || !mr.ok) continue;
    const m = await mr.json();
    const h = (n) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
    const dateSec = m.internalDate ? Math.floor(Number(m.internalDate) / 1e3) : 0;
    if (dateSec > maxDate) maxDate = dateSec;
    items.push({ eventKey: id, values: { messageId: id, subject: h("subject"), from: h("from"), snippet: m.snippet ?? "" } });
  }
  return { items, cursor: maxDate ? String(maxDate + 1) : cursor };
}
async function pollForms(env, t, cursor, max) {
  const formId = t.resource;
  if (!formId) return { items: [], cursor };
  const u = new URL(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses`);
  if (cursor) u.searchParams.set("filter", `timestamp > ${cursor}`);
  u.searchParams.set("pageSize", String(max));
  const r = await googleFetch(env, u.toString());
  if (!r || !r.ok) return { items: [], cursor };
  const d = await r.json();
  const responses = (d.responses ?? []).slice(0, max);
  let cur = cursor;
  const items = responses.map((rp) => {
    if (rp.lastSubmittedTime && (!cur || rp.lastSubmittedTime > cur)) cur = rp.lastSubmittedTime;
    return { eventKey: rp.responseId, values: { responseId: rp.responseId, submittedAt: rp.lastSubmittedTime ?? "", answers: JSON.stringify(rp.answers ?? {}) } };
  });
  return { items, cursor: cur };
}
async function pollDrive(env, t, cursor, max) {
  const q = [t.query ?? "trashed=false", cursor ? `modifiedTime > '${cursor}'` : ""].filter(Boolean).join(" and ");
  const u = new URL("https://www.googleapis.com/drive/v3/files");
  u.searchParams.set("q", q);
  u.searchParams.set("orderBy", "modifiedTime");
  u.searchParams.set("pageSize", String(max));
  u.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,webViewLink)");
  const r = await googleFetch(env, u.toString());
  if (!r || !r.ok) return { items: [], cursor };
  const d = await r.json();
  const files = d.files ?? [];
  const items = files.map((f) => ({ eventKey: `${f.id}:${f.modifiedTime}`, values: { fileId: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime, link: f.webViewLink ?? "" } }));
  return { items, cursor: files.length ? files[files.length - 1].modifiedTime : cursor };
}
async function pollCalendar(env, t, cursor, max) {
  const u = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  u.searchParams.set("updatedMin", cursor ?? new Date(Date.now() - 7 * 864e5).toISOString());
  u.searchParams.set("orderBy", "updated");
  u.searchParams.set("singleEvents", "true");
  u.searchParams.set("maxResults", String(max));
  const r = await googleFetch(env, u.toString());
  if (!r || !r.ok) return { items: [], cursor };
  const d = await r.json();
  const evs = (d.items ?? []).slice(0, max);
  let cur = cursor;
  const items = evs.map((e) => {
    if (e.updated && (!cur || e.updated > cur)) cur = e.updated;
    return { eventKey: `${e.id}:${e.updated ?? ""}`, values: { eventId: e.id, summary: e.summary ?? "", start: e.start?.dateTime ?? e.start?.date ?? "", updated: e.updated ?? "" } };
  });
  return { items, cursor: cur };
}
async function pollSheets(env, t, cursor, max) {
  const id = t.resource;
  if (!id) return { items: [], cursor };
  const range = t.query ?? "A1:Z1000";
  const u = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}`);
  const r = await googleFetch(env, u.toString());
  if (!r || !r.ok) return { items: [], cursor };
  const d = await r.json();
  const rows = d.values ?? [];
  const start = cursor ? Number(cursor) || 0 : 0;
  const fresh = rows.slice(start, start + max);
  const items = fresh.map((row, i) => {
    const values = { rowIndex: start + i, cells: JSON.stringify(row) };
    row.forEach((c, ci) => {
      values[`col${ci}`] = c;
    });
    return { eventKey: `${id}:${range}:${start + i}`, values };
  });
  return { items, cursor: String(start + fresh.length) };
}
const SERVICE_POLLERS = {
  gmail: pollGmail,
  forms: pollForms,
  drive: pollDrive,
  calendar: pollCalendar,
  sheets: pollSheets
};
export {
  buildGoogleInputs,
  pollAppTriggers,
  pollGoogleTrigger,
  retryTrigger
};
