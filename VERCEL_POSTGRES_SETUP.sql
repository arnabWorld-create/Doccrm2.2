-- Quick setup script for Vercel Postgres
-- Run this in Vercel Postgres Query tab after migrations

-- Create a demo admin user
-- Email: admin@doxcia.com
-- Password: admin123

INSERT INTO "User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
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
ON CONFLICT (email) DO NOTHING;

-- Verify user was created
SELECT id, email, name, role, "isActive" FROM "User" WHERE email = 'admin@doxcia.com';
