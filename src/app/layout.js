import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';

export const metadata = {
  title: 'GPT야 놀자! — 3D AI 융합 교육 플랫폼',
  description: '서울고·동덕여고·상문고 공유 캠퍼스 연합 동아리를 위한 실시간 다중접속 AI 학습 게임',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
