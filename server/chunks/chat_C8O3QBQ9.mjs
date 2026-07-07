globalThis.process ??= {};
globalThis.process.env ??= {};
import { getSession } from "./auth_CKZlflBM.mjs";
import { cachedEntitlement } from "./client_DbLECgB2.mjs";
import "./stripe_r-RFTlbb.mjs";
import { a as atLeast } from "./types_BVJxqWI9.mjs";
import { o as ownedSession, c as createSession, g as getMessages, a as appendMessage, e as ensureTitle, t as toTurns } from "./chat-sessions_qgxfbXK9.mjs";
import { detectInlineModel, parseRequestModel } from "./settings_DI_y7gTJ.mjs";
import { env } from "cloudflare:workers";
const prerender = false;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });
const POST = async ({ request, locals }) => {
  const ctx = locals.ctx;
  const ses = await getSession(env, request);
  if (!ses) return json({ error: "ログインが必要" }, 401);
  if (!atLeast(await cachedEntitlement(env), "plus")) return json({ error: "AIチャットは Plus 以上のプランで利用できます" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > 16 * 1024 * 1024) return json({ error: "リクエストが大きすぎます（添付は8MBまでです）。" }, 413);
  const b = await request.json().catch(() => ({}));
  const message = (b.message ?? "").trim();
  if (!message && !b.image?.dataB64 && !b.attachments?.length) return json({ error: "メッセージが必要" }, 400);
  const inlineModel = detectInlineModel(message);
  const uiSel = parseRequestModel(String(b.model ?? ""));
  const model = inlineModel.engine ?? uiSel.engine;
  const modelId = inlineModel.engine ? void 0 : uiSel.modelId;
  let prompt = (inlineModel.engine ? inlineModel.stripped : message) || "(添付ファイルを確認してください)";
  const visionAttachments = [];
  const inboundFiles = [...b.image ? [b.image] : [], ...b.attachments ?? []].slice(0, 8);
  if (inboundFiles.length) {
    const { prepareAttachment } = await import("./chat-flow_TDYHyfj8.mjs");
    for (const f of inboundFiles) {
      const att = await prepareAttachment(f, ses.uid, ses.ctx);
      if (!att.ok) return json({ error: att.error }, att.status);
      prompt = `${prompt}${att.promptAdd}`;
      if (att.vision) visionAttachments.push(att.vision);
    }
  }
  let sessionId = b.sessionId && await ownedSession(ctx, ses.uid, b.sessionId) ? b.sessionId : "";
  if (!sessionId) sessionId = await createSession(ctx, ses.uid, model);
  const prior = await getMessages(ctx, sessionId);
  await appendMessage(ctx, sessionId, "user", message || "(画像を添付)");
  await ensureTitle(ctx, sessionId, message || "画像の確認");
  const origin = new URL(request.url).origin;
  if (b.background) {
    if (!atLeast(await cachedEntitlement(env), "pro")) return json({ error: "バックグラウンド実行は Pro 以上で利用できます" }, 403);
    const { enqueueAgentJob, processAgentJobs } = await import("./agent-jobs_B3TWXXVY.mjs");
    await enqueueAgentJob(ctx, { owner: ses.uid, sessionId, prompt, role: ses.role });
    try {
      locals.cfContext?.waitUntil(processAgentJobs(ctx, origin));
    } catch {
    }
    return json({ ok: true, queued: true, sessionId, reply: "バックグラウンドで実行を開始しました。完了するとこの会話に結果が表示され、通知（ベル）でもお知らせします（画面を離れても続行します）。" });
  }
  const { tryPreAgentRouting, tryProHopsContinuation, finalizeAssistantReply } = await import("./chat-flow_TDYHyfj8.mjs");
  const handled = await tryPreAgentRouting(ctx, locals.cfContext, { uid: ses.uid, role: ses.role, sesCtx: ses.ctx, sessionId, message, prior, mode: b.mode, hasVision: visionAttachments.length > 0, modelId, origin });
  if (handled) return json({ ok: true, sessionId, reply: handled.reply, actions: handled.actions, ...handled.queued ? { queued: true } : {} });
  const usedTools = [];
  let reply;
  try {
    reply = await ctx.agent.run({ owner: ses.uid, text: prompt, attachments: visionAttachments, role: ses.role, baseUrl: origin, history: toTurns(prior), model, modelId, sessionId, mode: b.mode, onEvent: (ev) => {
      if (ev.type === "tool") usedTools.push(ev.name);
    } });
  } catch (e) {
    const msg = e?.message ?? String(e);
    await (await import("./diag_CsI0yNfw.mjs")).logDiag(env, "error", "chat", `agent.run失敗(model=${b.model ?? "auto"}): ${msg}`);
    const { explainStop } = await import("./errors_Cz86HmdL.mjs");
    reply = explainStop("system", `内部処理でエラーが発生しました（${msg.slice(0, 120)}）。`, "時間をおいて再度お試しください。続く場合は別のAIモデル（設定→連携 /settings/messaging）に切り替えるか、管理者へご連絡ください。");
  }
  const bg = await tryProHopsContinuation(ctx, locals.cfContext, { uid: ses.uid, role: ses.role, prompt, sessionId, origin, reply });
  if (bg) return json({ ok: true, queued: true, reply: bg, sessionId });
  const fin = await finalizeAssistantReply(ctx, { uid: ses.uid, role: ses.role, message, sessionId, reply, tools: usedTools });
  return json({ ok: true, reply: fin.content, actions: fin.actions, sessionId, messageId: fin.messageId });
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
