CREATE TABLE IF NOT EXISTS broker_state (
    id smallint PRIMARY KEY CHECK (id = 1),
    records jsonb NOT NULL
);
INSERT INTO broker_state VALUES (1,'{"version":1,"counters":{},"loads":[],"trucks":[],"applications":[],"quotes":[],"trips":[],"requests":[],"documents":[],"events":[]}')
ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS freight_attachment (id text PRIMARY KEY, content bytea NOT NULL);
CREATE TABLE IF NOT EXISTS broker_session (fingerprint text PRIMARY KEY, expires_at timestamptz NOT NULL);
