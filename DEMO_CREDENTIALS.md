# 🔐 Demo Credentials

## Login Credentials

### Demo Account (Easy Testing) ⭐
- **Email:** `demo@doxcia.com`
- **Password:** `compass1234`

### Demo User Account
- **Email:** `demo@doxcia.com`
- **Password:** `compass1234`

### Admin Account  
- **Email:** `admin@doxcia.com`
- **Password:** `admin123`

---

## 📝 How to Use

1. Go to http://localhost:3000/auth/login
2. Enter one of the credentials above
3. Click "Login"

---

## 🗂️ Sample Data

Both accounts come with pre-seeded sample data:

### Patients (10 total)
- FC-001: Rajesh Kumar Sharma (Viral Fever)
- FC-002: Priya Patel (Migraine)
- FC-003: Amit Singh (Cardiac issues)
- FC-004: Lakshmi Iyer (Gastritis)
- FC-005: Mohammed Rizwan (Asthma)
- FC-006: Sunita Devi (Osteoarthritis)
- FC-007: Arjun Reddy (Urticaria)
- FC-008: Kavita Deshmukh (Anemia)
- FC-009: Vikram Malhotra (Back pain)
- FC-010: Meera Nair (Hypothyroidism)

### Features to Test
- ✅ Patient management
- ✅ Visit tracking
- ✅ Appointment scheduling
- ✅ Analytics dashboard
- ✅ Payment tracking
- ✅ Invoice generation
- ✅ Medical reports

---

## 🔄 Reset Database

To reset the database and re-seed with fresh data:

```bash
# Reset database
npx prisma migrate reset

# Or manually seed
npx prisma db seed
```

---

## 🚀 First Steps

1. **Login** with demo credentials
2. **View Patients** - See all 10 sample patients
3. **Check Analytics** - View patient statistics
4. **Create Visit** - Add a new visit for a patient
5. **Generate Invoice** - Create an invoice for a visit
6. **Track Payments** - View payment analytics

---

## 💡 Tips

- Use the demo account for testing features
- Use the admin account for production-like testing
- All sample data is realistic Indian medical data
- Patients have multiple visits with detailed medical history
- Try the analytics dashboard to see aggregated data

---

**Last Updated:** December 29, 2025
