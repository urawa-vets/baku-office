globalThis.process ??= {};
globalThis.process.env ??= {};
import { getSession } from "./auth_CKZlflBM.mjs";
import { submitFeedback } from "./reports_D2gzdfLq.mjs";
import { env } from "cloudflare:workers";
const prerender = false;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
const POST = async ({ request, locals }) => {
  const ses = await getSession(env, request);
  if (!ses) return json({ error: "ログインが必要です" }, 401);
  const ctx = locals.ctx;
  const b = await request.json().catch(() => ({}));
  let context = b.context ? String(b.context).slice(0, 3500) : "";
  let category = "feedback";
  let title = b.title?.slice(0, 120);
  if (b.sessionId) {
    category = "chat-report";
    const { ownedSession, getMessages } = await import("./chat-sessions_qgxfbXK9.mjs").then((n) => n.k);
    const owned = await ownedSession(ctx, ses.uid, String(b.sessionId)).catch(() => null);
    if (owned) {
      const msgs = await getMessages(ctx, String(b.sessionId)).catch(() => []);
      const hist = msgs.map((m) => `【${m.role === "assistant" ? "AI" : "利用者"}】${String(m.content).replace(/\s+/g, " ").slice(0, 400)}`).join("\n").slice(0, 3200);
      context = hist + (context ? `
---
${context}` : "");
    }
    title = title ?? "AIチャットの報告";
  } else if (b.source) {
    category = "chat-report";
    title = title ?? `${String(b.source).slice(0, 40)}の報告`;
  }
  const message = String(b.message ?? "").trim() || (b.sessionId || b.source ? "（会話内容の報告）" : "");
  const src = b.source ? `[${String(b.source).slice(0, 40)}] ` : "";
  const r = await submitFeedback(env, { title, message, context: (src + context).slice(0, 3500), category });
  if (!r.ok) return json({ error: r.error }, 400);
  return json({ ok: true });
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
