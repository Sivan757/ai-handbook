CREATE TABLE annotations_new (
  id TEXT PRIMARY KEY,
  page_path TEXT NOT NULL,
  heading_id TEXT NOT NULL DEFAULT '',
  quote_text TEXT NOT NULL,
  quote_prefix TEXT NOT NULL DEFAULT '',
  quote_suffix TEXT NOT NULL DEFAULT '',
  suggestion TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL DEFAULT '',
  delete_token_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed', 'deleted')),
  resolution_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO annotations_new (
  id, page_path, heading_id, quote_text, quote_prefix, quote_suffix,
  suggestion, author_name, author_email, delete_token_hash,
  status, resolution_note, created_at, updated_at
)
SELECT
  id, page_path, heading_id, quote_text, quote_prefix, quote_suffix,
  suggestion, author_name, author_email, '',
  status, resolution_note, created_at, updated_at
FROM annotations;

CREATE TABLE annotation_replies_temp (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL DEFAULT '',
  is_maintainer INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

INSERT INTO annotation_replies_temp (id, annotation_id, body, author_name, author_email, is_maintainer, created_at)
SELECT id, annotation_id, body, author_name, author_email, is_maintainer, created_at
FROM annotation_replies;

DROP TABLE annotation_replies;
DROP TABLE annotations;

ALTER TABLE annotations_new RENAME TO annotations;

CREATE INDEX idx_annotations_page_status
  ON annotations (page_path, status, created_at);

CREATE INDEX idx_annotations_status_created
  ON annotations (status, created_at);

CREATE TABLE annotation_replies (
  id TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL DEFAULT '',
  delete_token_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  is_maintainer INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

INSERT INTO annotation_replies (
  id, annotation_id, body, author_name, author_email, delete_token_hash, status, is_maintainer, created_at
)
SELECT
  id, annotation_id, body, author_name, author_email, '', 'active', is_maintainer, created_at
FROM annotation_replies_temp;

DROP TABLE annotation_replies_temp;

CREATE INDEX idx_replies_annotation
  ON annotation_replies (annotation_id, status, created_at);
