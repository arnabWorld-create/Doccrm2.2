# 🚀 Vercel Environment Variables - Quick Reference

## 📋 **Copy These to Vercel Dashboard**

### **🔴 REQUIRED (8 variables)**

| Variable Name | Example Value | Where to Get |
|---------------|---------------|--------------|
| `DATABASE_URL` | `postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase → Settings → Database → Connection Pooling |
| `DIRECT_URL` | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` | Supabase → Settings → Database → Direct Connection |
| `JWT_SECRET` | `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase → Settings → API → anon public key |
| `NEXT_PUBLIC_SUPABASE_BUCKET` | `patient-reports` | Create in Supabase → Storage |
| `NEXT_PUBLIC_APP_URL` | `https://your-app-name.vercel.app` | Your Vercel app URL |
| `NODE_ENV` | `production` | Set to production |

### **🟡 OPTIONAL (Recommended)**

| Variable Name | Example Value | Purpose |
|---------------|---------------|---------|
| `SENTRY_DSN` | `https://xxx@sentry.io/xxx` | Error tracking |
| `LOG_LEVEL` | `info` | Logging level |
| `GEMINI_API_KEY` | `your-gemini-key` | AI features |

---

## ⚡ **Quick Setup Steps**

1. **Generate JWT Secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Get Supabase URLs:**
   - Go to Supabase Dashboard
   - Settings → API
   - Copy Project URL and anon key

3. **Get Database URLs:**
   - Supabase → Settings → Database
   - Copy both Connection Pooling and Direct URLs

4. **Add to Vercel:**
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Add each variable above
   - Set Environment: Production, Preview, Development

5. **Deploy:**
   - Click Deploy in Vercel
   - Your app will be live! 🚀

---

## 🔒 **Security Reminder**
- ✅ All variables are properly secured
- ✅ No hardcoded secrets in code
- ✅ JWT_SECRET is required (no fallbacks)
- ✅ Database credentials are environment-based

**Your Faith Clinic Medical CRM is production-ready! 🏥**