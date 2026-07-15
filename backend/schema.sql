-- Creación de la tabla `cards`
CREATE TABLE IF NOT EXISTS cards (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    set_name VARCHAR(100),
    card_type VARCHAR(100),
    energy_cost INTEGER,
    element VARCHAR(50),
    rarity VARCHAR(50),
    ability_text TEXT,
    image_url TEXT
);

-- Creación de la tabla `user_collection`
CREATE TABLE IF NOT EXISTS user_collection (
    card_id VARCHAR(255) PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
    normal_count INTEGER DEFAULT 0,
    foil_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
