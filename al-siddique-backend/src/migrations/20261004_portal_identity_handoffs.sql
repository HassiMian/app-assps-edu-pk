CREATE TABLE IF NOT EXISTS portal_identity_handoffs (
 id BIGSERIAL PRIMARY KEY,
 school_id INTEGER NOT NULL REFERENCES schools(id),
 user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 portal_role VARCHAR(24) NOT NULL CHECK (portal_role IN ('student','parent','teacher')),
 state VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','issued','delivered')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 issued_at TIMESTAMPTZ,
 issued_by INTEGER REFERENCES users(id),
 delivered_at TIMESTAMPTZ,
 delivered_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS portal_identity_handoffs_school_state_idx ON portal_identity_handoffs(school_id,state);
