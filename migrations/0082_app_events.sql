-- 外部イベントトリガの基盤（DDLのみ）。生成アプリの triggers（messaging 受信 / Google の新規データ）を
-- 起点に画面を自動実行するための実行履歴・重複防止・poll カーソルを保持する。
-- ディスパッチ実体（受信割り込み / ポーリング）は後続フェーズ。このフェーズでは基盤テーブルのみ用意する。

-- トリガ実行履歴。event_key で同一イベントの二重実行を防ぐ（app_id+trigger_id+event_key が一意）。
CREATE TABLE IF NOT EXISTS app_event_runs (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  trigger_id TEXT NOT NULL,
  source TEXT NOT NULL,
  event_key TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_event_runs_unique
ON app_event_runs(app_id, trigger_id, event_key);

-- ポーリング型トリガ（Gmail/Forms/Sheets/Drive/Calendar）の次回取得位置。
CREATE TABLE IF NOT EXISTS app_event_cursors (
  app_id TEXT NOT NULL,
  trigger_id TEXT NOT NULL,
  cursor TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(app_id, trigger_id)
);
