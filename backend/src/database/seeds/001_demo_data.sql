-- Demo data for ContractGuard MVP
-- Seed: 001_demo_data
-- Created: 2024

-- Insert demo users (passwords are hashed for 'password123')
INSERT INTO users (username, email, password_hash, full_name, company, role, email_verified) VALUES
('demo_user', 'demo@contractguard.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqyc4/Oe/q6UJ8mQYjnGzIS', 'Demo User', 'Demo Construction Co.', 'user', true),
('admin_user', 'admin@contractguard.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqyc4/Oe/q6UJ8mQYjnGzIS', 'Admin User', 'ContractGuard Inc.', 'admin', true),
('test_contractor', 'contractor@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqyc4/Oe/q6UJ8mQYjnGzIS', 'John Contractor', 'ABC Construction', 'user', true)
ON CONFLICT (email) DO NOTHING;

-- Insert demo contracts
INSERT INTO contracts (user_id, filename, file_path, file_size, file_hash, mime_type, status, extracted_text, risk_score, risk_level, processed_at) VALUES
(
    (SELECT id FROM users WHERE email = 'demo@contractguard.com'),
    'sample_high_risk_contract.pdf',
    '/uploads/demo/sample_high_risk_contract.pdf',
    245760,
    'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef12',
    'application/pdf',
    'completed',
    'SUBCONTRACTOR AGREEMENT

This Agreement is entered into between GENERAL CONTRACTOR ("Contractor") and SUBCONTRACTOR ("Sub").

PAYMENT TERMS:
Payment to Subcontractor shall be made only upon receipt of payment from Owner to Contractor for work performed by Subcontractor. Contractor shall have no obligation to pay Subcontractor until such payment is received.

LIABILITY:
Subcontractor agrees to indemnify and hold harmless Contractor from any and all claims, damages, losses, and expenses arising out of or resulting from the performance of this Agreement, without limitation.

TERMINATION:
Contractor may terminate this Agreement immediately upon written notice for any reason or no reason at Contractor''s sole discretion.

NOTICE:
Any notice required under this Agreement must be given in writing within 24 hours of the event requiring notice.',
    85,
    'HIGH',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    (SELECT id FROM users WHERE email = 'contractor@example.com'),
    'standard_contract.pdf',
    '/uploads/demo/standard_contract.pdf',
    189432,
    'fed321cba987gfe654dcb321098fed654cba321098765fedc432109876543ba',
    'application/pdf',
    'completed',
    'STANDARD SUBCONTRACTOR AGREEMENT

This Agreement governs the relationship between General Contractor and Subcontractor.

PAYMENT TERMS:
Payment shall be made within 30 days of invoice submission, provided work is completed satisfactorily and all required documentation is submitted.

SCOPE OF WORK:
Subcontractor shall perform electrical installation work as specified in attached plans and specifications.

INSURANCE:
Subcontractor shall maintain appropriate insurance coverage as required by law and industry standards.',
    25,
    'LOW',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Insert corresponding contract risks for the high-risk contract
INSERT INTO contract_risks (contract_id, risk_type, risk_level, description, matched_text, context, severity_score) VALUES
(
    (SELECT id FROM contracts WHERE filename = 'sample_high_risk_contract.pdf'),
    'PAYMENT_TERMS',
    'HIGH',
    'Pay-when-paid clause identified - payment depends on owner payment',
    'Payment to Subcontractor shall be made only upon receipt of payment from Owner',
    'PAYMENT TERMS: Payment to Subcontractor shall be made only upon receipt of payment from Owner to Contractor for work performed by Subcontractor.',
    90
),
(
    (SELECT id FROM contracts WHERE filename = 'sample_high_risk_contract.pdf'),
    'LIABILITY',
    'HIGH',
    'Unlimited liability clause - subcontractor assumes all risks',
    'indemnify and hold harmless Contractor from any and all claims, damages, losses, and expenses',
    'LIABILITY: Subcontractor agrees to indemnify and hold harmless Contractor from any and all claims, damages, losses, and expenses arising out of or resulting from the performance of this Agreement, without limitation.',
    85
),
(
    (SELECT id FROM contracts WHERE filename = 'sample_high_risk_contract.pdf'),
    'TERMINATION',
    'HIGH',
    'Termination for convenience - contractor can terminate without cause',
    'terminate this Agreement immediately upon written notice for any reason or no reason',
    'TERMINATION: Contractor may terminate this Agreement immediately upon written notice for any reason or no reason at Contractor''s sole discretion.',
    80
),
(
    (SELECT id FROM contracts WHERE filename = 'sample_high_risk_contract.pdf'),
    'NOTICE_REQUIREMENTS',
    'MEDIUM',
    'Short notice period - only 24 hours for required notices',
    'Any notice required under this Agreement must be given in writing within 24 hours',
    'NOTICE: Any notice required under this Agreement must be given in writing within 24 hours of the event requiring notice.',
    60
);

-- Insert analysis sessions
INSERT INTO analysis_sessions (user_id, contract_id, session_type, status, started_at, completed_at, metadata) VALUES
(
    (SELECT id FROM users WHERE email = 'demo@contractguard.com'),
    (SELECT id FROM contracts WHERE filename = 'sample_high_risk_contract.pdf'),
    'analysis',
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '2 days 5 minutes',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    '{"processing_time_ms": 4500, "patterns_matched": 4, "openai_tokens_used": 1250}'
),
(
    (SELECT id FROM users WHERE email = 'contractor@example.com'),
    (SELECT id FROM contracts WHERE filename = 'standard_contract.pdf'),
    'analysis',
    'completed',
    CURRENT_TIMESTAMP - INTERVAL '1 day 3 minutes',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    '{"processing_time_ms": 3200, "patterns_matched": 0, "openai_tokens_used": 890}'
);

-- Insert audit logs for demo activity
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, success) VALUES
(
    (SELECT id FROM users WHERE email = 'demo@contractguard.com'),
    'USER_LOGIN',
    'USER',
    (SELECT id FROM users WHERE email = 'demo@contractguard.com'),
    '{"method": "password", "user_agent": "Mozilla/5.0 (Demo Browser)"}',
    '192.168.1.100',
    true
),
(
    (SELECT id FROM users WHERE email = 'demo@contractguard.com'),
    'CONTRACT_UPLOAD',
    'CONTRACT',
    (SELECT id FROM contracts WHERE filename = 'sample_high_risk_contract.pdf'),
    '{"filename": "sample_high_risk_contract.pdf", "file_size": 245760}',
    '192.168.1.100',
    true
),
(
    (SELECT id FROM users WHERE email = 'demo@contractguard.com'),
    'CONTRACT_ANALYSIS',
    'CONTRACT',
    (SELECT id FROM contracts WHERE filename = 'sample_high_risk_contract.pdf'),
    '{"analysis_type": "pattern_matching", "risks_found": 4, "risk_level": "HIGH"}',
    '192.168.1.100',
    true
),
(
    (SELECT id FROM users WHERE email = 'contractor@example.com'),
    'USER_LOGIN',
    'USER',
    (SELECT id FROM users WHERE email = 'contractor@example.com'),
    '{"method": "password", "user_agent": "Mozilla/5.0 (Demo Browser)"}',
    '192.168.1.101',
    true
),
(
    (SELECT id FROM users WHERE email = 'contractor@example.com'),
    'CONTRACT_UPLOAD',
    'CONTRACT',
    (SELECT id FROM contracts WHERE filename = 'standard_contract.pdf'),
    '{"filename": "standard_contract.pdf", "file_size": 189432}',
    '192.168.1.101',
    true
);

-- Update user last_login timestamps
UPDATE users SET last_login = CURRENT_TIMESTAMP - INTERVAL '1 hour' WHERE email = 'demo@contractguard.com';
UPDATE users SET last_login = CURRENT_TIMESTAMP - INTERVAL '2 hours' WHERE email = 'contractor@example.com';
UPDATE users SET last_login = CURRENT_TIMESTAMP - INTERVAL '1 week' WHERE email = 'admin@contractguard.com';

-- Record seed data application
INSERT INTO audit_logs (action, resource_type, details, success, created_at) 
VALUES (
    'SEED_DATA_APPLIED', 
    'DATABASE', 
    '{"seed": "001_demo_data", "version": "1.0.0", "description": "Initial demo data for testing and development"}',
    true,
    CURRENT_TIMESTAMP
);