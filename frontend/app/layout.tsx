import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hospital Helper AI - RAG Assistant',
  description: 'AI-powered Hospital Handbook assistant built with Python Flask RAG Backend and Next.js Frontend.',
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
