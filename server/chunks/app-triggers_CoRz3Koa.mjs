globalThis.process ??= {};
globalThis.process.env ??= {};
import { requireOrgAdmin } from "./auth_CKZlflBM.mjs";
import { env } from "cloudflare:workers";
import { appTriggerStatus } from "./app-events_q-uJflQt.mjs";
import { retryTrigger } from "./integration-polling_Cdmx1vVy.mjs";
const prerender = false;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
const GET = async ({ request, locals }) => {
  if (!await requireOrgAdmin(env, request)) return json({ error: "管理者のみ" }, 403);
  const appId = (new URL(request.url).searchParams.get("appId") ?? "").trim();
  if (!appId) return json({ error: "appId が必要です。" }, 400);
  return json({ triggers: await appTriggerStatus(locals.ctx, appId) });
};
const POST = async ({ request, locals }) => {
  if (!await requireOrgAdmin(env, request)) return json({ error: "管理者のみ" }, 403);
  const b = await request.json().catch(() => ({}));
  if (b.op === "retry") {
    const appId = (b.appId ?? "").trim();
    const triggerId = (b.triggerId ?? "").trim();
    if (!appId || !triggerId) return json({ error: "appId・triggerId が必要です。" }, 400);
    return json({ ok: true, ...await retryTrigger(env, locals.ctx, appId, triggerId) });
  }
  return json({ error: "未対応の操作です。" }, 400);
};
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page
};
