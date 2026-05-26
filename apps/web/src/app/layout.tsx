import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WDP301',
  description: 'WDP301 Web Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
