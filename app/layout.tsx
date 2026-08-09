import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LayoutContent } from "@/components/LayoutContent";
import { NotificationCenter } from "@/components/NotificationCenter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Faith Clinic - Patient Management",
  description: "Patient Management System for Faith Clinic",
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