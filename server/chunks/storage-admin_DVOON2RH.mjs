globalThis.process ??= {};
globalThis.process.env ??= {};
import { d as decryptField } from "./stripe_r-RFTlbb.mjs";
import { masterKey } from "./client_DbLECgB2.mjs";
const SECRET_RE = /apikey|api_key|token|secret|password|passwd|refresh|master_key|master_key_source|private|client_secret|\bsalt\b|hmac|display_name|license/i;
function isSecretName(name) {
  return SECRET_RE.test(String(name ?? ""));
}
function maskVal(v) {
  if (v == null) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return `••••（${s.length}文字・伏字）`;
}
const USER_COL_RE = /^(created_by|owner|owner_id|user_id|uid|actor|by|updated_by|edited_by)$/i;
function isUserColumn(name) {
  return USER_COL_RE.test(String(name ?? ""));
}
async function resolveUserLabels(env, ids) {
  const out = {};
  const uniq = [...new Set(ids.map((v) => v == null ? "" : String(v)).filter(Boolean))];
  if (!uniq.length) return out;
  let mk = "";
  try {
    mk = await masterKey(env);
  } catch {
  }
  for (const raw of uniq) {
    let uid = raw;
    const m = raw.match(/^([a-z]+):(.+)$/);
    if (m) {
      const idn = await env.DB.prepare("SELECT user_id FROM identities WHERE type=? AND external_id=?").bind(m[1], m[2]).first().catch(() => null);
      if (idn) uid = idn.user_id;
      else {
        out[raw] = raw;
        continue;
      }
    }
    const u = await env.DB.prepare("SELECT display_name, role FROM users WHERE id=?").bind(uid).first().catch(() => null);
    if (!u) {
      out[raw] = raw;
      continue;
    }
    let name = "";
    if (u.display_name && mk) {
      try {
        name = await decryptField(mk, String(u.display_name), "member-pii");
      } catch {
      }
    }
    out[raw] = name ? `${name}（${u.role}）` : `${uid.slice(0, 8)}…（${u.role}）`;
  }
  return out;
}
function extOfName(name) {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name ?? ""));
  return m ? m[1].toLowerCase() : "";
}
export {
  isUserColumn as a,
  extOfName as e,
  isSecretName as i,
  maskVal as m,
  resolveUserLabels as r
};
