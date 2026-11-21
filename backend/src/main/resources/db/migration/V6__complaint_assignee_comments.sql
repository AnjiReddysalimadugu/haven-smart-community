ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS assignee_user_id UUID NULL,
    ADD COLUMN IF NOT EXISTS resolution_notes VARCHAR(2000) NULL;

CREATE TABLE IF NOT EXISTS complaint_comments (
    id UUID PRIMARY KEY,
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL,
    author_name VARCHAR(140) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_comments_complaint ON complaint_comments(complaint_id, created_at DESC);
