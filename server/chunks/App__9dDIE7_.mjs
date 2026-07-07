globalThis.process ??= {};
globalThis.process.env ??= {};
import { c as createComponent } from "./astro-component_Bc18R3r1.mjs";
import { e as createRenderInstruction, a as addAttribute, r as renderTemplate, b as renderSlot, F as Fragment, c as renderHead, u as unescapeHTML } from "./sequence_BESBTeYg.mjs";
import { r as renderComponent } from "./worker-entry_EC1jLQM3.mjs";
import { env } from "cloudflare:workers";
import "./stripe_r-RFTlbb.mjs";
import { a as atLeast } from "./types_BVJxqWI9.mjs";
async function renderScript(result, id) {
  const inlined = result.inlinedScripts.get(id);
  let content = "";
  if (inlined != null) {
    if (inlined) {
      content = `<script type="module">${inlined}<\/script>`;
    }
  } else {
    const resolved = await result.resolve(id);
    content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
  }
  return createRenderInstruction({ type: "script", id, content });
}
const $$ClientRouter = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$ClientRouter;
  const { fallback = "animate" } = Astro2.props;
  return renderTemplate`<meta name="astro-view-transitions-enabled" content="true"><meta name="astro-view-transitions-fallback"${addAttribute(fallback, "content")}>${renderScript($$result, "/Users/amberlinks/dev/baku-office/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/amberlinks/dev/baku-office/node_modules/astro/components/ClientRouter.astro", void 0);
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a, _b;
const $$App = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$App;
  const { title, active = "", auth = true, bare = false, denseMobile = false } = Astro2.props;
  const { getSession } = await import("./auth_CKZlflBM.mjs");
  const ses = await getSession(env, Astro2.request).catch(() => null);
  const ICONS = {
    home: "M3 11.2 12 4l9 7.2M5 9.6V20h5v-5.5h4V20h5V9.6",
    spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    gear: "M12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6M19.4 12c0-.5 0-1-.1-1.4l2-1.5-2-3.4-2.3 1a7 7 0 00-2.4-1.4L14.2 2H9.8l-.4 2.3a7 7 0 00-2.4 1.4l-2.3-1-2 3.4 2 1.5c-.1.4-.1.9-.1 1.4s0 1 .1 1.4l-2 1.5 2 3.4 2.3-1a7 7 0 002.4 1.4l.4 2.3h4.4l.4-2.3a7 7 0 002.4-1.4l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.4",
    bell: "M6 16V11a6 6 0 0112 0v5l2 2H4zM9.5 20a2.5 2.5 0 005 0",
    moon: "M20 13.5A8 8 0 119.5 4 6.5 6.5 0 0020 13.5z",
    sun: "M12 6.5V3M12 21v-3.5M6.5 12H3M21 12h-3.5M7 7 4.8 4.8M19.2 19.2 17 17M17 7l2.2-2.2M4.8 19.2 7 17M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z",
    card: "M3 6h18v12H3zM3 10h18",
    logout: "M9 5H5v14h4M14 8l4 4-4 4M18 12H9",
    plus: "M12 5v14M5 12h14",
    dash: "M4 4h7v9H4zM4 16h7v4H4zM13 4h7v4h-7zM13 11h7v9h-7z",
    menu: "M4 7h16M4 12h16M4 17h16"
  };
  const navIcon = { "/dashboard": "dash", "/apps": "grid", "/projects": "grid", "/settings": "gear", "/my-events": "home" };
  const iconFor = (href) => ICONS[navIcon[href] ?? "home"] ?? ICONS.home;
  const isGuest = ses?.role === "guest";
  const homeHref = isGuest ? "/my-events" : "/";
  const items = isGuest ? [{ href: "/my-events", label: "参加イベント", show: true }] : [
    { href: "/dashboard", label: "ダッシュボード", show: true },
    { href: "/apps", label: "アプリ", show: true },
    // プロジェクト＝事業/イベント単位でアプリ＋公開LPをまとめ横断管理（管理/開発ロールのみ）。
    { href: "/projects", label: "プロジェクト", show: ses?.role === "admin" || ses?.role === "developer" }
  ];
  const ctx = Astro2.locals.ctx;
  const [themeMod, navMod, diagMod, notifMod, clientMod] = await Promise.all([
    import("./theme_DFty9gzU.mjs"),
    import("./nav_CqD0IXOG.mjs"),
    import("./diag_CsI0yNfw.mjs"),
    import("./notifications_CY-v-Hbg.mjs"),
    import("./client_DbLECgB2.mjs")
  ]);
  const [theme, navOv, limitErr, unreadNotif, entitlement, hasClaude, hasGemini, recentRaw, favRaw] = await Promise.all([
    themeMod.getTheme(ctx).catch(() => ({})),
    navMod.getNavOverrides(ctx).catch(() => null),
    diagMod.hasRecentLimitError(env).catch(() => false),
    ses ? notifMod.countUnread(ctx, ses.uid).catch(() => 0) : Promise.resolve(0),
    ses ? clientMod.cachedEntitlement(env).catch(() => "free") : Promise.resolve("free"),
    ses ? clientMod.hasApiKey(env, "claude").catch(() => false) : Promise.resolve(false),
    ses ? clientMod.hasApiKey(env, "gemini").catch(() => false) : Promise.resolve(false),
    ses && !isGuest ? import("./chat-sessions_qgxfbXK9.mjs").then((n) => n.k).then((m) => m.listSessions(ctx, ses.uid)).then((r) => r.slice(0, 6)).catch(() => []) : Promise.resolve([]),
    ses && !isGuest ? Promise.all([
      import("./settings_DI_y7gTJ.mjs").then((m) => m.getFavApps(env, ses.uid)).catch(() => []),
      import("./external-apps_CoOdU2nO.mjs").then((n) => n.C).then((m) => m.installedAppDefs(ctx, ses.role)).catch(() => [])
    ]).then(([ids, apps]) => ids.map((id) => apps.find((a) => a.id === id)).filter(Boolean).slice(0, 8)).catch(() => []) : Promise.resolve([])
  ]);
  const themeStyle = themeMod.themeCss(theme);
  const brand = themeMod.brandName(theme);
  const logoUrl = theme.logoUrl;
  const navItems = navMod.buildNav(items, [], navOv);
  const hasPlus = atLeast(entitlement, "plus");
  const recentSessions = hasPlus ? recentRaw : [];
  const favApps = favRaw;
  const mascotUrl = theme.mascotUrl || "/mascot/baku.png";
  const agentAwake = atLeast(entitlement, "pro");
  const mascotEngine = hasClaude ? "claude" : hasGemini ? "gemini" : "workers_ai";
  const ROLE_JA = { admin: "管理者", accounting: "会計担当", clerical: "庶務", member: "メンバー", guest: "イベント参加者", viewer: "閲覧", owner: "オーナー" };
  const roleJa = ROLE_JA[ses?.role ?? ""] ?? (ses?.role ?? "メンバー");
  const displayName = ses?.name && ses.name.trim() ? ses.name : ses?.ctx === "org" ? "組織アカウント" : "メンバー";
  const initial = (displayName || "B").slice(0, 1).toUpperCase();
  const isAdminOrg = ses?.role === "admin" && ses?.ctx === "org";
  let updateAvailable = false;
  if (isAdminOrg) {
    try {
      const lv = await env.LICENSE.get("latest_version");
      if (lv) {
        const { cmpVersion } = await import("./update_DnXG1H1H.mjs");
        updateAvailable = cmpVersion(lv, clientMod.APP_VERSION) > 0;
      }
    } catch {
    }
  }
  return renderTemplate(_b || (_b = __template(['<html lang="ja"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="color-scheme" content="dark light"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/mascot/baku.png"><!-- PWA：ホーム画面に追加→全画面アプリ化（iOS/Android/PC共通・移植性アーキの一環）。 --><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#1B1D22"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="baku-office">', '<meta name="bo-spa" content="1"><script>\n      // Service Worker 登録（インストール可能化・オフラインフォールバック）。失敗は無視（PWA未対応でも通常動作）。\n      if ("serviceWorker" in navigator) {\n        window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });\n      }\n    <\/script><script>\n      // テーマ・ナビ形態の初期適用（描画前に data-theme / data-nav を確定＝ちらつき防止）。\n      // SPA遷移(View Transitions)では <html> 属性がリセットされるため、astro:after-swap で毎回再適用する\n      // （これを怠るとサイドバー表示やテーマ・文字サイズが遷移後に失われる）。\n      (function () {\n        function applyHtmlState() { try {\n          // 既定は Apple Dark。明示的に "light" を選んだ時だけライト（未設定＝ダーク）。\n          var t = localStorage.getItem("bo_theme"); document.documentElement.setAttribute("data-theme", t === "light" ? "light" : "dark");\n          // ナビは常設左サイドバー固定（Genspark型）。スマホは @media でドロワー化。\n          document.documentElement.setAttribute("data-nav", "side");\n          var f = localStorage.getItem("bo_fontsize"); document.documentElement.setAttribute("data-fontsize", (f === "large" || f === "xl") ? f : "std");\n          if (localStorage.getItem("bo_mascot") === "off") document.documentElement.setAttribute("data-mascot", "off"); else document.documentElement.removeAttribute("data-mascot");\n          if (localStorage.getItem("bo_sb") === "min") document.documentElement.setAttribute("data-sb", "min"); else document.documentElement.removeAttribute("data-sb");\n        } catch (e) {} }\n        applyHtmlState();\n        document.addEventListener("astro:after-swap", applyHtmlState);\n      })();\n    <\/script><title>', " — ", "</title>", "", "</head> <body", '> <div id="bo-progress" aria-hidden="true" data-astro-transition-persist="bo-progress"></div> <div id="bo-nav" aria-hidden="true" data-astro-transition-persist="bo-nav"><span class="bo-nav-box"><span class="bo-nav-spin"></span>読み込み中…</span></div> <div class="app"> ', ' <div class="shell"> ', " </div> </div> ", ' <div id="toasts" aria-live="polite" data-astro-transition-persist="bo-toasts"></div> <div id="bo-notif" hidden data-astro-transition-persist="bo-notif" style="position:fixed;top:calc(52px + env(safe-area-inset-top));right:calc(12px + env(safe-area-inset-right));width:320px;max-height:70vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow-lg);z-index:50;padding:8px"></div> ', " ", " </body></html>"])), renderComponent($$result, "ClientRouter", $$ClientRouter, {}), title, brand, themeStyle && renderTemplate`<style>${unescapeHTML(themeStyle)}</style>`, renderHead(), addAttribute([{ "dense-mobile": denseMobile }], "class:list"), auth && ses && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result2) => renderTemplate(_a || (_a = __template(['<header class="mtop" data-astro-transition-persist="bo-mtop"> <button class="iconbtn mtop-burger" id="bo-menu" type="button" aria-label="メニューを開く" aria-expanded="false"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path', '></path></svg> </button> <a class="brand"', "> ", ' </a> </header> <div class="sb-scrim" id="bo-scrim" hidden data-astro-transition-persist="bo-scrim"></div> <button class="bo-sb-restore" id="bo-sb-restore" type="button" title="メニューを開く" aria-label="メニューを開く" data-astro-transition-persist="bo-sb-restore">»</button> <aside class="sidebar" id="bo-sidebar" data-astro-transition-persist="bo-sidebar"> <a class="sb-brand"', "> ", " ", ' </a> <button class="sb-min" id="bo-sb-min" type="button" title="メニューを最小化" aria-label="メニューを最小化">«</button> ', ' <nav class="sb-nav" aria-label="サイドナビ"> ', " </nav> ", " ", ' <div class="sb-foot"> <button class="iconbtn" id="bo-theme" type="button" title="ダーク" aria-label="テーマを切り替え"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path id="bo-theme-ico"', '></path></svg> </button> <a href="#" class="iconbtn" id="bo-bell" title="通知" aria-label="通知"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path', "></path></svg> ", ' </a> <span class="sb-userwrap"> <button class="userchip" id="bo-user" type="button" aria-haspopup="menu" aria-expanded="false"> <span class="avatar">', '</span> <span class="nm">', "<small>", '</small></span> </button> <div class="menu-ov" id="bo-user-ov" hidden></div> <div class="usermenu fade-up" id="bo-user-menu" role="menu" hidden> <div class="um-head"><span class="avatar" style="width:38px;height:38px;font-size:.95rem">', "</span><div><strong>", '</strong><div class="muted" style="font-size:.8rem">', "・", '</div></div></div> <a class="um-item" href="/settings" role="menuitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path', "></path></svg> 設定</a> ", ' <a class="um-item" href="/billing" role="menuitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path', "></path></svg> プラン・課金</a> ", ' <button class="um-item" id="bo-report-open" type="button" role="menuitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v10H8l-4 4V5z"></path><path d="M8 9h8M8 12h5"></path></svg> 開発元に報告</button> <div class="hr" style="margin:6px 0"></div> <button class="um-item danger" id="bo-logout" type="button" role="menuitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path', '></path></svg> ログアウト</button> </div> <div id="bo-report-ov" hidden style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:60"></div> <div id="bo-report-modal" role="dialog" aria-modal="true" hidden style="position:fixed;z-index:61;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,460px);background:var(--bg,#fff);color:var(--fg,#1B1D22);border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.25)"> <h3 style="margin:0 0 .3rem;font-size:1.05rem">開発元に報告</h3> <p class="muted" style="font-size:.82rem;margin:0 0 .6rem">不具合や気づいた点をお送りください（開発元に届きます）。</p> <textarea id="bo-report-text" rows="5" style="width:100%;box-sizing:border-box;padding:.6rem;border:1px solid var(--line,#ddd);border-radius:10px;font:inherit;resize:vertical" placeholder="例：〇〇の画面でボタンを押しても反応しません"></textarea> <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.7rem"> <button class="btn btn-ghost btn-sm" id="bo-report-cancel" type="button">キャンセル</button> <button class="btn btn-primary btn-sm" id="bo-report-send" type="button">送信</button> </div> </div> <script>\n                (function () {\n                  var open = document.getElementById("bo-report-open");\n                  var ov = document.getElementById("bo-report-ov");\n                  var modal = document.getElementById("bo-report-modal");\n                  var ta = document.getElementById("bo-report-text");\n                  var cancel = document.getElementById("bo-report-cancel");\n                  var send = document.getElementById("bo-report-send");\n                  if (!open || !modal) return;\n                  var toast = function (m, k) { if (window.bo && window.bo.toast) window.bo.toast(m, k); else alert(m); };\n                  var show = function (v) { ov.hidden = !v; modal.hidden = !v; if (v) { ta.value = ""; setTimeout(function () { ta.focus(); }, 30); } };\n                  open.addEventListener("click", function () { var um = document.getElementById("bo-user-menu"); if (um) um.setAttribute("hidden", ""); show(true); });\n                  cancel.addEventListener("click", function () { show(false); });\n                  ov.addEventListener("click", function () { show(false); });\n                  send.addEventListener("click", async function () {\n                    var msg = (ta.value || "").trim();\n                    if (!msg) { toast("内容を入力してください", "warn"); return; }\n                    send.disabled = true;\n                    try {\n                      var r = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "問題報告", message: msg }) });\n                      if (r.ok) { toast("開発元に報告しました。ありがとうございます。", "ok"); show(false); }\n                      else { toast("送信に失敗しました。時間をおいて再度お試しください。", "warn"); }\n                    } catch (e) { toast("送信に失敗しました。", "warn"); }\n                    send.disabled = false;\n                  });\n                })();\n              <\/script> </span> </div> </aside> '])), addAttribute(ICONS.menu, "d"), addAttribute(homeHref, "href"), logoUrl ? renderTemplate`<img${addAttribute(logoUrl, "src")}${addAttribute(brand, "alt")} style="height:22px;vertical-align:middle">` : renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate`<span class="mark"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path${addAttribute(ICONS.spark, "d")}></path></svg></span>${brand}` })}`, addAttribute(homeHref, "href"), logoUrl ? renderTemplate`<img${addAttribute(logoUrl, "src")}${addAttribute(brand, "alt")} style="height:24px">` : renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate`<span class="mark"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path${addAttribute(ICONS.spark, "d")}></path></svg></span><span>${brand}</span>` })}`, isAdminOrg && renderTemplate`<span class="beta-badge" title="本サービスは現在ベータ（試験提供）版です。現在は Test ユーザーのみ利用できます。">β版</span>`, !isGuest && renderTemplate`<a class="sb-newchat" href="/?new=1" data-astro-prefetch="viewport"${addAttribute(active === "/" ? "page" : void 0, "aria-current")}> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path${addAttribute(ICONS.plus, "d")}></path></svg>
新しいチャット
</a>`, navItems.map((i) => renderTemplate`<a${addAttribute(i.href, "href")} data-astro-prefetch="viewport"${addAttribute(active === i.href ? "page" : void 0, "aria-current")}> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path${addAttribute(iconFor(i.href), "d")}></path></svg> ${i.label} </a>`), !isGuest && favApps.length > 0 && renderTemplate`<div class="sb-fav"> <div class="sb-recent-h">お気に入り</div> <div class="sb-fav-list"> ${favApps.map((a) => renderTemplate`<a class="sb-fav-item"${addAttribute(`/app/${a.id}`, "href")} data-astro-reload${addAttribute(a.name, "title")}${addAttribute(active === "/apps" ? void 0 : void 0, "aria-current")}> <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 17.3l-5.5 3.2 1.5-6.2-4.8-4.2 6.3-.5L12 3.7l2.5 5.9 6.3.5-4.8 4.2 1.5 6.2z"></path></svg> <span>${a.name}</span> </a>`)} </div> </div>`, !isGuest && hasPlus && renderTemplate`<div class="sb-recent"> <div class="sb-recent-h">最近の会話</div> <div class="sb-recent-list"> ${recentSessions.map((s) => renderTemplate`<div class="sb-recent-row"${addAttribute(s.id, "data-ses")}> <a class="sb-recent-item"${addAttribute(`/?ses=${s.id}`, "href")}${addAttribute(s.title || "（無題）", "title")}>${s.title || "（無題）"}</a> <button class="sb-recent-del" type="button"${addAttribute(s.id, "data-ses")} title="この会話を削除" aria-label="この会話を削除">×</button> </div>`)} ${recentSessions.length === 0 && renderTemplate`<p class="sb-recent-empty">会話はまだありません。</p>`} </div> </div>`, addAttribute(ICONS.moon, "d"), addAttribute(ICONS.bell, "d"), unreadNotif > 0 && renderTemplate`<span id="bo-bell-badge" class="badge-num">${unreadNotif}</span>`, initial, displayName, roleJa, initial, displayName, ses.ctx === "org" ? "組織" : "個人", roleJa, addAttribute(ICONS.gear, "d"), isAdminOrg && renderTemplate`<a class="um-item" href="/storage" role="menuitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"></path><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"></path></svg> データ管理</a>`, addAttribute(ICONS.card, "d"), isAdminOrg && renderTemplate`<a class="um-item" href="/settings/update" role="menuitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 11-3-6.7M21 4v4h-4"></path></svg> アプリ更新${updateAvailable && renderTemplate`<span class="um-dot" title="新しいバージョンがあります"></span>`}</a>`, addAttribute(ICONS.logout, "d")) })}`, bare ? renderTemplate`${renderSlot($$result, $$slots["default"])}` : renderTemplate`<main class="wrap"> ${limitErr && isAdminOrg && renderTemplate`<div class="banner banner-danger">
一時的に処理が混み合った可能性があります。重い処理を安定させたい場合は
<a href="/settings/advanced">設定 → 高度なオプション</a> をご確認ください（<a href="/diagnostics">サポート情報</a>）。
</div>`} ${renderSlot($$result, $$slots["default"])} </main>`, auth && ses && !isGuest && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result2) => renderTemplate` <button${addAttribute("bo-agent " + (agentAwake ? "idle" : "asleep") + (mascotUrl !== "/mascot/baku.png" ? " custom" : ""), "class")} id="bo-agent" type="button" data-astro-transition-persist="bo-agent"${addAttribute(agentAwake ? "1" : "0", "data-awake")}${addAttribute(mascotEngine, "data-engine")} title="相棒（AI・エージェント）" aria-label="相棒（AI・エージェント）の稼働状況"> <span class="bo-agent-dots" aria-hidden="true"><i></i><i></i><i></i></span> <span class="bo-agent-zzz" aria-hidden="true" title="相棒はお休み中（Proで活動します）">Zzz</span> <span class="bo-agent-sprite-wrap"> <img class="bo-agent-img"${addAttribute(mascotUrl, "src")} alt="相棒" width="88" height="88" decoding="async"> </span> <span class="bo-agent-badge" id="bo-agent-badge"></span> <span class="bo-agent-check" id="bo-agent-check" aria-hidden="true" title="作業が完了しました"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"></path></svg></span> </button> <div class="bo-agent-pop" id="bo-agent-pop" hidden data-astro-transition-persist="bo-agent-pop"></div> ` })}`, renderScript($$result, "/Users/amberlinks/dev/baku-office/apps/client/src/layouts/App.astro?astro&type=script&index=0&lang.ts"), renderSlot($$result, $$slots["scripts"]));
}, "/Users/amberlinks/dev/baku-office/apps/client/src/layouts/App.astro", "self");
export {
  $$App as $,
  renderScript as r
};
