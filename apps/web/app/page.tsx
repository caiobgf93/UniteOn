import { statusLabel } from '@uniteon/ui';

/**
 * Placeholder do lobby. O canvas PixiJS do escritório entra no Épico 1;
 * presença e movimento no Épico 2. Por ora só valida o wiring do monorepo.
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        textAlign: 'center',
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 40, margin: 0 }}>UniteOn</h1>
      <p style={{ opacity: 0.8, maxWidth: 480 }}>
        Escritório virtual colaborativo. Você não entra numa reunião — você entra no
        escritório.
      </p>
      <p style={{ opacity: 0.6 }}>Status de exemplo: {statusLabel('WORKING')}</p>
      <a
        href="/office"
        style={{
          padding: '10px 20px',
          borderRadius: 8,
          background: '#2f7d5b',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Entrar no escritório →
      </a>
      <p style={{ opacity: 0.4, fontSize: 13 }}>
        MVP-0 em construção — presença · andar · áudio por zona.
      </p>
    </main>
  );
}
