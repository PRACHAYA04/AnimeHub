CREATE TABLE IF NOT EXISTS members (
 id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL, password_hash TEXT NOT NULL,
 display_name VARCHAR(50) NOT NULL CHECK(length(btrim(display_name))>0), bio VARCHAR(500) NOT NULL DEFAULT '',
 role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','admin')),
 token_version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS members_email ON members(lower(email));
CREATE TABLE IF NOT EXISTS anime (
 id BIGSERIAL PRIMARY KEY, mal_id BIGINT UNIQUE, title VARCHAR(255) NOT NULL,
 title_th VARCHAR(255) NOT NULL DEFAULT '', title_japanese TEXT NOT NULL DEFAULT '',
 synopsis TEXT NOT NULL DEFAULT '', poster TEXT NOT NULL DEFAULT '',
 genres TEXT[] NOT NULL DEFAULT '{}', year INTEGER CHECK(year BETWEEN 1900 AND 2200),
 episodes INTEGER CHECK(episodes>=0), status TEXT NOT NULL DEFAULT '',
 jikan_score NUMERIC(4,2) CHECK(jikan_score BETWEEN 0 AND 10),
 source_url TEXT NOT NULL DEFAULT '', synced_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reviews (
 id BIGSERIAL PRIMARY KEY, member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
 text TEXT NOT NULL CHECK(char_length(btrim(text)) BETWEEN 10 AND 5000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(member_id,anime_id)
);
CREATE TABLE IF NOT EXISTS votes (
 member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
 score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 10), PRIMARY KEY(member_id,anime_id)
);
CREATE TABLE IF NOT EXISTS wishlist_items (
 member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
 added_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(member_id,anime_id)
);
CREATE INDEX IF NOT EXISTS reviews_anime ON reviews(anime_id,created_at DESC);
CREATE INDEX IF NOT EXISTS wishlist_member ON wishlist_items(member_id,added_at DESC);
CREATE OR REPLACE VIEW anime_vote_stats AS SELECT anime_id,count(*) AS vote_count,round(avg(score),1) AS member_rating FROM votes GROUP BY anime_id;
