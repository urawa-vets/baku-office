globalThis.process ??= {};
globalThis.process.env ??= {};
function googleApiError(action, status, hint) {
  if (status === 403) {
    return `${action}に失敗しました（403）。この Google 機能の API が Google Cloud 側で有効化されていない可能性があります（管理者は「設定 → Google連携セットアップ」の「実疎通を確認」でどの API が未有効かを確認できます）。委任スコープ（権限）が不足していることもあります。`;
  }
  const tail = hint ? ` ${hint}` : "";
  if (status === 401) return `${action}に失敗しました（401）。Google 連携の再認証が必要かもしれません（設定 → Google連携）。${tail}`;
  if (status === 400) return `${action}に失敗しました（400）。日付・時刻の指定に問題がある可能性があります（「今日」「明日」や「7月5日」のように具体的な日付でもう一度お試しください）。${tail}`;
  return `${action}に失敗しました（${status}）。${tail}`;
}
export {
  googleApiError as g
};
