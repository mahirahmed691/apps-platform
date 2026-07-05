import { Newsreader } from 'next/font/google';
import './globals.css';
import { getSiteUrl } from '@/lib/site';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif-loaded',
  display: 'swap',
});

const siteUrl = getSiteUrl();

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Ceevie',
    template: '%s · Ceevie',
  },
  description: 'You don\'t write CVs anymore. Talk through your experience — Ceevie writes a professional CV in real time.',
  openGraph: {
    title: 'Ceevie — Talk your CV into existence',
    description: 'You don\'t write CVs anymore. Talk through your experience — Ceevie writes a professional CV in real time.',
    url: siteUrl,
    siteName: 'Ceevie',
    locale: 'en_GB',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={newsreader.variable}>
      <body>{children}</body>
    </html>
  );
}
