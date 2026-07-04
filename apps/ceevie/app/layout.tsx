export const metadata = {
  title: 'App',
  description: 'Built on the apps-platform pipeline',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
