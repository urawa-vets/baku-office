-- 0083_diag_build_id.sql — ビルド単位の生成過程トレース
-- diagnostics に build_id を付与し、特定ビルド（app_builds.id）で全工程ログを引けるようにする。
-- WHY: 従来 diagnostics は build_id を持たず全カテゴリ混在＝「どのビルドで何が起きたか」を後から復元できなかった。
ALTER TABLE diagnostics ADD COLUMN build_id TEXT;
CREATE INDEX IF NOT EXISTS idx_diag_build ON diagnostics(build_id, created_at);
