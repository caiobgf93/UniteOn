import type { ReactNode } from 'react';

export const metadata = {
  title: 'UniteOn',
  description: 'Escritório virtual colaborativo em tempo real',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          background: '#1b1e2b',
          color: '#e8eaf2',
        }}
      >
        {children}
      </body>
    </html>
  );
}
