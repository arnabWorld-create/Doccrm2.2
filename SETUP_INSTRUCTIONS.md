# 🚀 Setup Instructions

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env.local` file with your database URL:
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

### 4. Seed Database with Sample Data
```bash
npx prisma db seed
```

This will create:
- Demo user: `demo@doxcia.com` / `compass1234`
- Admin user: `admin@doxcia.com` / `admin123`
- 10 sample patients with medical history

### 5. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

---

## 🔐 Login Credentials

### Demo Account (Recommended)
- **Email:** `demo@doxcia.com`
- **Password:** `compass1234`

### Admin User
- **Email:** `admin@doxcia.com`
- **Password:** `admin123`

---

## 🔄 Reset Database

If you need to reset and re-seed:

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Run all migrations
3. Seed with sample data

---

## ✅ Troubleshooting

### Login not working?
1. Make sure you ran `npx prisma db seed`
2. Check that the database is connected
3. Verify `.env.local` has correct DATABASE_URL

### Database connection error?
1. Check your DATABASE_URL in `.env.local`
2. Make sure the database server is running
3. Verify credentials are correct

### Still having issues?
1. Check the console for error messages
2. Look at the server logs
3. Verify all environment variables are set

---

## 📚 Documentation

- `DEMO_CREDENTIALS.md` - Login credentials
- `README.md` - Project overview
- `IMPLEMENTATION_COMPLETE.md` - Features implemented

---

**Last Updated:** December 29, 2025
