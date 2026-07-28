'use client';

import { useEffect, useState } from 'react';
import { authConfigured, getSupabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sem Supabase configurado → segue no modo dev (?name= no /office).
  useEffect(() => {
    if (!authConfigured) {
      window.location.href = '/office';
      return;
    }
    void getSupabase()
      ?.auth.getSession()
      .then(({ data }) => {
        if (data.session) window.location.href = '/avatar';
      });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else window.location.href = '/avatar';
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: 320,
          padding: 28,
          borderRadius: 14,
          background: '#232838',
          boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 26, textAlign: 'center' }}>UniteOn</h1>
        <p style={{ margin: '0 0 8px', opacity: 0.7, textAlign: 'center', fontSize: 13 }}>
          Entre no escritório
        </p>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        {error && <span style={{ color: '#e5534b', fontSize: 13 }}>{error}</span>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            background: '#2f7d5b',
            color: '#fff',
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p style={{ opacity: 0.45, fontSize: 12, textAlign: 'center', margin: '4px 0 0' }}>
          Contas são criadas pelo administrador.
        </p>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  borderRadius: 8,
  border: '1px solid #3a4056',
  background: '#1b1e2b',
  color: '#e8eaf2',
  fontSize: 14,
};
