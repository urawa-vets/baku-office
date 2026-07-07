globalThis.process ??= {};
globalThis.process.env ??= {};
import { getSession } from "./auth_CKZlflBM.mjs";
import { cachedEntitlement } from "./client_DbLECgB2.mjs";
import { simulateImport, runImport } from "./import_HOZlQbGk.mjs";
import "./stripe_r-RFTlbb.mjs";
import { a as atLeast } from "./types_BVJxqWI9.mjs";
import { env } from "cloudflare:workers";
const prerender = false;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
const POST = async ({ request, locals }) => {
  const ses = await getSession(env, request);
  if (!ses || ses.role !== "admin") return json({ error: "管理者のみ" }, 403);
  if (!atLeast(await cachedEntitlement(env), "plus")) return json({ error: "インポートは Plus 以上で利用できます" }, 403);
  const b = await request.json().catch(() => ({}));
  const source = b.source === "notion" ? "notion" : "drive";
  const withFiles = !!b.withFiles;
  if (b._action === "simulate") return json(await simulateImport(env, source, withFiles));
  if (b._action === "run") return json(await runImport(env, source, withFiles));
  return json({ error: "不明な操作" }, 400);
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
