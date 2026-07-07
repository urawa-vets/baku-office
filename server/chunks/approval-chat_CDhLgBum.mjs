globalThis.process ??= {};
globalThis.process.env ??= {};
import { getApproval, decideApproval } from "./approvals_Hd2FynQa.mjs";
import { currentAuthState, revokedSince, canDevelopApps } from "./auth_CKZlflBM.mjs";
import { t as transcribeAudio, b as runApprovedTool, p as parseApprovalAction } from "./ctx_DH8R7Lvm.mjs";
import { b as authorizeAppRun, c as authorizeDraftRun, v as verifyApprovalIntegrity } from "./app-runtime_Cm6I_60l.mjs";
import "./stripe_r-RFTlbb.mjs";
import { a as atLeast } from "./types_BVJxqWI9.mjs";
import { cachedEntitlement } from "./client_DbLECgB2.mjs";
import { joinWithInvite } from "./users_Ch_5FkUd.mjs";
import { inboundFileLimitBytes, buildFallbackName, saveFile } from "./storage_4EcGQgty.mjs";
import { getDriveSave } from "./drive_wIZSRvWd.mjs";
import { n as nowSec } from "./accounting_D4tRmfws.mjs";
import { logDiag, looksLikeLimit, PAID_HINT } from "./diag_CsI0yNfw.mjs";
import { getWorkersPaid } from "./settings_DI_y7gTJ.mjs";
const INTERNAL_PATH = /(^|[\s(（「『])(\/(?:app|apps|p|lp|site|approvals|settings|projects|project|billing|files|my-events|members|invoices)(?:\/[\w\-./%?=&#]*)?)/g;
function absolutizeInternalLinks(text, baseUrl) {
  if (!baseUrl) return text;
  const base = baseUrl.replace(/\/$/, "");
  return text.replace(INTERNAL_PATH, (_m, pre, path) => `${pre}${base}${path}`);
}
const MSG_NOT_MEMBER = "このアシスタントは登録メンバー専用です。管理者から招待コードを受け取り、ログインで参加してください。";
const MSG_PENDING = "参加申請を受け付けています。管理者の承認をお待ちください。承認されると利用できるようになります。";
const MSG_NOT_PRO = "この機能は現在ご利用いただけません。ご利用をご希望の場合は、担当者（管理者）にお問い合わせください。";
async function checkAccess(ctx, env, connector, sender) {
  const member = await ctx.identity.memberOf(connector, sender);
  if (member?.status === "pending") return { ok: false, message: MSG_PENDING, gate: "pending" };
  if (!member || member.status !== "active") return { ok: false, message: MSG_NOT_MEMBER, gate: "not_member" };
  if (!atLeast(await cachedEntitlement(env), "pro")) return { ok: false, message: MSG_NOT_PRO, gate: "not_pro" };
  return { ok: true, role: member.role, uid: member.id };
}
async function joinViaInvite(env, connector, externalId, code, name) {
  const inv = await env.DB.prepare("SELECT id,target_user_id,expires_at,max_uses,used_count FROM invites WHERE code=? AND status='active'").bind(code).first();
  const cj = connector === "line" ? "LINE" : connector === "discord" ? "Discord" : connector === "slack" ? "Slack" : connector;
  if (inv?.target_user_id) {
    if (nowSec() >= inv.expires_at) return { ok: false, message: "連携コードの有効期限が切れています。管理者に再発行を依頼してください。" };
    if (inv.used_count >= inv.max_uses) return { ok: false, message: "この連携コードは使用済みです。" };
    const { linkIdentity } = await import("./users_Ch_5FkUd.mjs");
    const r2 = await linkIdentity(env, inv.target_user_id, connector, externalId);
    if (!r2.ok) return { ok: false, message: r2.error ?? "連携できませんでした。" };
    await env.DB.prepare("UPDATE invites SET used_count=used_count+1, status='revoked' WHERE id=?").bind(inv.id).run();
    return { ok: true, message: `✅ ${cj} をあなたのアカウントに連携しました。以後この ${cj} でAIを使え、あなた宛の通知も届きます。` };
  }
  const r = await joinWithInvite(env, code, name || `${connector}ユーザー`, { type: connector, externalId });
  if (!r.ok) return { ok: false, message: `参加できませんでした：${r.error}` };
  return { ok: true, message: "参加申請を受け付けました。管理者の承認後に利用できます。" };
}
const SESSION_TTL = 6 * 60 * 60;
const sessionKey = (connector, id) => `chatsess:${connector}:${id}`;
async function loadSession(env, connector, id) {
  const raw = await env.LICENSE.get(sessionKey(connector, id));
  if (!raw) return [];
  try {
    const t = JSON.parse(raw);
    if (!Array.isArray(t)) return [];
    await env.LICENSE.put(sessionKey(connector, id), raw, { expirationTtl: SESSION_TTL }).catch(() => {
    });
    return t;
  } catch {
    return [];
  }
}
async function saveSession(env, connector, id, turns) {
  await env.LICENSE.put(sessionKey(connector, id), JSON.stringify(turns.slice(-20)), { expirationTtl: SESSION_TTL });
}
async function clearSession(env, connector, id) {
  await env.LICENSE.delete(sessionKey(connector, id)).catch(() => {
  });
}
async function respondInbound(ctx, env, baseUrl, msg) {
  const acc = await checkAccess(ctx, env, msg.connector, msg.sender);
  if (!acc.ok) return acc.gate === "pending" ? { text: acc.message } : { text: acc.message, gate: acc.gate };
  if (msg.sessionId && /^(リセット|reset)$/i.test((msg.text ?? "").trim())) {
    await clearSession(env, msg.connector, msg.sessionId);
    return { text: "会話の文脈をリセットしました。", sessionId: msg.sessionId };
  }
  const owner = `${msg.connector}:${msg.sender}`;
  let prompt = msg.text;
  if (msg.audio) {
    const t = await transcribeAudio(env, b64ToBytes(msg.audio.dataB64), msg.audio.mimeType).catch(() => null);
    if (t) prompt = prompt ? `${prompt}
${t}` : t;
    else if (!prompt && !msg.image && !msg.files?.length) return { text: "音声を認識できませんでした（Gemini 未設定の可能性があります）。" };
  }
  const sid = msg.sessionId;
  const uq = await import("./upload-queue_nduVK_vU.mjs");
  const bins = [];
  const failedNames = [];
  const limitBytes = await inboundFileLimitBytes(env).catch(() => 25 * 1024 * 1024);
  const limitMb = Math.max(1, Math.floor(limitBytes / (1024 * 1024)));
  const driveSave = await getDriveSave(env).catch(() => ({ enabled: false, folder: "" }));
  const toFile = async (dataB64, name, mime) => {
    if (limitBytes && Math.floor(dataB64.length * 3 / 4) > limitBytes) {
      failedNames.push(name);
      return;
    }
    const f = new File([b64ToBytes(dataB64)], name, { type: mime });
    const s = await saveFile(env, f, acc.uid, "personal", driveSave.enabled ? { dest: "drive", folderName: driveSave.folder } : void 0).catch(() => null);
    if (s) bins.push({ fileId: s.id, name, mime });
    else failedNames.push(name);
  };
  if (msg.image?.dataB64) await toFile(msg.image.dataB64, buildFallbackName("image", msg.image.mimeType, msg.connector), msg.image.mimeType);
  for (const file of msg.files ?? []) await toFile(file.dataB64, file.filename || buildFallbackName("file", file.mimeType, msg.connector), file.mimeType);
  const failNote = failedNames.length ? `

⚠️ ${failedNames.length}件は大きすぎるなどの理由で受け取れませんでした（1件あたり${limitMb}MBまで）。圧縮・分割してお送りいただくか、担当者にご相談ください。` : "";
  try {
    const { dispatchAppEvent } = await import("./app-events_q-uJflQt.mjs");
    const d = await dispatchAppEvent(ctx, {
      connector: msg.connector,
      sender: msg.sender,
      owner,
      role: acc.role,
      text: prompt,
      image: bins.find((b) => b.mime.startsWith("image/")) ?? null,
      files: bins
    });
    if (d.handled) {
      const text2 = (d.reply && d.reply.trim() ? d.reply : "受け付けました。") + failNote;
      return sid ? { text: text2, sessionId: sid } : { text: text2 };
    }
  } catch (e) {
    await logDiag(env, "error", "app-event", `dispatch(${msg.connector}): ${e.message ?? e}`).catch(() => void 0);
  }
  if (bins.length) {
    if (prompt) await uq.resolveUploadText(ctx, owner, prompt).catch(() => void 0);
    let first;
    for (const b of bins) {
      const q = await uq.enqueueUpload(ctx, { owner, connector: msg.connector, role: acc.role, fileId: b.fileId, name: b.name, mime: b.mime });
      if (!first) first = q;
    }
    const ack = uq.uploadAck(first);
    const text2 = (ack.menu ? `📎 ${bins.length}件のファイルを受け取りました。どうしますか？（続けて送れます・あとでまとめて処理します）
返信で「読み込み」「保管する」「何もしない」のいずれかを送ってください。` : ack.text) + failNote;
    return sid ? { text: text2, sessionId: sid } : { text: text2 };
  }
  if (failedNames.length) {
    const text2 = `ファイルを受け取れませんでした（1件あたり${limitMb}MBまで）。圧縮・分割してお送りいただくか、担当者にご相談ください。`;
    return sid ? { text: text2, sessionId: sid } : { text: text2 };
  }
  if (prompt) {
    const u = await uq.resolveUploadText(ctx, owner, prompt).catch(() => ({ handled: false, reply: "" }));
    if (u.handled) return sid ? { text: u.reply, sessionId: sid } : { text: u.reply };
  }
  if (!prompt) return { text: "メッセージまたはファイルを送ってください。" };
  const history = sid ? await loadSession(env, msg.connector, sid) : [];
  if (sid) await saveSession(env, msg.connector, sid, [...history, { role: "user", text: prompt }]).catch(() => {
  });
  const { getMemberModel, parseRequestModel, detectInlineModel } = await import("./settings_DI_y7gTJ.mjs");
  const inlineModel = detectInlineModel(prompt);
  if (inlineModel.engine) prompt = inlineModel.stripped;
  const memberSel = parseRequestModel(await getMemberModel(env, acc.uid).catch(() => null) ?? "");
  const model = inlineModel.engine ?? memberSel.engine;
  const modelId = inlineModel.engine ? void 0 : memberSel.modelId;
  let answer = "";
  const usedTools = [];
  try {
    answer = await ctx.agent.run({ owner, text: prompt, role: acc.role, baseUrl, history, model, modelId, sessionId: sid, audience: "messaging", onEvent: (ev) => {
      if (ev.type === "tool") usedTools.push(ev.name);
    } });
  } catch (e) {
    const emsg = e.message ?? String(e);
    const limit = looksLikeLimit(emsg);
    const paid = limit ? await getWorkersPaid(env).catch(() => false) : false;
    await logDiag(env, "error", limit ? "limit" : "ai", `inbound(${msg.connector}): ${emsg}`).catch(() => void 0);
    const text2 = limit && !paid ? "処理がサーバーの上限に達した可能性があります。\n" + PAID_HINT : limit ? "処理が一時的に混み合いました。少し時間をおいて、もう一度お試しください（内容を分けると安定します）。" : "処理中にエラーが発生しました。お手数ですが、時間をおいて再度お試しください。続く場合は内容を短く分けるとうまくいくことがあります。";
    return sid ? { text: text2, sessionId: sid } : { text: text2 };
  }
  const { HOPS_EXCEEDED } = await import("./ai_CSVvSxX0.mjs");
  if (answer === HOPS_EXCEEDED) {
    const { explainStop } = await import("./errors_Cz86HmdL.mjs");
    answer = explainStop("ai", "ご依頼が大きく、一度のAI処理回数の上限内で完了できませんでした。", "依頼を小さく分けて（例：1つの機能・画面ずつ）再度お試しください。");
  }
  const { recordTaskFromReply } = await import("./task-log_Dj11UqBz.mjs");
  const task = await recordTaskFromReply(env, { owner, role: acc.role, source: msg.connector, userText: prompt, reply: answer, tools: usedTools, sessionId: sid ?? null });
  answer = task.reply;
  if (sid) await saveSession(env, msg.connector, sid, [...history, { role: "user", text: prompt }, { role: "assistant", text: answer }]);
  const cleaned = absolutizeInternalLinks(answer.replace(/<!--\s*bo-[\s\S]*?-->/g, "").trim(), baseUrl);
  const text = cleaned || "うまく回答を作れませんでした。恐れ入りますが、もう一度お試しください。";
  return sid ? { text, sessionId: sid } : { text };
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
function buildApprovalExec(env, ctx, a, origin) {
  const requesterRole = a.requester_role || "member";
  return async (tool, args) => {
    const isApp = typeof args.__appId === "string";
    const isDraft = typeof args.__draftId === "string";
    const state = await currentAuthState(env, a.owner);
    if (state.kind === "error") return { ok: false, error: "申請者の権限状態を確認できないため実行できません。時間をおいて再度お試しください。" };
    let effectiveRole = requesterRole;
    if (state.kind === "user") {
      if (!state.active || !state.role) return { ok: false, error: "申請者のアカウントが無効化または削除されているため実行できません。" };
      effectiveRole = state.role;
    } else if (isApp || isDraft) {
      return { ok: false, error: "申請者のアカウントを確認できないため実行できません。" };
    }
    if (await revokedSince(env, a.owner, a.created_at)) return { ok: false, error: "申請後に起案者の権限が変更（降格・除名等）されたため実行できません。再申請してください。" };
    if (isDraft && !canDevelopApps(effectiveRole)) return { ok: false, error: "アプリ開発の権限がないため、この実送信テストは実行できません。" };
    if (isApp || isDraft) {
      const subjectType = isApp ? "installed" : "draft";
      const subjectId = isApp ? String(args.__appId) : String(args.__draftId);
      const reauth = isApp ? await authorizeAppRun(ctx, subjectId, a.screen_id ?? void 0, effectiveRole) : await authorizeDraftRun(ctx, subjectId, a.screen_id ?? void 0, effectiveRole);
      if (!reauth.ok) return { ok: false, error: `承認時の再確認に失敗しました：${reauth.error}` };
      if (a.def_hash && a.perms_hash) {
        const integ = await verifyApprovalIntegrity(ctx, subjectType, subjectId, a.def_hash, a.perms_hash);
        if (!integ.ok) return { ok: false, error: integ.error ?? "承認対象の内容が変更されています。再申請してください。" };
      } else if (isApp && a.app_version && reauth.appVersion && a.app_version !== reauth.appVersion) {
        return { ok: false, error: "申請後にアプリ定義が更新されました。内容が変わっている可能性があるため、お手数ですが再申請してください。" };
      }
    }
    return runApprovedTool(ctx, a.owner, origin, effectiveRole, tool, args);
  };
}
async function decideApprovalFromChat(ctx, env, connector, externalId, data, origin) {
  const act = parseApprovalAction(data);
  if (!act) return null;
  const acc = await checkAccess(ctx, env, connector, externalId);
  if (!acc.ok || acc.role !== "admin") return "この操作の承認は管理者のみ可能です。baku-office にログインできる管理者にご確認ください。";
  const a = await getApproval(env, act.id);
  if (!a) return "対象の承認が見つかりませんでした（すでに処理済みの可能性があります）。";
  if (a.status !== "pending") return "この承認はすでに処理済みです。";
  const r = await decideApproval(env, act.id, act.approve, acc.uid, buildApprovalExec(env, ctx, a, origin));
  if (!act.approve) return "却下しました。";
  return r.ok ? `✅ 承認して実行しました。${r.result ? "\n" + String(r.result).slice(0, 500) : ""}` : `承認しましたが実行できませんでした：${r.error ?? "不明なエラー"}`;
}
export {
  buildApprovalExec as b,
  checkAccess as c,
  decideApprovalFromChat as d,
  joinViaInvite as j,
  respondInbound as r
};
