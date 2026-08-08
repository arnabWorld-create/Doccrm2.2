import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seeding database with sample data

  // Clear existing data
  await prisma.visit.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user for testing
  const demoHashedPassword = await bcrypt.hash('compass1234', 8);
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@doxcia.com',
      password: demoHashedPassword,
      name: 'Demo User',
      role: 'doctor',
      isActive: true,
    },
  });
  // Demo user created

  // Create default user - Demo User
  const hashedPassword = await bcrypt.hash('compass1234', 8);
  const user = await prisma.user.create({
    data: {
      email: 'demo@doxcia.com',
      password: hashedPassword,
      name: 'Demo User',
      role: 'doctor',
      isActive: true,
    },
  });
  // Default user created

  // Create sample patients with visits - Indian data
  const patients = [
    {
      patientId: 'FC-001',
      name: 'Rajesh Kumar Sharma',
      age: 42,
      gender: 'Male',
      contact: '+91-9876543210',
      address: 'Sector 15, Rohini, New Delhi',
      bloodGroup: 'B+',
      visits: [
        {
          visitDate: new Date('2025-11-13'),
          visitType: 'Consultation',
          chiefComplaint: 'बुखार और शरीर में दर्द 3 दिन से (Fever and body ache for 3 days)',
          signs: 'Fever, body ache, weakness, headache',
          investigations: 'CBC, Dengue NS1, Platelet count, Malaria test',
          diagnosis: 'Viral Fever (संभावित डेंगू)',
          temp: 102.5,
          spo2: 96,
          pulse: 88,
          bloodPressure: '130/85',
          treatment: 'Bed rest, plenty of fluids, fever monitoring, avoid aspirin',
          medicines: 'Paracetamol 650mg TID\nORS sachets\nDoxycycline 100mg BD',
          notes: 'Patient advised to monitor platelet count. Return immediately if bleeding or severe weakness.',
          followUpDate: new Date('2025-11-20'),
        },
      ],
    },
    {
      patientId: 'FC-002',
      name: 'Priya Patel',
      age: 28,
      gender: 'Female',
      contact: '+91-9123456789',
      address: 'Vastrapur, Ahmedabad, Gujarat',
      bloodGroup: 'O+',
      visits: [
        {
          visitDate: new Date('2025-11-12'),
          visitType: 'Consultation',
          chiefComplaint: 'सिरदर्द और उल्टी (Severe headache and vomiting)',
          signs: 'Migraine, nausea, photophobia, dizziness',
          investigations: 'BP monitoring',
          diagnosis: 'Migraine with Aura',
          temp: 98.4,
          spo2: 98,
          pulse: 72,
          bloodPressure: '110/70',
          treatment: 'Rest in dark room, avoid triggers (stress, bright lights)',
          medicines: 'Sumatriptan 50mg SOS\nDomperidone 10mg TID\nPropranolol 40mg OD',
          followUpDate: new Date('2025-11-26'),
        },
      ],
    },
    {
      patientId: 'FC-003',
      name: 'Amit Singh',
      age: 55,
      gender: 'Male',
      contact: '+91-9988776655',
      address: 'Gomti Nagar, Lucknow, Uttar Pradesh',
      bloodGroup: 'A+',
      chronicConditions: 'Type 2 Diabetes, Hypertension',
      visits: [
        {
          visitDate: new Date('2025-10-16'),
          visitType: 'Consultation',
          chiefComplaint: 'सीने में दर्द और सांस फूलना (Chest pain and breathlessness)',
          signs: 'Chest discomfort, shortness of breath, sweating, anxiety',
          investigations: 'ECG, Cardiac enzymes (Troponin), Lipid profile, HbA1c',
          diagnosis: 'Unstable Angina, Uncontrolled Diabetes',
          temp: 98.6,
          spo2: 94,
          pulse: 95,
          bloodPressure: '160/100',
          treatment: 'Immediate rest, oxygen support, cardiac monitoring, diabetes control',
          medicines: 'Aspirin 75mg OD\nAtorvastatin 40mg OD\nMetformin 500mg BD\nAmlodipine 5mg OD',
          referredTo: 'Dr. Mehta (Cardiologist), Apollo Hospital',
          notes: 'Patient has family history of heart disease. Advised lifestyle changes.',
          followUpDate: new Date('2025-10-31'),
        },
        {
          visitDate: new Date('2025-10-31'),
          visitType: 'Follow-up',
          chiefComplaint: 'Cardiac follow-up',
          signs: 'Much improved, no chest pain, breathing normal',
          investigations: 'ECG, Blood sugar monitoring',
          diagnosis: 'Stable Angina - Improving, Diabetes under control',
          temp: 98.4,
          spo2: 97,
          pulse: 78,
          bloodPressure: '135/85',
          treatment: 'Continue medications, regular exercise, diet control',
          medicines: 'Aspirin 75mg OD\nAtorvastatin 40mg OD\nMetformin 850mg BD\nAmlodipine 5mg OD\nMetoprolol 25mg OD',
          notes: 'Blood sugar levels improved. Continue monitoring.',
          followUpDate: new Date('2025-11-30'),
        },
      ],
    },
    {
      patientId: 'FC-004',
      name: 'Lakshmi Iyer',
      age: 35,
      gender: 'Female',
      contact: '+91-9445566778',
      address: 'T Nagar, Chennai, Tamil Nadu',
      bloodGroup: 'AB+',
      visits: [
        {
          visitDate: new Date('2025-11-10'),
          visitType: 'Consultation',
          chiefComplaint: 'கடுமையான வயிற்று வலி (Severe stomach pain and acidity)',
          signs: 'Abdominal pain, burning sensation, bloating, nausea',
          investigations: 'Endoscopy recommended, H. Pylori test',
          diagnosis: 'Gastritis, GERD',
          temp: 98.6,
          spo2: 99,
          pulse: 76,
          bloodPressure: '120/80',
          treatment: 'Avoid spicy food, eat small frequent meals, elevate head while sleeping',
          medicines: 'Pantoprazole 40mg OD (before breakfast)\nSucralfate suspension 10ml TID\nDigene syrup SOS',
          notes: 'Advised to avoid coffee, tea, and oily foods. Follow up if symptoms persist.',
          followUpDate: new Date('2025-11-24'),
        },
      ],
    },
    {
      patientId: 'FC-005',
      name: 'Mohammed Rizwan',
      age: 48,
      gender: 'Male',
      contact: '+91-9876512345',
      address: 'Charminar, Hyderabad, Telangana',
      bloodGroup: 'B+',
      allergies: 'Penicillin',
      visits: [
        {
          visitDate: new Date('2025-11-08'),
          visitType: 'Consultation',
          chiefComplaint: 'खांसी और सांस लेने में तकलीफ (Persistent cough and breathing difficulty)',
          signs: 'Dry cough, wheezing, chest tightness, shortness of breath',
          investigations: 'Chest X-ray, Spirometry, Allergy test',
          diagnosis: 'Bronchial Asthma (Acute exacerbation)',
          temp: 98.8,
          spo2: 92,
          pulse: 88,
          bloodPressure: '125/82',
          treatment: 'Nebulization, avoid dust and smoke, use inhaler regularly',
          medicines: 'Salbutamol inhaler 2 puffs SOS\nBudesonide inhaler 200mcg BD\nMontelukast 10mg OD\nAzithromycin 500mg OD x 3 days',
          notes: 'Patient advised to keep inhaler always. Avoid cold drinks and ice cream.',
          followUpDate: new Date('2025-11-22'),
        },
      ],
    },
    {
      patientId: 'FC-006',
      name: 'Sunita Devi',
      age: 62,
      gender: 'Female',
      contact: '+91-9334455667',
      address: 'Boring Road, Patna, Bihar',
      bloodGroup: 'O-',
      chronicConditions: 'Osteoarthritis, Hypertension',
      visits: [
        {
          visitDate: new Date('2025-11-05'),
          visitType: 'Consultation',
          chiefComplaint: 'घुटनों में दर्द (Severe knee pain and difficulty walking)',
          signs: 'Bilateral knee pain, stiffness, swelling, difficulty in movement',
          investigations: 'X-ray both knees, Vitamin D levels, Calcium levels',
          diagnosis: 'Osteoarthritis (Grade 2), Vitamin D deficiency',
          temp: 98.2,
          spo2: 98,
          pulse: 74,
          bloodPressure: '140/90',
          treatment: 'Hot water fomentation, physiotherapy, weight reduction, avoid stairs',
          medicines: 'Diclofenac 50mg BD (after food)\nCalcium + Vit D3 tablets OD\nGlucosamine 1500mg OD\nAmlodipine 5mg OD',
          notes: 'Patient advised physiotherapy exercises. Avoid prolonged standing.',
          followUpDate: new Date('2025-12-05'),
        },
      ],
    },
    {
      patientId: 'FC-007',
      name: 'Arjun Reddy',
      age: 24,
      gender: 'Male',
      contact: '+91-9123987654',
      address: 'Banjara Hills, Hyderabad, Telangana',
      bloodGroup: 'A+',
      visits: [
        {
          visitDate: new Date('2025-11-14'),
          visitType: 'Consultation',
          chiefComplaint: 'Skin rash and itching all over body',
          signs: 'Urticaria, red patches, intense itching, mild swelling',
          investigations: 'Allergy test recommended',
          diagnosis: 'Acute Urticaria (Allergic reaction)',
          temp: 98.6,
          spo2: 99,
          pulse: 80,
          bloodPressure: '118/76',
          treatment: 'Avoid allergens, cold compress, loose cotton clothes',
          medicines: 'Cetirizine 10mg OD\nCalamine lotion (topical)\nPrednisolone 20mg OD x 5 days',
          notes: 'Possible food allergy. Advised to maintain food diary.',
          followUpDate: new Date('2025-11-21'),
        },
      ],
    },
    {
      patientId: 'FC-008',
      name: 'Kavita Deshmukh',
      age: 31,
      gender: 'Female',
      contact: '+91-9876098760',
      address: 'Shivaji Nagar, Pune, Maharashtra',
      bloodGroup: 'B-',
      visits: [
        {
          visitDate: new Date('2025-11-11'),
          visitType: 'Consultation',
          chiefComplaint: 'थकान और चक्कर आना (Extreme fatigue and dizziness)',
          signs: 'Weakness, dizziness, pale skin, breathlessness on exertion',
          investigations: 'CBC, Hemoglobin, Iron studies, Thyroid profile',
          diagnosis: 'Iron Deficiency Anemia',
          temp: 98.4,
          spo2: 97,
          pulse: 92,
          bloodPressure: '105/70',
          treatment: 'Iron-rich diet (spinach, dates, jaggery), rest',
          medicines: 'Ferrous sulfate 200mg OD\nFolic acid 5mg OD\nVitamin B12 injection (weekly)',
          notes: 'Hemoglobin: 8.5 g/dL. Advised iron supplements for 3 months.',
          followUpDate: new Date('2025-12-11'),
        },
      ],
    },
    {
      patientId: 'FC-009',
      name: 'Vikram Malhotra',
      age: 38,
      gender: 'Male',
      contact: '+91-9811223344',
      address: 'Connaught Place, New Delhi',
      bloodGroup: 'O+',
      visits: [
        {
          visitDate: new Date('2025-11-09'),
          visitType: 'Consultation',
          chiefComplaint: 'पीठ दर्द और गर्दन में अकड़न (Lower back pain and neck stiffness)',
          signs: 'Lower back pain, neck stiffness, muscle spasm, limited movement',
          investigations: 'X-ray lumbar spine',
          diagnosis: 'Mechanical Back Pain, Cervical Spondylosis',
          temp: 98.6,
          spo2: 99,
          pulse: 72,
          bloodPressure: '122/78',
          treatment: 'Hot water bag, avoid heavy lifting, ergonomic posture, physiotherapy',
          medicines: 'Diclofenac + Paracetamol combo BD\nThiocolchicoside 4mg BD\nMethylcobalamin 1500mcg OD',
          notes: 'Patient works long hours on computer. Advised posture correction and breaks.',
          followUpDate: new Date('2025-11-23'),
        },
      ],
    },
    {
      patientId: 'FC-010',
      name: 'Meera Nair',
      age: 45,
      gender: 'Female',
      contact: '+91-9447788990',
      address: 'Kochi, Kerala',
      bloodGroup: 'A-',
      chronicConditions: 'Hypothyroidism',
      visits: [
        {
          visitDate: new Date('2025-11-07'),
          visitType: 'Follow-up',
          chiefComplaint: 'Thyroid medication review',
          signs: 'Feeling better, energy levels improved, no major complaints',
          investigations: 'TSH, T3, T4 levels',
          diagnosis: 'Hypothyroidism - Well controlled',
          temp: 98.4,
          spo2: 98,
          pulse: 70,
          bloodPressure: '118/75',
          treatment: 'Continue thyroid medication, regular monitoring',
          medicines: 'Levothyroxine 75mcg OD (empty stomach)\nCalcium supplement OD',
          notes: 'TSH levels normal. Continue same dose. Next review after 3 months.',
          followUpDate: new Date('2026-02-07'),
        },
      ],
    },
  ];

  for (const patientData of patients) {
    const { visits, ...patientInfo } = patientData;
    
    await prisma.patient.create({
      data: {
        ...patientInfo,
        visits: {
          create: visits,
        },
      },
    });
  }

  // Sample patients and visits created successfully
}

main()
  .catch((e) => {
    // Error seeding database
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
