-- Add new user to Faith Clinic
-- Run this in Supabase SQL Editor

INSERT INTO "users" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'demo@doxcia.com',
  '$2b$08$D/chkgcbTNJhIh74Ltglwu7Do0EwytIAfiFhQyngCyaMMFYR47gpu',
  'Demo User',
  'doctor',
  true,
  NOW(),
  NOW()
);

-- New Login Credentials:
-- Email: demo@doxcia.com
-- Password: demo1234
