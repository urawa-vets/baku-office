globalThis.process ??= {};
globalThis.process.env ??= {};
import { c as createComponent } from "./astro-component_Bc18R3r1.mjs";
import { r as renderTemplate, m as maybeRenderHead, F as Fragment, a as addAttribute } from "./sequence_BESBTeYg.mjs";
import { r as renderComponent } from "./worker-entry_EC1jLQM3.mjs";
import { env } from "cloudflare:workers";
import { $ as $$App } from "./App__9dDIE7_.mjs";
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const prerender = false;
const $$BuilderEval = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$BuilderEval;
  const { getSession } = await import("./auth_CKZlflBM.mjs");
  const ses = await getSession(env, Astro2.request);
  if (!ses) return Astro2.redirect("/login", 302);
  const isAdmin = ses.role === "admin";
  const rows = isAdmin ? (await env.DB.prepare("SELECT status,model,kind,attempts,created_at,updated_at,stop_reason FROM app_builds WHERE kind='build' ORDER BY created_at DESC LIMIT 200").all().catch(() => ({ results: [] }))).results : [];
  const nowS = Math.floor(Date.now() / 1e3);
  const terminal = /* @__PURE__ */ new Set(["done", "done_partial", "error", "cancelled"]);
  const statusOrder = ["done", "done_partial", "error", "cancelled", "building", "planning", "finalizing"];
  const byStatus = statusOrder.map((s) => ({ s, n: rows.filter((r) => r.status === s).length })).filter((x) => x.n);
  const modelKey = (m) => m || "（自動/未指定）";
  const byModel = [...new Set(rows.map((r) => modelKey(r.model)))].map((m) => {
    const rs = rows.filter((r) => modelKey(r.model) === m);
    const term = rs.filter((r) => terminal.has(r.status));
    const done = rs.filter((r) => r.status === "done").length;
    const partial = rs.filter((r) => r.status === "done_partial").length;
    const err = rs.filter((r) => r.status === "error").length;
    const durs = term.map((r) => r.updated_at - r.created_at).filter((d) => d > 0);
    const avgDur = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0;
    const avgAtt = rs.length ? rs.reduce((a, b) => a + (b.attempts || 0), 0) / rs.length : 0;
    return { m, total: rs.length, done, partial, err, doneRate: term.length ? Math.round(done / term.length * 100) : 0, avgDur, avgAtt: avgAtt.toFixed(1) };
  }).sort((a, b) => b.total - a.total);
  const fmtDur = (s) => s <= 0 ? "—" : s >= 60 ? `${Math.floor(s / 60)}分${s % 60}秒` : `${s}秒`;
  const fmtAgo = (t) => {
    const d = nowS - t;
    return d < 60 ? `${d}秒前` : d < 3600 ? `${Math.floor(d / 60)}分前` : d < 86400 ? `${Math.floor(d / 3600)}時間前` : `${Math.floor(d / 86400)}日前`;
  };
  const statusLabel = { done: "完了", done_partial: "一部完了", error: "失敗", cancelled: "中止", building: "実装中", planning: "計画中", finalizing: "仕上げ中" };
  const recent = isAdmin ? (await env.DB.prepare("SELECT id,name,status,model,kind,attempts,stop_reason,created_at,updated_at FROM app_builds ORDER BY created_at DESC LIMIT 30").all().catch(() => ({ results: [] }))).results : [];
  const { CLAUDE_MODELS } = await import("./config_2o5HV4Wj.mjs");
  const { monthCallAgg } = await import("./usage_B3rFW8CV.mjs");
  const month = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const calls = isAdmin ? await monthCallAgg(env, month).catch(() => []) : [];
  const featMap = /* @__PURE__ */ new Map();
  for (const c of calls) {
    const v = featMap.get(c.feature) ?? { calls: 0, inp: 0, out: 0, cr: 0, usd: 0 };
    v.calls += c.calls;
    v.inp += c.inputTokens;
    v.out += c.outputTokens;
    v.cr += c.cacheRead;
    v.usd += c.estUsd;
    featMap.set(c.feature, v);
  }
  const rate = (inp, cr) => inp + cr > 0 ? Math.round(cr / (inp + cr) * 100) : 0;
  const byFeature = [...featMap.entries()].map(([feature, v]) => ({ feature, ...v, rate: rate(v.inp, v.cr) })).sort((a, b) => b.inp + b.cr - (a.inp + a.cr));
  const tk = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);
  const tot = byFeature.reduce((a, b) => ({ calls: a.calls + b.calls, inp: a.inp + b.inp, out: a.out + b.out, cr: a.cr + b.cr, usd: a.usd + b.usd }), { calls: 0, inp: 0, out: 0, cr: 0, usd: 0 });
  return renderTemplate`${renderComponent($$result, "App", $$App, { "title": "ビルダー検査", "active": "/settings", "data-astro-cid-b27wsdnx": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 data-astro-cid-b27wsdnx>アプリビルダー 検査（ビルドKPI）</h1> ${!isAdmin && renderTemplate`<div class="card" data-astro-cid-b27wsdnx><div class="banner banner-warn" data-astro-cid-b27wsdnx>この画面は管理者のみ利用できます。</div></div>`}${isAdmin && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <p class="muted" data-astro-cid-b27wsdnx>直近のアプリ生成の結果（状態・モデル別の完了率・所要時間・再試行回数）を集計します。代表的なアプリを一括投入して、モデルや規模ごとの傾向を実機で確認できます（本番と同一経路で生成）。</p> <div class="card" data-astro-cid-b27wsdnx> <h2 style="margin:.2rem 0 .6rem;font-size:1rem" data-astro-cid-b27wsdnx>ゴールデンspec を一括投入</h2> <p class="muted small" data-astro-cid-b27wsdnx>計算+CRUD／CRUD／描画ゲーム／状態遷移／大型多画面 の5本を、1つのチャットへまとめて投入します（バックグラウンド生成・完了するとチャットに表示）。</p> <div class="row" style="gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:.5rem" data-astro-cid-b27wsdnx> <label class="small" data-astro-cid-b27wsdnx>モデル：<select id="golden-model" style="margin-left:.3rem" data-astro-cid-b27wsdnx> <option value="" data-astro-cid-b27wsdnx>自動（既定＝計画Opus/実装Sonnet）</option> ${CLAUDE_MODELS.map((m) => renderTemplate`<option${addAttribute(m.id, "value")} data-astro-cid-b27wsdnx>${m.name}</option>`)} </select></label> <button class="btn btn-primary btn-sm" id="golden-go" data-astro-cid-b27wsdnx>ゴールデンspec を一括投入</button> </div> </div> ${byFeature.length > 0 && renderTemplate`<div class="card" style="overflow-x:auto" data-astro-cid-b27wsdnx> <h2 style="margin:.2rem 0 .3rem;font-size:1rem" data-astro-cid-b27wsdnx>AIトークン内訳（当月・feature別・キャッシュ率）</h2> <p class="muted small" style="margin:0 0 .5rem" data-astro-cid-b27wsdnx>キャッシュ率が低い feature は、同じ定型プロンプトを毎回フル課金しています＝プロンプトキャッシュ徹底の削減余地。入力＝新規課金分、キャッシュ＝再利用（安い）読取分。</p> <table class="ev" data-astro-cid-b27wsdnx> <thead data-astro-cid-b27wsdnx><tr data-astro-cid-b27wsdnx><th data-astro-cid-b27wsdnx>feature</th><th data-astro-cid-b27wsdnx>呼出</th><th data-astro-cid-b27wsdnx>入力(新規)</th><th data-astro-cid-b27wsdnx>キャッシュ読取</th><th data-astro-cid-b27wsdnx>キャッシュ率</th><th data-astro-cid-b27wsdnx>出力</th><th data-astro-cid-b27wsdnx>推定$</th></tr></thead> <tbody data-astro-cid-b27wsdnx> ${byFeature.map((f) => renderTemplate`<tr data-astro-cid-b27wsdnx> <td data-astro-cid-b27wsdnx>${f.feature}</td><td data-astro-cid-b27wsdnx>${f.calls}</td><td data-astro-cid-b27wsdnx>${tk(f.inp)}</td><td data-astro-cid-b27wsdnx>${tk(f.cr)}</td> <td data-astro-cid-b27wsdnx><strong${addAttribute(f.rate < 30 ? "color:#b23b3b" : f.rate >= 60 ? "color:#1a7f4b" : "", "style")} data-astro-cid-b27wsdnx>${f.rate}%</strong></td> <td data-astro-cid-b27wsdnx>${tk(f.out)}</td><td data-astro-cid-b27wsdnx>$${f.usd.toFixed(2)}</td> </tr>`)} <tr style="border-top:2px solid var(--line);font-weight:600" data-astro-cid-b27wsdnx> <td data-astro-cid-b27wsdnx>合計</td><td data-astro-cid-b27wsdnx>${tot.calls}</td><td data-astro-cid-b27wsdnx>${tk(tot.inp)}</td><td data-astro-cid-b27wsdnx>${tk(tot.cr)}</td> <td data-astro-cid-b27wsdnx>${rate(tot.inp, tot.cr)}%</td><td data-astro-cid-b27wsdnx>${tk(tot.out)}</td><td data-astro-cid-b27wsdnx>$${tot.usd.toFixed(2)}</td> </tr> </tbody> </table> </div>`}<div class="card" data-astro-cid-b27wsdnx> <h2 style="margin:.2rem 0 .6rem;font-size:1rem" data-astro-cid-b27wsdnx>状態別（直近${rows.length}件）</h2> ${byStatus.length ? renderTemplate`<div class="row" style="gap:.5rem;flex-wrap:wrap" data-astro-cid-b27wsdnx> ${byStatus.map((x) => renderTemplate`<span class="pill" data-astro-cid-b27wsdnx>${statusLabel[x.s] ?? x.s}：<strong data-astro-cid-b27wsdnx>${x.n}</strong></span>`)} </div>` : renderTemplate`<p class="muted small" data-astro-cid-b27wsdnx>まだビルドがありません。上の「一括投入」で試せます。</p>`} </div> ${byModel.length > 0 && renderTemplate`<div class="card" style="overflow-x:auto" data-astro-cid-b27wsdnx> <h2 style="margin:.2rem 0 .6rem;font-size:1rem" data-astro-cid-b27wsdnx>モデル別</h2> <table class="ev" data-astro-cid-b27wsdnx> <thead data-astro-cid-b27wsdnx><tr data-astro-cid-b27wsdnx><th data-astro-cid-b27wsdnx>モデル</th><th data-astro-cid-b27wsdnx>件数</th><th data-astro-cid-b27wsdnx>完了率</th><th data-astro-cid-b27wsdnx>完了/一部/失敗</th><th data-astro-cid-b27wsdnx>平均所要</th><th data-astro-cid-b27wsdnx>平均再試行</th></tr></thead> <tbody data-astro-cid-b27wsdnx> ${byModel.map((m) => renderTemplate`<tr data-astro-cid-b27wsdnx><td data-astro-cid-b27wsdnx>${m.m}</td><td data-astro-cid-b27wsdnx>${m.total}</td><td data-astro-cid-b27wsdnx><strong data-astro-cid-b27wsdnx>${m.doneRate}%</strong></td><td data-astro-cid-b27wsdnx>${m.done}/${m.partial}/${m.err}</td><td data-astro-cid-b27wsdnx>${fmtDur(m.avgDur)}</td><td data-astro-cid-b27wsdnx>${m.avgAtt}</td></tr>`)} </tbody> </table> </div>`}${recent.length > 0 && renderTemplate`<div class="card" style="overflow-x:auto" data-astro-cid-b27wsdnx> <h2 style="margin:.2rem 0 .6rem;font-size:1rem" data-astro-cid-b27wsdnx>直近のビルド</h2> <p class="muted small" style="margin:0 0 .5rem" data-astro-cid-b27wsdnx>状態のリンクから、そのビルドの生成過程ログ（どの工程で何が起きたか）を確認できます。</p> <table class="ev" data-astro-cid-b27wsdnx> <thead data-astro-cid-b27wsdnx><tr data-astro-cid-b27wsdnx><th data-astro-cid-b27wsdnx>状態</th><th data-astro-cid-b27wsdnx>名前</th><th data-astro-cid-b27wsdnx>種別</th><th data-astro-cid-b27wsdnx>モデル</th><th data-astro-cid-b27wsdnx>所要</th><th data-astro-cid-b27wsdnx>再試行</th><th data-astro-cid-b27wsdnx>理由</th><th data-astro-cid-b27wsdnx>いつ</th></tr></thead> <tbody data-astro-cid-b27wsdnx> ${recent.map((r) => renderTemplate`<tr data-astro-cid-b27wsdnx> <td data-astro-cid-b27wsdnx><a${addAttribute(`/settings/build-log/${r.id}`, "href")} data-astro-cid-b27wsdnx>${statusLabel[r.status] ?? r.status}</a></td> <td class="muted small" data-astro-cid-b27wsdnx>${r.name ?? "—"}</td> <td class="muted small" data-astro-cid-b27wsdnx>${r.kind}</td> <td class="muted small" data-astro-cid-b27wsdnx>${modelKey(r.model)}</td> <td data-astro-cid-b27wsdnx>${terminal.has(r.status) ? fmtDur(r.updated_at - r.created_at) : "—"}</td> <td data-astro-cid-b27wsdnx>${r.attempts || 0}</td> <td class="muted small" data-astro-cid-b27wsdnx>${r.stop_reason ?? "—"}</td> <td class="muted small" data-astro-cid-b27wsdnx>${fmtAgo(r.created_at)}</td> </tr>`)} </tbody> </table> </div>`}` })}`}  `, "scripts": async ($$result2) => renderTemplate(_a || (_a = __template(['<script>\n    document.getElementById("golden-go")?.addEventListener("click", async () => {\n      const btn = document.getElementById("golden-go");\n      const model = (document.getElementById("golden-model") || {}).value || "";\n      btn.disabled = true; btn.textContent = "投入中…";\n      const r = await window.bo.api("/api/ops/builder-eval", { model }, { method: "POST", successMsg: null });\n      if (r.ok) {\n        window.bo.toast(`${r.data.started}/${r.data.count} 件を投入しました。チャットで進捗、この表で結果を確認できます。`, "ok");\n        if (r.data.sessionId) setTimeout(() => { location.href = "/?ses=" + r.data.sessionId; }, 900);\n      } else { btn.disabled = false; btn.textContent = "ゴールデンspec を一括投入"; }\n    });\n  <\/script>'], ['<script>\n    document.getElementById("golden-go")?.addEventListener("click", async () => {\n      const btn = document.getElementById("golden-go");\n      const model = (document.getElementById("golden-model") || {}).value || "";\n      btn.disabled = true; btn.textContent = "投入中…";\n      const r = await window.bo.api("/api/ops/builder-eval", { model }, { method: "POST", successMsg: null });\n      if (r.ok) {\n        window.bo.toast(\\`\\${r.data.started}/\\${r.data.count} 件を投入しました。チャットで進捗、この表で結果を確認できます。\\`, "ok");\n        if (r.data.sessionId) setTimeout(() => { location.href = "/?ses=" + r.data.sessionId; }, 900);\n      } else { btn.disabled = false; btn.textContent = "ゴールデンspec を一括投入"; }\n    });\n  <\/script>']))) })}`;
}, "/Users/amberlinks/dev/baku-office/apps/client/src/pages/settings/builder-eval.astro", void 0);
const $$file = "/Users/amberlinks/dev/baku-office/apps/client/src/pages/settings/builder-eval.astro";
const $$url = "/settings/builder-eval";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$BuilderEval,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page
};
