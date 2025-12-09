import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { MobileAppHandler } from "@/components/mobile-app-handler";

export const metadata: Metadata = {
  title: "Community Compass",
  description: "NGO Community Tracker for field workers and administrators.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 0.85,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className="font-body antialiased" suppressHydrationWarning>
        <FirebaseClientProvider>
          {/* 🔥 LANGUAGE CONTEXT WRAPPER ADDED HERE */}
          <LanguageProvider>
            <MobileAppHandler />
            {children}
          </LanguageProvider>
        </FirebaseClientProvider>

        <Toaster />
      </body>
    </html>
  );
}
