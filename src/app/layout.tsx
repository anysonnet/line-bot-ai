import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Life Hotel LINE Bot',
  description: 'LINE OA Chatbot for Life Hotel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
