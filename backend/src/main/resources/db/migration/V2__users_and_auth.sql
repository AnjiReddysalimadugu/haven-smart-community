CREATE TABLE app_users (
 id UUID PRIMARY KEY,
 email VARCHAR(180) NOT NULL,
 password_hash VARCHAR(100) NOT NULL,
 full_name VARCHAR(140) NOT NULL,
 role VARCHAR(30) NOT NULL,
 apartment_id UUID REFERENCES apartments(id),
 flat_id UUID REFERENCES flats(id),
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT uk_app_users_email UNIQUE (email)
);

CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_app_users_apartment ON app_users(apartment_id);
