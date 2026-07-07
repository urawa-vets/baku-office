globalThis.process ??= {};
globalThis.process.env ??= {};
import { env } from "cloudflare:workers";
import { getSession } from "./auth_CKZlflBM.mjs";
import { r as resolveDrainKey } from "./cron-auth_D7uTBWQd.mjs";
const prerender = false;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
const GET = async ({ request }) => {
  const ses = await getSession(env, request).catch(() => null);
  let authed = !!(ses && ses.role === "admin");
  if (!authed) {
    const key = await resolveDrainKey(env);
    authed = !!key && request.headers.get("x-internal-key") === key;
  }
  if (!authed) return json({ error: "管理者セッション、または x-internal-key（drainKey）が必要です" }, 403);
  const doNs = env.BUILD_DO;
  if (!doNs) return json({ ok: false, bound: false, error: "BUILD_DO バインディングがありません（DO 未プロビジョニング＝Gate-1 未達、または wrangler に durable_objects 未設定）。" });
  const buildId = "poc-" + Date.now().toString(36);
  try {
    const stub = doNs.get(doNs.idFromName(buildId));
    const r = await stub.fetch(new Request("https://internal/kick", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ buildId }) }));
    return json({ ok: r.ok, bound: true, buildId, note: `BuildDO を kick しました。数秒後に /diagnostics で 'PoC tick #0..4'（build_id=${buildId}）を確認してください（アラーム連鎖・astro.fetch 直呼びの実証）。` });
  } catch (e) {
    return json({ ok: false, bound: true, buildId, error: String(e?.message ?? e) });
  }
};
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page
};
