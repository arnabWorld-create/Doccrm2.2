# Faith Clinic - Doctor CRM & Landing Page

**Status**: 🟢 Private Beta (Investor-Ready MVP)  
**Scale**: 0-100 clinics maximum  
**Purpose**: Prove product-market fit and secure seed funding

---

## ⚠️ READ THIS FIRST

**If you're a founder, investor, or technical advisor**, start here:

1. **[FOUNDER_QUICK_START.md](FOUNDER_QUICK_START.md)** - Your complete playbook
2. **[INVESTOR_MVP.md](INVESTOR_MVP.md)** - Technical appendix for investors
3. **[100_CLINIC_OPERATIONS.md](100_CLINIC_OPERATIONS.md)** - Operational limits and monitoring
4. **[DATA_DISCIPLINE.md](DATA_DISCIPLINE.md)** - Data integrity rules
5. **[FEATURE_FREEZE.md](FEATURE_FREEZE.md)** - Change control process

**If you're a developer**, read the above documents before making any changes.

---

## What This Is

A comprehensive clinic management system with an integrated landing page for medical practices in India. Built as a private beta MVP to validate product-market fit before scaling.

### Honest Assessment
- ✅ **Working product**: Real clinics can use it today
- ✅ **Feature complete**: Covers core clinic workflows
- ✅ **Documented debt**: All technical decisions documented
- ⚠️ **Scale limit**: Works for 100 clinics max
- ⚠️ **Security**: Basic security for beta, not production-grade
- ⚠️ **Performance**: Already showing issues at small scale

**This is intentionally limited.** See [INVESTOR_MVP.md](INVESTOR_MVP.md) for full context.

## 🚀 Features

### Landing Page
- Professional landing page at root URL (/)
- Fully responsive design
- WhatsApp booking integration
- Google Maps integration
- SEO optimized
- Fast loading with Next.js optimization

### CRM System
- Patient management
- Appointment scheduling
- Visit history tracking
- Prescription generation & printing
- Medical reports upload (Supabase storage)
- Analytics dashboard
- Calendar view
- Patient search
- Export functionality

## 📋 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Storage:** Supabase Storage
- **Authentication:** JWT
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI + Custom components

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Copy `.env.example` to `.env.local` and fill in your values:

```env
DATABASE_URL="your-database-url"
DIRECT_URL="your-direct-database-url"
JWT_SECRET="your-jwt-secret"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SUPABASE_BUCKET="patient-reports"
```

### 3. Run Database Migrations
```bash
npx prisma migrate dev
```

### 4. Seed Database
```bash
npx prisma db seed
```

This creates a default user:
- Email: `demo@doxcia.com`
- Password: `compass1234`

### 5. Start Development Server
```bash
npm run dev
```

Visit:
- Landing Page: http://localhost:3000
- CRM Login: http://localhost:3000/auth/login

## 📦 Production Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import your repository
- Framework: Next.js (auto-detected)

3. **Set Environment Variables**

In Vercel Dashboard → Settings → Environment Variables:

```env
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
JWT_SECRET=[generate-random-32-char-string]
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_BUCKET=patient-reports
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. **Deploy**
Click "Deploy" and wait for build to complete.

5. **Run Migrations**
```bash
DATABASE_URL="your-production-url" npx prisma migrate deploy
DATABASE_URL="your-production-url" npx prisma db seed
```

## 📚 Documentation

### 🎯 Start Here (Mandatory Reading)
- **[FOUNDER_QUICK_START.md](FOUNDER_QUICK_START.md)** - Complete playbook for founders
- **[INVESTOR_MVP.md](INVESTOR_MVP.md)** - Technical appendix for investors
- **[100_CLINIC_OPERATIONS.md](100_CLINIC_OPERATIONS.md)** - What breaks at scale
- **[DATA_DISCIPLINE.md](DATA_DISCIPLINE.md)** - Data integrity rules
- **[FEATURE_FREEZE.md](FEATURE_FREEZE.md)** - Change control process

### 📖 Technical Documentation
- `CTO_ASSESSMENT.md` - Brutal technical assessment (read for context)
- `DEPLOYMENT.md` - Detailed deployment guide
- `VERCEL_DEPLOYMENT_QUICK_GUIDE.md` - Quick Vercel setup
- `VERCEL_FIX_PGBOUNCER.md` - Fix PgBouncer connection issues
- `VERCEL_ENV_SETUP.md` - Environment variables reference
- `SUPABASE_POOLER_SETUP.md` - Supabase connection pooling

### 🔧 Performance & Fixes
- `ANALYTICS_DIAGNOSIS.md` - Analytics performance issues
- `ANALYTICS_CONNECTION_POOL_FIX.md` - Connection pool fixes
- `ANALYTICS_PERFORMANCE_GUIDE.md` - Performance optimization guide
- `VERCEL_CONNECTION_POOL_FIX.md` - Vercel-specific fixes

## 🏗️ Project Structure

```
├── app/                    # Next.js app directory
│   ├── page.tsx           # Landing page (root)
│   ├── auth/              # Authentication pages
│   ├── patients/          # Patient management
│   ├── appointments/      # Appointment scheduling
│   ├── calendar/          # Calendar view
│   ├── analytics/         # Analytics dashboard
│   ├── settings/          # Settings pages
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities & helpers
├── prisma/               # Database schema & migrations
├── public/               # Static assets
│   └── landing-assets/   # Landing page images
└── utils/                # Utility functions
```

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Environment variables for sensitive data
- Supabase Row Level Security (RLS)
- HTTPS enforced in production

## 📱 Landing Page Sections

1. **Header** - Navigation with mobile menu
2. **Hero** - Introduction with CTAs
3. **About** - Doctor profile & credentials
4. **Services** - Medical services offered
5. **Gallery** - Clinic photos
6. **Testimonials** - Patient reviews
7. **Contact** - Address, hours, map
8. **Footer** - Links & social media

## 🎨 Customization

### Update Clinic Information
Edit `app/page.tsx` to update:
- Clinic name & doctor name
- Contact numbers
- Address
- Services
- Testimonials
- Social media links

### Update Colors
Edit `tailwind.config.js` for brand colors.

### Update Logo
Replace `public/landing-assets/clinic-logo.png`

## 🧪 Testing

```bash
# Run build test
npm run build

# Start production server locally
npm start
```

## 📞 Support

For issues or questions:
- Check documentation files
- Review Vercel deployment logs
- Check browser console for errors

## 📄 License

Private project for medical practice management.

---

**Built with ❤️ for healthcare professionals**
