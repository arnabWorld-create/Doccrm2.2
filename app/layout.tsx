import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LayoutContent } from "@/components/LayoutContent";
import { NotificationCenter } from "@/components/NotificationCenter";

const inter = Inter({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://faithclinic.in';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Faith Clinic | Dr. Aishwarya Radia – General Physician, Ahmedabad",
    template: "%s | Faith Clinic Ahmedabad",
  },
  description:
    "Faith Clinic in Prahladnagar, Ahmedabad. Dr. Aishwarya Radia – experienced General Physician specialising in Diabetes, Hypertension, Dengue & Preventive Care. Book appointment via WhatsApp.",
  keywords: [
    "Faith Clinic Ahmedabad",
    "Dr Aishwarya Radia",
    "General Physician Prahladnagar",
    "Doctor near me Ahmedabad",
    "Diabetes treatment Ahmedabad",
    "Hypertension care Ahmedabad",
    "Dengue treatment Ahmedabad",
    "Preventive healthcare Ahmedabad",
    "Travel vaccination Ahmedabad",
  ],
  authors: [{ name: "Dr. Aishwarya Radia", url: APP_URL }],
  creator: "Faith Clinic",
  publisher: "Faith Clinic",
  alternates: {
    canonical: APP_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: APP_URL,
    siteName: "Faith Clinic",
    title: "Faith Clinic | Dr. Aishwarya Radia – General Physician, Ahmedabad",
    description:
      "Compassionate, expert healthcare in Prahladnagar, Ahmedabad. 9 years of experience · 7000+ patients · 4.8★ rating. Book via WhatsApp today.",
    images: [
      {
        url: "/landing-assets/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Faith Clinic – Dr. Aishwarya Radia, General Physician Ahmedabad",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Faith Clinic | Dr. Aishwarya Radia – General Physician, Ahmedabad",
    description:
      "Compassionate, expert healthcare in Prahladnagar, Ahmedabad. Book via WhatsApp today.",
    images: ["/landing-assets/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico',  sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon.svg',  type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white min-h-screen`}>
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
          <NotificationCenter />
        </AuthProvider>
      </body>
    </html>
  );
}