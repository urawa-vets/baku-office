globalThis.process ??= {};
globalThis.process.env ??= {};
import { c as createComponent } from "./astro-component_Bc18R3r1.mjs";
import { r as renderTemplate, m as maybeRenderHead, F as Fragment, a as addAttribute } from "./sequence_BESBTeYg.mjs";
import { r as renderComponent } from "./worker-entry_EC1jLQM3.mjs";
import { env } from "cloudflare:workers";
import { $ as $$App } from "./App__9dDIE7_.mjs";
const prerender = false;
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$id;
  const { getSession } = await import("./auth_CKZlflBM.mjs");
  const ses = await getSession(env, Astro2.request);
  if (!ses) return Astro2.redirect("/login", 302);
  const isAdmin = ses.role === "admin";
  const id = String(Astro2.params.id ?? "");
  const build = isAdmin && id ? await env.DB.prepare("SELECT id,name,kind,status,stop_reason,cursor,attempts,model,paid,app_id,error,created_at,updated_at FROM app_builds WHERE id=?").bind(id).first().catch(() => null) : null;
  const { buildLogs } = await import("./diag_CsI0yNfw.mjs");
  const logs = isAdmin && id ? await buildLogs(env, id).catch(() => []) : [];
  const fmtTime = (t) => new Date(t * 1e3).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtDur = (s) => s <= 0 ? "—" : s >= 60 ? `${Math.floor(s / 60)}分${s % 60}秒` : `${s}秒`;
  const statusLabel = { done: "完了", done_partial: "一部完了", error: "失敗", cancelled: "中止", building: "実装中", planning: "計画中", finalizing: "仕上げ中" };
  const lvClass = { error: "lv-error", warn: "lv-warn", info: "lv-info" };
  return renderTemplate`${renderComponent($$result, "App", $$App, { "title": "ビルド生成ログ", "active": "/settings", "data-astro-cid-2wuq22ba": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<p class="muted small" data-astro-cid-2wuq22ba><a href="/settings/builder-eval" data-astro-cid-2wuq22ba>← ビルダー検査へ戻る</a></p> <h1 data-astro-cid-2wuq22ba>ビルド生成ログ</h1> ${!isAdmin && renderTemplate`<div class="card" data-astro-cid-2wuq22ba><div class="banner banner-warn" data-astro-cid-2wuq22ba>この画面は管理者のみ利用できます。</div></div>`}${isAdmin && !build && renderTemplate`<div class="card" data-astro-cid-2wuq22ba><p class="muted" data-astro-cid-2wuq22ba>指定のビルド（${id}）が見つかりません。</p></div>`}${isAdmin && build && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <div class="card" data-astro-cid-2wuq22ba> <h2 style="margin:.2rem 0 .6rem;font-size:1rem" data-astro-cid-2wuq22ba>${build.name ?? "（無題）"}</h2> <div class="row" style="gap:.5rem;flex-wrap:wrap;margin-bottom:.4rem" data-astro-cid-2wuq22ba> <span class="pill" data-astro-cid-2wuq22ba>状態：<strong data-astro-cid-2wuq22ba>${statusLabel[build.status] ?? build.status}</strong></span> <span class="pill" data-astro-cid-2wuq22ba>種別：${build.kind}</span> ${build.stop_reason && renderTemplate`<span class="pill" data-astro-cid-2wuq22ba>終了理由：${build.stop_reason}</span>`} <span class="pill" data-astro-cid-2wuq22ba>工程：${build.cursor}</span> <span class="pill" data-astro-cid-2wuq22ba>再試行：${build.attempts}</span> <span class="pill" data-astro-cid-2wuq22ba>モデル：${build.model ?? "（自動）"}</span> <span class="pill" data-astro-cid-2wuq22ba>所要：${fmtDur(build.updated_at - build.created_at)}</span> </div> <p class="muted small" style="margin:.2rem 0 0" data-astro-cid-2wuq22ba>build_id: <code data-astro-cid-2wuq22ba>${build.id}</code>${build.app_id && renderTemplate`${renderComponent($$result3, "Fragment", Fragment, { "data-astro-cid-2wuq22ba": true }, { "default": async ($$result4) => renderTemplate` ／ app_id: <code data-astro-cid-2wuq22ba>${build.app_id}</code>` })}`}</p> ${build.error && renderTemplate`<div class="banner banner-warn" style="margin-top:.5rem;white-space:pre-wrap" data-astro-cid-2wuq22ba>${build.error}</div>`} </div> <div class="card" style="overflow-x:auto" data-astro-cid-2wuq22ba> <h2 style="margin:.2rem 0 .3rem;font-size:1rem" data-astro-cid-2wuq22ba>生成過程トレース（${logs.length}件）</h2> ${logs.length === 0 ? renderTemplate`<p class="muted small" data-astro-cid-2wuq22ba>このビルドの工程ログはまだありません（本機能の導入前に生成されたビルド、または進行中の可能性があります）。</p>` : renderTemplate`<table class="ev" data-astro-cid-2wuq22ba> <thead data-astro-cid-2wuq22ba><tr data-astro-cid-2wuq22ba><th data-astro-cid-2wuq22ba>時刻</th><th data-astro-cid-2wuq22ba>レベル</th><th data-astro-cid-2wuq22ba>イベント</th><th data-astro-cid-2wuq22ba>詳細</th></tr></thead> <tbody data-astro-cid-2wuq22ba> ${logs.map((l) => renderTemplate`<tr data-astro-cid-2wuq22ba> <td class="muted small" style="white-space:nowrap" data-astro-cid-2wuq22ba>${fmtTime(l.created_at)}</td> <td data-astro-cid-2wuq22ba><span${addAttribute("lvl " + (lvClass[l.level] ?? "lv-info"), "class")} data-astro-cid-2wuq22ba>${l.level}</span></td> <td style="white-space:nowrap" data-astro-cid-2wuq22ba>${l.message}</td> <td class="detail" data-astro-cid-2wuq22ba>${l.context || "—"}</td> </tr>`)} </tbody> </table>`} </div> ` })}`}` })}`;
}, "/Users/amberlinks/dev/baku-office/apps/client/src/pages/settings/build-log/[id].astro", void 0);
const $$file = "/Users/amberlinks/dev/baku-office/apps/client/src/pages/settings/build-log/[id].astro";
const $$url = "/settings/build-log/[id]";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page
};
