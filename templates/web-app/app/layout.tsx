import './globals.css';

export const metadata = {
  title: '__APP_NAME__',
  description: 'Built on the apps-platform pipeline',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
