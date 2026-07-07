globalThis.process ??= {};
globalThis.process.env ??= {};
import { getSession } from "./auth_CKZlflBM.mjs";
import { env } from "cloudflare:workers";
const prerender = false;
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const GOLDEN = [
  { name: "見積（計算+CRUD）", spec: "見積作成アプリ。品目・数量・単価を入力すると小計・値引後金額・粗利・税込を自動計算する。作成した見積を保存し、一覧・再編集できる。" },
  { name: "資産管理（CRUD）", spec: "資産管理アプリ。資産名・数量・保管場所・購入日を登録・一覧・更新・削除でき、CSVで書き出せる。" },
  { name: "パズルゲーム（描画）", spec: "グリッド上で荷物を目的地まで運ぶパズルゲーム。矢印キーで操作してプレイでき、クリアタイムをスコアとして記録・一覧できる。" },
  { name: "承認シミュ（状態遷移）", spec: "申請の承認フローを試すアプリ。申請を作成すると承認待ちになり、承認すると承認済み、却下すると却下に変わる。動作確認の dry-run と履歴一覧ができる。" },
  { name: "イベント運営（大型・多画面）", spec: "イベント運営アプリ。スポンサー管理・出展者管理・タイムスケジュール・参加者受付・アンケート集計・当日運営チェックリスト・精算の各機能を、それぞれの画面で登録・一覧・編集できる。" }
];
const POST = async ({ request, locals }) => {
  const ses = await getSession(env, request);
  if (!ses || ses.role !== "admin") return json({ error: "管理者のみ" }, 403);
  const b = await request.json().catch(() => ({}));
  const { startAppBuild, processAppBuilds } = await import("./ctx_DH8R7Lvm.mjs").then((n) => n.U);
  const { createSession } = await import("./chat-sessions_qgxfbXK9.mjs").then((n) => n.k);
  const { getWorkersPaid } = await import("./settings_DI_y7gTJ.mjs");
  const paid = await getWorkersPaid(env).catch(() => false);
  const model = b.model || void 0;
  const sessionId = await createSession(locals.ctx, ses.uid, model);
  let started = 0;
  for (const g of GOLDEN) {
    const id = await startAppBuild(locals.ctx, { owner: ses.uid, sessionId, spec: g.spec, model, paid }).catch(() => null);
    if (id) started++;
  }
  const origin = new URL(request.url).origin;
  try {
    locals.cfContext?.waitUntil(processAppBuilds(locals.ctx, origin, 5, { maxSteps: 2 }).then(() => void 0).catch(() => void 0));
  } catch {
  }
  return json({ ok: true, started, sessionId, count: GOLDEN.length });
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
