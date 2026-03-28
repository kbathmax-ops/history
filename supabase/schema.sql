-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Sanctions episodes table
CREATE TABLE IF NOT EXISTS episodes (
  episode_id                TEXT PRIMARY KEY,
  name                      TEXT NOT NULL,
  start_date                DATE NOT NULL,
  end_date                  DATE,
  initiators                TEXT[] NOT NULL DEFAULT '{}',
  target                    TEXT NOT NULL,
  target_gdp_pct_world      FLOAT,
  sector                    TEXT NOT NULL,
  goals                     TEXT[] NOT NULL DEFAULT '{}',
  multilateral              BOOLEAN NOT NULL DEFAULT false,
  un_backed                 BOOLEAN NOT NULL DEFAULT false,
  enforcement_intensity     TEXT NOT NULL CHECK (enforcement_intensity IN ('low','medium','high','critical')),
  measures                  TEXT[] NOT NULL DEFAULT '{}',
  trigger_event             TEXT,
  workarounds               TEXT[] NOT NULL DEFAULT '{}',
  target_economy            JSONB,
  outcome                   TEXT,
  objective_achieved        TEXT CHECK (objective_achieved IN ('yes','partial','no','backfire')),
  outcomes_6mo              JSONB,
  outcomes_12mo             JSONB,
  success_score             FLOAT CHECK (success_score >= 0 AND success_score <= 1),
  time_to_impact_months     INT,
  time_to_resolution_months INT,
  key_turning_points        TEXT[] NOT NULL DEFAULT '{}',
  resolution                TEXT,
  lessons                   TEXT[] NOT NULL DEFAULT '{}',
  tags                      TEXT[] NOT NULL DEFAULT '{}',
  key_sources               TEXT[] NOT NULL DEFAULT '{}',
  wikipedia_url             TEXT,
  narrative                 TEXT,
  embedding                 vector(1536),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index for approximate nearest-neighbor search on embeddings
CREATE INDEX IF NOT EXISTS episodes_embedding_idx
  ON episodes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index on frequently filtered columns
CREATE INDEX IF NOT EXISTS episodes_target_idx ON episodes (target);
CREATE INDEX IF NOT EXISTS episodes_sector_idx ON episodes (sector);
CREATE INDEX IF NOT EXISTS episodes_multilateral_idx ON episodes (multilateral);
CREATE INDEX IF NOT EXISTS episodes_enforcement_intensity_idx ON episodes (enforcement_intensity);
CREATE INDEX IF NOT EXISTS episodes_outcome_idx ON episodes (outcome);
CREATE INDEX IF NOT EXISTS episodes_objective_achieved_idx ON episodes (objective_achieved);

-- Pending cases: AI-generated episodes awaiting admin review
CREATE TABLE IF NOT EXISTS pending_cases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_data JSONB NOT NULL,
  query        TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Semantic search function using pgvector cosine similarity
CREATE OR REPLACE FUNCTION match_episodes(
  query_embedding   vector(1536),
  match_count       int DEFAULT 10,
  match_threshold   float DEFAULT 0.0
)
RETURNS TABLE (
  episode_id                TEXT,
  name                      TEXT,
  start_date                DATE,
  end_date                  DATE,
  initiators                TEXT[],
  target                    TEXT,
  target_gdp_pct_world      FLOAT,
  sector                    TEXT,
  goals                     TEXT[],
  multilateral              BOOLEAN,
  un_backed                 BOOLEAN,
  enforcement_intensity     TEXT,
  measures                  TEXT[],
  trigger_event             TEXT,
  workarounds               TEXT[],
  target_economy            JSONB,
  outcome                   TEXT,
  objective_achieved        TEXT,
  outcomes_6mo              JSONB,
  outcomes_12mo             JSONB,
  success_score             FLOAT,
  time_to_impact_months     INT,
  time_to_resolution_months INT,
  key_turning_points        TEXT[],
  resolution                TEXT,
  lessons                   TEXT[],
  tags                      TEXT[],
  key_sources               TEXT[],
  wikipedia_url             TEXT,
  narrative                 TEXT,
  similarity                FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.episode_id, e.name, e.start_date, e.end_date, e.initiators, e.target,
    e.target_gdp_pct_world, e.sector, e.goals, e.multilateral, e.un_backed,
    e.enforcement_intensity, e.measures, e.trigger_event, e.workarounds,
    e.target_economy, e.outcome, e.objective_achieved, e.outcomes_6mo,
    e.outcomes_12mo, e.success_score, e.time_to_impact_months,
    e.time_to_resolution_months, e.key_turning_points, e.resolution,
    e.lessons, e.tags, e.key_sources, e.wikipedia_url, e.narrative,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM episodes e
  WHERE e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
