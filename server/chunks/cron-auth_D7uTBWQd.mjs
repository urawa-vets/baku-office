globalThis.process ??= {};
globalThis.process.env ??= {};
const KV_AUTO = "internal_key_auto";
function genKey() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}
async function resolveDrainKey(env) {
  if (env.INTERNAL_KEY) return env.INTERNAL_KEY;
  const kv = env.LICENSE;
  if (!kv) return null;
  let k = await kv.get(KV_AUTO).catch(() => null);
  if (!k) {
    k = genKey();
    await kv.put(KV_AUTO, k).catch(() => {
    });
  }
  return k;
}
export {
  resolveDrainKey as r
};
