globalThis.process ??= {};
globalThis.process.env ??= {};
import { env } from "cloudflare:workers";
import { r as resolveDrainKey } from "./cron-auth_D7uTBWQd.mjs";
import { logBuild } from "./diag_CsI0yNfw.mjs";
const prerender = false;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
const POST = async ({ request }) => {
  const key = await resolveDrainKey(env);
  const got = request.headers.get("x-internal-key");
  if (!key || got !== key) return json({ error: "unauthorized" }, 401);
  const b = await request.json().catch(() => ({}));
  const buildId = String(b.buildId ?? "poc");
  const tick = Number.isFinite(b.tick) ? Number(b.tick) : 0;
  const MAX_POC_TICKS = 5;
  await logBuild(env, buildId, `PoC tick #${tick}`, `astro.fetch in-process 直呼び経由（1042非該当の実証）`);
  const more = tick + 1 < MAX_POC_TICKS;
  return json({ ok: true, more, tick: tick + 1, buildId });
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
