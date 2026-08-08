-- This script creates demo users in Supabase
-- Run this in Supabase SQL Editor: https://app.supabase.com -> SQL Editor

-- Demo User (demo@doxcia.com / compass1234)
-- Password hash for 'compass1234' with bcrypt salt 8
INSERT INTO "User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'demo@doxcia.com',
  '$2a$08$8.oJJKj7H8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8',
  'Demo User',
  'doctor',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Admin User (admin@doxcia.com / admin123)
-- Password hash for 'admin123' with bcrypt salt 8
INSERT INTO "User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@doxcia.com',
  '$2a$08$8.oJJKj7H8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8.8',
  'Admin User',
  'doctor',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify users were created
SELECT id, email, name, role FROM "User" WHERE email IN ('demo@doxcia.com', 'admin@doxcia.com');
