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
  description: 'Build your CV by talking through your experience — just speak naturally.',
  openGraph: {
    title: 'Ceevie',
    description: 'Build your CV by talking through your experience — just speak naturally.',
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
