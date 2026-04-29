CREATE TABLE IF NOT EXISTS ai_usage (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    feature VARCHAR(50) NOT NULL, 
    tanggal DATE NOT NULL,
    usage_count INT DEFAULT 1,
    UNIQUE KEY user_feature_date (user_id, feature, tanggal)
);
