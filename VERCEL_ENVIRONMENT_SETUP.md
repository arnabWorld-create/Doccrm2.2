# 🚀 Vercel Environment Variables Setup - Faith Clinic Medical CRM

## 📋 **Complete Environment Variables for Vercel**

### **🔴 REQUIRED VARIABLES (Must be set)**

#### **1. Database Configuration**
```env
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```
**Where to get:**
- Go to [Supabase Dashboard](https://app.supabase.com)
- Project Settings → Database → Connection Pooling
- Copy the "Connection string" for DATABASE_URL (with pgbouncer)
- Copy the "Direct connection" for DIRECT_URL (without pgbouncer)

#### **2. Authentication (CRITICAL)**
```env
JWT_SECRET=your-32-character-random-secret-here
```
**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Example output:** `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

#### **3. Supabase Configuration**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_BUCKET=patient-reports
```
**Where to get:**
- Supabase Dashboard → Settings → API
- Copy "Project URL" for NEXT_PUBLIC_SUPABASE_URL
- Copy "anon public" key for NEXT_PUBLIC_SUPABASE_ANON_KEY
- Use "patient-reports" for bucket name (or your custom bucket)

#### **4. Application Configuration**
```env
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NODE_ENV=production
```
**Replace:** `your-app-name` with your actual Vercel app name

### **🟡 OPTIONAL VARIABLES (Recommended for production)**

#### **5. Logging & Monitoring**
```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info
```

#### **6. Rate Limiting (Redis)**
```env
REDIS_URL=redis://default:password@redis-host:port
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

#### **7. AI Features (Optional)**
```env
GEMINI_API_KEY=your-gemini-api-key
```

#### **8. Payment Integration (If using payments)**
```env
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🛠️ **Step-by-Step Vercel Setup**

### **Step 1: Prepare Your Database**

1. **Create Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for setup to complete

2. **Run Database Migration:**
   ```bash
   # Set your database URL temporarily
   export DATABASE_URL="your-supabase-direct-url"
   
   # Run migrations
   npx prisma migrate deploy
   
   # Seed with demo data
   npx prisma db seed
   ```

3. **Set up Storage Bucket:**
   - Supabase Dashboard → Storage
   - Create bucket named "patient-reports"
   - Set public access policies

### **Step 2: Deploy to Vercel**

1. **Connect Repository:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository: `arnabWorld-create/Doc-Crm2.1`

2. **Configure Build Settings:**
   - Framework Preset: **Next.js** (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### **Step 3: Set Environment Variables in Vercel**

1. **Go to Project Settings:**
   - Vercel Dashboard → Your Project → Settings → Environment Variables

2. **Add Each Variable:**
   ```
   Variable Name: DATABASE_URL
   Value: postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
   Environment: Production, Preview, Development
   ```

3. **Repeat for all required variables above**

### **Step 4: Deploy**
- Click "Deploy" in Vercel
- Wait for build to complete
- Test your application

---

## 📝 **Environment Variables Checklist**

### **✅ Required for Basic Functionality**
- [ ] `DATABASE_URL` (Supabase connection with pgbouncer)
- [ ] `DIRECT_URL` (Supabase direct connection)
- [ ] `JWT_SECRET` (32-character random string)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` (Your Supabase project URL)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase anon key)
- [ ] `NEXT_PUBLIC_SUPABASE_BUCKET` (Storage bucket name)
- [ ] `NEXT_PUBLIC_APP_URL` (Your Vercel app URL)
- [ ] `NODE_ENV=production`

### **✅ Optional but Recommended**
- [ ] `SENTRY_DSN` (Error tracking)
- [ ] `LOG_LEVEL=info` (Logging level)
- [ ] `REDIS_URL` (Rate limiting)
- [ ] `GEMINI_API_KEY` (AI features)

---

## 🔧 **Quick Copy-Paste Template**

```env
# === REQUIRED VARIABLES ===
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
JWT_SECRET=GENERATE-32-CHAR-SECRET-HERE
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_BUCKET=patient-reports
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NODE_ENV=production

# === OPTIONAL VARIABLES ===
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info
GEMINI_API_KEY=your-gemini-api-key
```

---

## 🚨 **Security Notes**

1. **Never share these values publicly**
2. **Use different secrets for development and production**
3. **Rotate JWT_SECRET regularly**
4. **Monitor access logs**
5. **Enable Vercel's security headers**

---

## 🐛 **Common Issues & Solutions**

### **Database Connection Issues**
```
Error: P1001: Can't reach database server
```
**Solution:** Check DATABASE_URL format and Supabase connection pooling settings

### **JWT Secret Missing**
```
Error: JWT_SECRET environment variable is required
```
**Solution:** Generate and set JWT_SECRET in Vercel environment variables

### **Supabase Storage Issues**
```
Error: Storage bucket not found
```
**Solution:** Create "patient-reports" bucket in Supabase Storage

### **Build Failures**
```
Error: Module not found
```
**Solution:** Check package.json dependencies and run `npm install` locally

---

## 📞 **Support**

If you encounter issues:
1. Check Vercel build logs
2. Verify all environment variables are set
3. Test database connection
4. Check Supabase project status

**Your Faith Clinic Medical CRM will be live at:** `https://your-app-name.vercel.app` 🚀