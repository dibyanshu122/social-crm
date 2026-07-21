import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Social CRM & Ads Commander',
  description: 'Manage all your organic posts and paid ads from one place.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
