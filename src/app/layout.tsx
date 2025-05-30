
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeInitializer } from '@/components/theme-initializer';
import { LanguageProvider } from '@/contexts/LanguageContext'; // Import the provider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata can be dynamic if you use generateMetadata with language context later
export const metadata: Metadata = {
  title: 'Subtitle Sync', // This could be translated if generateMetadata is used
  description: 'Synchronize and edit subtitles for your media files.', // Same here
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang and dir will be set by LanguageProvider effect
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LanguageProvider> {/* Wrap with LanguageProvider */}
          <ThemeInitializer />
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
