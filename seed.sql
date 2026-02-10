CREATE TABLE asset_types (
    code VARCHAR(20) PRIMARY KEY,
    display_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT NOW()
);

-- WALLETS (ACCOUNTS) each user has 2 wallets
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    asset_code VARCHAR(20) REFERENCES asset_types(code),
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    UNIQUE(user_id, asset_code)
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    wallet_id UUID REFERENCES wallets(id),
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- DATA SEEDING
INSERT INTO asset_types (code, display_name) VALUES ('GOLD', 'Gold Coins'), ('DIAMOND', 'Diamonds');

-- Passwords for all 'raj123'
INSERT INTO users (id, username, email, password_hash, role) VALUES 
('00000000-0000-0000-0000-000000000001', 'system_treasury', 'treasury@dino.com', '$2b$10$zAQFZ8kKXxOEAK1jQMOIxu38/oH6PPMWZzKEaN1GR2/RAljuiSAie', 'ADMIN'),
('00000000-0000-0000-0000-000000000002', 'system_revenue', 'revenue@dino.com', '$2b$10$zAQFZ8kKXxOEAK1jQMOIxu38/oH6PPMWZzKEaN1GR2/RAljuiSAie', 'ADMIN'),
('11111111-1111-1111-1111-111111111111', 'raj', 'rajnishad24082003@gmail.com', '$2b$10$zAQFZ8kKXxOEAK1jQMOIxu38/oH6PPMWZzKEaN1GR2/RAljuiSAie', 'USER');

INSERT INTO wallets (user_id, asset_code, balance) VALUES 
('00000000-0000-0000-0000-000000000001', 'GOLD', 1000000.00),
('00000000-0000-0000-0000-000000000002', 'GOLD', 0.00),
('11111111-1111-1111-1111-111111111111', 'GOLD', 500.00);

INSERT INTO wallets (user_id, asset_code, balance) VALUES 
('00000000-0000-0000-0000-000000000001', 'DIAMOND', 1000000.00),
('00000000-0000-0000-0000-000000000002', 'DIAMOND', 0.00),
('11111111-1111-1111-1111-111111111111', 'DIAMOND', 1500.00);