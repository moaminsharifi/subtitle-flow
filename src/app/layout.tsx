
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeInitializer } from '@/components/theme-initializer';
import { LanguageProvider } from '@/contexts/LanguageContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const APP_NAME = 'Subtitle Flow';
const APP_DESCRIPTION = 'Subtitle Flow: Your powerful, privacy-first subtitle editor. Create, edit & sync SRT/VTT files in-browser. Features AI transcription, multi-language support & offline capability. Free & open-source.';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://subtitile-flow.moaminsharifi.com/';
const FAVICON_URL = "https://raw.githubusercontent.com/moaminsharifi/subtitle-flow/master/public/icons/icon-512x512.png";

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`, // For dynamic titles in child pages
  },
  description: APP_DESCRIPTION,
  keywords: ['subtitle editor', 'srt editor', 'vtt editor', 'caption editor', 'ai subtitle generation', 'browser subtitle tool', 'video subtitles', 'audio transcription', 'subtitle flow', 'free subtitle editor', 'online subtitle editor', 'local subtitle editor', 'open source subtitle editor', 'offline subtitle tool', 'openai whisper', 'groq transcription', 'pwa subtitle editor', 'multi-language subtitles'],
  manifest: '/manifest.json',

  openGraph: {
    type: 'website',
    url: APP_URL,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    images: [
      {
        url: `${APP_URL}og-image.png`,
        width: 1200,
        height: 630,
        alt: `${APP_NAME} - Edit subtitles with ease`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [`${APP_URL}twitter-image.png`],
    // creator: '@yourtwitterhandle',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: FAVICON_URL,
    shortcut: FAVICON_URL,
    apple: FAVICON_URL,
    // other: [
    //   { rel: 'icon', url: '/favicon-32x32.png', sizes: '32x32' },
    // ],
  },
  verification: {
    ...(googleSiteVerification && { google: googleSiteVerification }),
    // Add other verification tags here if needed, e.g., Yandex, Yahoo, etc.
    // yandex: 'yandex-verification-code',
    // other: {
    //   me: ['my-email', 'my-link'],
    // },
  },
  // appleWebApp: { // For PWAs
  //   title: APP_NAME,
  //   statusBarStyle: 'default',
  //   capable: true,
  // },
  // formatDetection: { // Optional
  //   telephone: false,
  // },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1b2a' },
  ],
  // colorScheme: 'light dark',
  // width: 'device-width',
  // initialScale: 1,
  // maximumScale: 1,
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
