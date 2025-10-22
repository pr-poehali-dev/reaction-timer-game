CREATE TABLE IF NOT EXISTS t_p16878392_reaction_timer_game.click_results (
    id SERIAL PRIMARY KEY,
    player_name VARCHAR(100) NOT NULL,
    clicks INTEGER NOT NULL,
    cps NUMERIC(5,1) NOT NULL,
    duration INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_click_results_player ON t_p16878392_reaction_timer_game.click_results(player_name);
CREATE INDEX IF NOT EXISTS idx_click_results_cps ON t_p16878392_reaction_timer_game.click_results(cps DESC);