# Push Database Schema to Supabase

Your Supabase database is empty. You need to apply the schema. Here are two options:

## Option 1: Push Schema from Local (RECOMMENDED)

Run this command in your terminal:

```cmd
npx prisma db push
```

This will:
- Read your `.env.local` file
- Connect to your Supabase database
- Create all tables, indexes, and constraints

## Option 2: Run Migrations

If you want to use migrations instead:

```cmd
npx prisma migrate deploy
```

## After Schema is Pushed

1. Verify tables exist in Supabase:
   - Go to: https://supabase.com/dashboard/project/sxrolbjqenouqppjycmo/editor
   - You should see tables: users, patients, visits, appointments, etc.

2. Add demo user:
   - Go to SQL Editor
   - Run the updated `SUPABASE_DEMO_USER.sql` script

3. Test login at: https://doccrm21.vercel.app/auth/login
   - Email: admin@doxcia.com
   - Password: admin123

## Troubleshooting

If you get connection errors:
- Make sure your `.env.local` has the correct Supabase credentials
- Check that your IP is allowed in Supabase (Settings → Database → Connection pooling)
