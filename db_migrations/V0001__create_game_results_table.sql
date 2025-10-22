CREATE TABLE IF NOT EXISTS game_results (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(100) DEFAULT 'Игрок',
    reaction_time INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reaction_time ON game_results(reaction_time);
CREATE INDEX idx_created_at ON game_results(created_at DESC);