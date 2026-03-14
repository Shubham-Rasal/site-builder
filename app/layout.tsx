import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Site Builder Agent',
  description: 'ERC-8004 compliant AI site builder. Pay 0.1 USDC, get a personalised website hosted on Filecoin.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
