globalThis.process ??= {};
globalThis.process.env ??= {};
const globalStore = /* @__PURE__ */ new Map();
const scopedStores = /* @__PURE__ */ new WeakMap();
function storeFor(scope) {
  if (!scope) return globalStore;
  let m = scopedStores.get(scope);
  if (!m) {
    m = /* @__PURE__ */ new Map();
    scopedStores.set(scope, m);
  }
  return m;
}
async function memo(key, ttlMs, fn, scope) {
  const store = storeFor(scope);
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now) return hit.v;
  const v = await fn();
  store.set(key, { v, exp: now + ttlMs });
  return v;
}
function invalidateMemo(key, scope) {
  storeFor(scope).delete(key);
}
export {
  invalidateMemo as i,
  memo as m
};
