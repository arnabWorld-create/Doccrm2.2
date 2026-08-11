-- CreateTable
CREATE TABLE "clinic_profile" (
    "id" TEXT NOT NULL,
    "clinicName" TEXT NOT NULL DEFAULT 'Faith Clinic',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "workingHours" TEXT DEFAULT 'Mon-Sat: 9:00 AM - 8:00 PM | Sun: 10:00 AM - 2:00 PM',
    "doctorName" TEXT,
    "doctorQualification" TEXT,
    "registrationNumber" TEXT,
    "specialization" TEXT,
    "logo" TEXT,
    "tagline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_profile_pkey" PRIMARY KEY ("id")
);
