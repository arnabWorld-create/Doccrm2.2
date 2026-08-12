import type { Metadata } from 'next';
import LandingPageClient from './LandingPageClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://faithclinic.in';

export const metadata: Metadata = {
  title: "Faith Clinic | Dr. Aishwarya Radia – General Physician, Prahladnagar Ahmedabad",
  description:
    "Visit Faith Clinic at Prahladnagar, Ahmedabad. Dr. Aishwarya Radia offers expert treatment for Diabetes, Hypertension, Dengue, Travel Vaccination & more. 9 years experience · 7000+ patients. Book appointment on WhatsApp.",
  alternates: {
    canonical: APP_URL,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["MedicalBusiness", "Physician"],
      "@id": `${APP_URL}/#physician`,
      name: "Faith Clinic – Dr. Aishwarya Radia",
      url: APP_URL,
      logo: `${APP_URL}/favicon.svg`,
      image: `${APP_URL}/landing-assets/hero-bg.jpg`,
      description:
        "Faith Clinic is a general physician practice run by Dr. Aishwarya Radia in Prahladnagar, Ahmedabad, providing compassionate care for diabetes, hypertension, dengue, and preventive health.",
      telephone: "+91-94299-07575",
      priceRange: "₹₹",
      currenciesAccepted: "INR",
      paymentAccepted: "Cash, UPI",
      medicalSpecialty: "General Practice",
      address: {
        "@type": "PostalAddress",
        streetAddress: "16, Ground Floor Vraj Vihar-7, Near Venus Atlantis, Satellite Road",
        addressLocality: "Prahladnagar",
        addressRegion: "Gujarat",
        postalCode: "380015",
        addressCountry: "IN",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 23.0099739,
        longitude: 72.5112832,
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "09:30",
          closes: "12:30",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "17:30",
          closes: "19:30",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Saturday"],
          opens: "09:30",
          closes: "12:30",
        },
      ],
      sameAs: [
        "https://www.instagram.com/dr.aishwarya.faithclinic.abad",
        "https://www.youtube.com/@draishwaryafaithclinic",
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "47",
        bestRating: "5",
        worstRating: "1",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Medical Services",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "MedicalProcedure", name: "General Physician Consultation" } },
          { "@type": "Offer", itemOffered: { "@type": "MedicalProcedure", name: "Type 2 Diabetes Management" } },
          { "@type": "Offer", itemOffered: { "@type": "MedicalProcedure", name: "Hypertension Care" } },
          { "@type": "Offer", itemOffered: { "@type": "MedicalProcedure", name: "Dengue & Malaria Treatment" } },
          { "@type": "Offer", itemOffered: { "@type": "MedicalProcedure", name: "Travel Vaccination" } },
          { "@type": "Offer", itemOffered: { "@type": "MedicalProcedure", name: "Online Consultation" } },
        ],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${APP_URL}/#website`,
      url: APP_URL,
      name: "Faith Clinic",
      publisher: { "@id": `${APP_URL}/#physician` },
    },
  ],
};

export default function Page() {
  return (
    <>
      {/* JSON-LD structured data for Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPageClient />
    </>
  );
}
