-- 全局文档批注与修订建议表
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  page_path TEXT NOT NULL,
  heading_id TEXT NOT NULL DEFAULT '',
  quote_text TEXT NOT NULL,
  quote_prefix TEXT NOT NULL DEFAULT '',
  quote_suffix TEXT NOT NULL DEFAULT '',
  suggestion TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_annotations_page_status
  ON annotations (page_path, status, created_at);

CREATE INDEX IF NOT EXISTS idx_annotations_status_created
  ON annotations (status, created_at);

-- 批注下的追评与维护者回复
CREATE TABLE IF NOT EXISTS annotation_replies (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL DEFAULT '',
  is_maintainer INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_replies_annotation
  ON annotation_replies (annotation_id, created_at);

-- 轻量匿名提交限流表（仅存哈希，不存原始 IP）
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
