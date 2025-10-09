-- Database schema for AI Meal Prep Assistant image system

CREATE TABLE recipes (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    ingredients JSONB,
    instructions TEXT,
    macros JSONB,
    cost_estimate DECIMAL(10,2),
    image_id UUID REFERENCES images(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE images (
    id UUID PRIMARY KEY,
    recipe_id UUID REFERENCES recipes(id),
    category TEXT,
    url TEXT,
    hash TEXT,
    source TEXT CHECK (source IN ('generated', 'api', 'stock', 'placeholder')),
    prompt TEXT,
    style_version TEXT,
    cost_estimate DECIMAL(10,2),
    generated_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP
);

CREATE TABLE image_gen_log (
    id UUID PRIMARY KEY,
    image_id UUID REFERENCES images(id),
    api_provider TEXT,
    tokens_used INT,
    cost_estimate DECIMAL(10,2),
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system_limits (
    id SERIAL PRIMARY KEY,
    month TEXT,
    max_monthly_spend DECIMAL(10,2) DEFAULT 300.00,
    current_spend DECIMAL(10,2) DEFAULT 0.00,
    allow_generation BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_image_quota (
    user_id UUID PRIMARY KEY,
    month TEXT,
    images_generated INT DEFAULT 0,
    quota_limit INT DEFAULT 20,
    last_reset TIMESTAMP DEFAULT NOW()
);
