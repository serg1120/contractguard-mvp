-- Initial database schema for ContractGuard MVP
-- Migration: 001_initial_schema
-- Created: 2024

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    company VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    file_hash VARCHAR(64),
    mime_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'uploaded',
    extracted_text TEXT,
    analysis_results JSONB,
    risk_score INTEGER,
    risk_level VARCHAR(20),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create contract_risks table for detailed risk tracking
CREATE TABLE IF NOT EXISTS contract_risks (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    risk_type VARCHAR(100) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    description TEXT,
    matched_text TEXT,
    context TEXT,
    severity_score INTEGER,
    line_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create analysis_sessions table for tracking analysis history
CREATE TABLE IF NOT EXISTS analysis_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    session_type VARCHAR(50) DEFAULT 'analysis',
    status VARCHAR(50) DEFAULT 'started',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB
);

-- Create user_sessions table for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table for security and compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_risk_level ON contracts(risk_level);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_contracts_file_hash ON contracts(file_hash);

CREATE INDEX IF NOT EXISTS idx_contract_risks_contract_id ON contract_risks(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_risks_risk_type ON contract_risks(risk_type);
CREATE INDEX IF NOT EXISTS idx_contract_risks_risk_level ON contract_risks(risk_level);

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_contract_id ON analysis_sessions(contract_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_status ON analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_started_at ON analysis_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW contract_summary AS
SELECT 
    c.id,
    c.filename,
    c.status,
    c.risk_level,
    c.risk_score,
    c.created_at,
    u.username as uploaded_by,
    u.company,
    COUNT(cr.id) as total_risks,
    COUNT(CASE WHEN cr.risk_level = 'HIGH' THEN 1 END) as high_risks,
    COUNT(CASE WHEN cr.risk_level = 'MEDIUM' THEN 1 END) as medium_risks,
    COUNT(CASE WHEN cr.risk_level = 'LOW' THEN 1 END) as low_risks
FROM contracts c
JOIN users u ON c.user_id = u.id
LEFT JOIN contract_risks cr ON c.id = cr.contract_id
GROUP BY c.id, u.username, u.company;

CREATE OR REPLACE VIEW user_analytics AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.company,
    u.created_at,
    COUNT(c.id) as total_contracts,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_contracts,
    COUNT(CASE WHEN c.risk_level = 'HIGH' THEN 1 END) as high_risk_contracts,
    MAX(c.created_at) as last_upload,
    AVG(c.risk_score) as avg_risk_score
FROM users u
LEFT JOIN contracts c ON u.id = c.user_id
GROUP BY u.id, u.username, u.email, u.company, u.created_at;

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts and authentication data';
COMMENT ON TABLE contracts IS 'Uploaded contracts and their analysis results';
COMMENT ON TABLE contract_risks IS 'Individual risks identified in contracts';
COMMENT ON TABLE analysis_sessions IS 'Analysis session tracking for monitoring';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE audit_logs IS 'Security and compliance audit trail';

COMMENT ON VIEW contract_summary IS 'Summary view of contracts with risk statistics';
COMMENT ON VIEW user_analytics IS 'User analytics and usage statistics';

-- Insert version information
INSERT INTO audit_logs (action, resource_type, details, success, created_at) 
VALUES (
    'MIGRATION_APPLIED', 
    'DATABASE', 
    '{"migration": "001_initial_schema", "version": "1.0.0", "description": "Initial database schema"}',
    true,
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;