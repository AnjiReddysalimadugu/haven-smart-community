CREATE TABLE IF NOT EXISTS push_tokens (
    id            UUID PRIMARY KEY,
    user_id       UUID         NOT NULL REFERENCES app_users (id),
    token         VARCHAR(255) NOT NULL,
    platform      VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_push_tokens_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);
