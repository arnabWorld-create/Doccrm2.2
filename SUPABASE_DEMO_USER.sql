-- Create demo user in Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/sxrolbjqenouqppjycmo/sql

-- Email: admin@doxcia.com
-- Password: admin123

INSERT INTO users (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  'demo-admin-001',
  'admin@doxcia.com',
  '$2b$08$w0Zf0U5f4k/RgKEphDHN5.e7Sc/gNxdo4xqy0BRZjo6xfHsmg9Zay',
  'Admin User',
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  "updatedAt" = NOW();

-- Verify user was created
SELECT id, email, name, role, "isActive", "createdAt" 
FROM users 
WHERE email = 'admin@doxcia.com';
