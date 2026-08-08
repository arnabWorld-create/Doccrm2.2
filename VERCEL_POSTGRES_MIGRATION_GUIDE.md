# Vercel Postgres Migration Guide

## Step 1: Get Vercel Postgres Connection Strings

1. Go to your Vercel project dashboard
2. Click **Storage** tab
3. Click on your Postgres database
4. Go to **.env.local** tab
5. Copy these values:
   - `POSTGRES_PRISMA_URL` (for DATABASE_URL)
   - `POSTGRES_URL_NON_POOLING` (for DIRECT_URL)

## Step 2: Update Environment Variables in Vercel

1. Go to **Settings** → **Environment Variables**
2. Update/Add these variables:

```
DATABASE_URL = (paste POSTGRES_PRISMA_URL value)
DIRECT_URL = (paste POSTGRES_URL_NON_POOLING value)
JWT_SECRET = (your generated secret - keep the same one)
NEXT_PUBLIC_APP_URL = https://doccrm21.vercel.app
NODE_ENV = production
```

**Important:** If you're still using Supabase for file storage, keep these:
```
NEXT_PUBLIC_SUPABASE_URL = (your supabase url)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (your supabase anon key)
NEXT_PUBLIC_SUPABASE_BUCKET = patient-reports
```

## Step 3: Redeploy to Run Migrations

The updated build script will automatically run migrations during deployment.

1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

## Step 4: Add Demo User

After deployment succeeds:

1. Go to **Storage** → Your Postgres database
2. Click **Query** tab
3. Copy and paste the contents of `VERCEL_POSTGRES_SETUP.sql`
4. Click **Run Query**

This creates a demo admin user:
- **Email:** admin@doxcia.com
- **Password:** admin123

## Step 5: Test Login

1. Go to https://doccrm21.vercel.app/auth/login
2. Login with:
   - Email: admin@doxcia.com
   - Password: admin123

## Troubleshooting

### If migrations fail during build:
- Check that DATABASE_URL and DIRECT_URL are set correctly
- Make sure the database is accessible from Vercel

### If login still fails:
- Check Vercel function logs for the exact error
- Verify JWT_SECRET is set
- Verify the demo user was created (run the SELECT query)

### To check if tables exist:
Run this query in Vercel Postgres Query tab:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see tables like: User, Patient, Visit, Appointment, etc.
