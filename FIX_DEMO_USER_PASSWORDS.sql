-- Fix demo user passwords with correct bcrypt hashes
-- Run this in Supabase SQL Editor

-- Update demo@doxcia.com with correct hash for 'compass1234'
UPDATE "users" 
SET password = '$2b$08$FXGem.kFRllqlFQ.6rwzkelNZ/itSNSnkuKEupdl2WUyWI9tLbt0y'
WHERE email = 'demo@doxcia.com';

-- Update admin@doxcia.com with correct hash for 'admin123'
UPDATE "users" 
SET password = '$2b$08$COyRCUv.dEXGV6KvAJnHfOyK2Q3ldPBzsrPeYNhfS04v2YywlomsS'
WHERE email = 'admin@doxcia.com';

-- Verify the updates
SELECT id, email, name, password FROM "users" WHERE email IN ('demo@doxcia.com', 'admin@doxcia.com');
