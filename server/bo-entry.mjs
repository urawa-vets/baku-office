// 配布クライアント（単一 Worker）の自走 cron ラッパ。
// Astro 生成の fetch（entry.mjs）に scheduled ハンドラを足し、Cron Triggers（2分毎）で自分の
// /api/cron/drain を叩く＝自動更新・停止ビルド回収・スケジュールタスク・報告送信が顧客側で自動で回る。
// 別途 scheduler Worker（当社運用の apps/scheduler）を持てない顧客インストール向けの自走化。
// drain は per-install の自動鍵で保護（src/lib/cron-auth.ts の resolveDrainKey と同じ KV キー）。
import astro from "./entry.mjs";

const KV_AUTO = "internal_key_auto";

// cron-auth.ts と同一ロジック（外部へ出さない per-install 鍵）。ラッパは bundle 外のため最小限を複製。
async function drainKey(env) {
  if (env.INTERNAL_KEY) return env.INTERNAL_KEY;
  const kv = env.LICENSE;
  if (!kv) return null;
  let k = await kv.get(KV_AUTO).catch(() => null);
  if (!k) {
    k = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await kv.put(KV_AUTO, k).catch(() => {});
  }
  return k;
}

// A-1（ビルド駆動 DO+Alarm）Phase0 PoC：dumb-ticker BuildDO。
// DO はビルドロジックを持たず「秒精度の目覚まし時計」に徹し、alarm() で astro.fetch を in-process 直呼び
// （自オリジン直 fetch の error 1042 を回避）して /api/build/tick を叩き、応答の more で連鎖する。状態は D1 のまま。
// SQLite-backed（wrangler.release.jsonc の new_sqlite_classes）＝無料枠でも動作。バインディング名は BUILD_DO。
export class BuildDO {
  constructor(state, env) {
    this.state = state;
    this.storage = state.storage;
    this.env = env;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/kick") {
      let body = {};
      try { body = await request.json(); } catch { /* noop */ }
      await this.storage.put("buildId", String(body.buildId ?? "poc"));
      await this.storage.put("tick", 0);
      await this.storage.setAlarm(Date.now()); // 即発火（応答をブロックしない）
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/cancel") { await this.storage.deleteAlarm(); return new Response("ok"); }
    return new Response("BuildDO", { status: 200 });
  }
  async alarm() {
    // ① 先に watchdog を張る（invocation 即死保険・無言死防止）。以降で上書き（連鎖/終了/再試行）する。
    await this.storage.setAlarm(Date.now() + 120000);
    try {
      const buildId = (await this.storage.get("buildId")) ?? "poc";
      const tick = (await this.storage.get("tick")) ?? 0;
      const key = await drainKey(this.env);
      if (!key) { await this.storage.deleteAlarm(); return; }
      const req = new Request("https://internal/api/build/tick", {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-key": key },
        body: JSON.stringify({ buildId, tick }),
      });
      // DO alarm には ExecutionContext が無いため最小 shim（PoC の tick は同期完結＝waitUntil 不要）。
      const ctxShim = { waitUntil() {}, passThroughOnException() {} };
      const r = await astro.fetch(req, this.env, ctxShim);
      let b = {};
      try { b = await r.json(); } catch { /* noop */ }
      await this.storage.put("tick", typeof b.tick === "number" ? b.tick : tick + 1);
      if (b.more === true) await this.storage.setAlarm(Date.now()); // 連鎖（サブ秒）
      else await this.storage.deleteAlarm();                        // 役目終了
    } catch {
      // 無言死しない：例外でも 30s 後に再試行（watchdog は上で張り済みだが明示上書き）。
      await this.storage.setAlarm(Date.now() + 30000);
    }
  }
}

export default {
  fetch: (request, env, ctx) => astro.fetch(request, env, ctx),
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        // A-1 Phase0 PoC（spike限定）：DO が有効なら初回 cron で BuildDO を1回だけ自動 kick（KV フラグで冪等）。
        //   ＝デプロイ後1〜2分待つだけで "poc-cron-*" の tick が /diagnostics（や wrangler d1）に出る＝ログイン/手動不要で観測。
        if (env.BUILD_DO) {
          try {
            const kv = env.LICENSE;
            const done = kv ? await kv.get("poc_do_kicked").catch(() => null) : "1";
            if (!done) {
              if (kv) await kv.put("poc_do_kicked", "1").catch(() => {});
              const buildId = "poc-cron-" + Date.now().toString(36);
              const stub = env.BUILD_DO.get(env.BUILD_DO.idFromName(buildId));
              await stub.fetch(new Request("https://internal/kick", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ buildId }) }));
            }
          } catch { /* PoC best-effort */ }
        }
        const key = await drainKey(env);
        if (!key) return;
        // 自オリジンへの直 fetch は CF が遮断（1042）するため、プロセス内で astro.fetch を直呼び。
        // B-1：続きのある active ビルドを continueIds として同一イベント内で再hitし、lease(180s) を待たず連続前進させる。
        let continueIds = [];
        for (let round = 0; round < 4; round++) {
          const req = new Request("https://internal/api/cron/drain", {
            method: "POST",
            headers: { "content-type": "application/json", "x-internal-key": key },
            body: JSON.stringify(continueIds.length ? { continueIds } : {}),
          });
          const r = await astro.fetch(req, env, ctx);
          let b = {};
          try { b = await r.json(); } catch { /* non-JSON */ }
          continueIds = Array.isArray(b?.activeBuildIds) ? b.activeBuildIds.filter((x) => typeof x === "string") : [];
          if (b?.appBuildsMore !== true || !continueIds.length) break; // 続きが無ければ終了（次 tick へ）
        }
      } catch {
        /* best-effort：一時失敗は次 tick で再試行 */
      }
    })());
  },
};
