'use client';

import { useEffect, useState } from 'react';
import {
  AVATAR_OPTIONS,
  isValidAvatarConfig,
  randomAvatarConfig,
  type AvatarConfig,
  type BodyColor,
  type GlassesStyle,
  type HairColor,
  type HairStyle,
  type LegsColor,
  type TorsoStyle,
} from '@uniteon/shared';
import { authConfigured, getSupabase } from '../../lib/supabaseClient';
import { AvatarPreview } from './AvatarPreview';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const BODY_COLOR_LABEL: Record<BodyColor, string> = {
  light: 'Clara',
  amber: 'Âmbar',
  olive: 'Oliva',
  brown: 'Morena',
  black: 'Escura',
};
const HAIR_STYLE_LABEL: Record<HairStyle, string> = { long: 'Longo', bob: 'Chanel', pixie: 'Curto' };
const HAIR_COLOR_LABEL: Record<HairColor, string> = {
  blonde: 'Loiro',
  light_brown: 'Castanho claro',
  dark_brown: 'Castanho escuro',
  ginger: 'Ruivo',
  black: 'Preto',
};
const TORSO_STYLE_LABEL: Record<TorsoStyle, string> = { tshirt: 'Camiseta', polo: 'Polo' };
const LEGS_COLOR_LABEL: Record<LegsColor, string> = { white: 'Clara', black: 'Escura' };
const GLASSES_LABEL: Record<GlassesStyle, string> = { glasses: 'Quadrado', round: 'Redondo' };

/** Cicla um valor dentro de uma lista de opções, na direção `dir` (1 ou -1). */
function cycle<T>(options: readonly T[], current: T, dir: 1 | -1): T {
  const i = options.indexOf(current);
  const next = (i + dir + options.length) % options.length;
  return options[next] as T;
}

/** Óculos tratados como uma lista própria: nenhum + cada estilo. */
const GLASSES_CHOICES: (GlassesStyle | null)[] = [null, ...AVATAR_OPTIONS.glasses.styles];

function Picker({
  label,
  value,
  onPrev,
  onNext,
}: {
  label: string;
  value: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ opacity: 0.7, fontSize: 13, width: 92 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onPrev} style={arrowStyle} aria-label={`${label}: anterior`}>
          ◄
        </button>
        <span style={{ fontSize: 14, minWidth: 130, textAlign: 'center' }}>{value}</span>
        <button onClick={onNext} style={arrowStyle} aria-label={`${label}: próximo`}>
          ►
        </button>
      </div>
    </div>
  );
}

export default function AvatarPage() {
  const [config, setConfig] = useState<AvatarConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [returnTo, setReturnTo] = useState('/office');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rt = params.get('returnTo');
    if (rt) setReturnTo(rt);

    (async () => {
      if (!authConfigured) {
        setConfig(randomAvatarConfig());
        return;
      }
      const supabase = getSupabase();
      const { data } = await supabase!.auth.getSession();
      if (!data.session) {
        window.location.href = '/login';
        return;
      }
      setToken(data.session.access_token);
      try {
        const res = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const profile = await res.json();
        setConfig(isValidAvatarConfig(profile?.avatarConfig) ? profile.avatarConfig : randomAvatarConfig());
      } catch (e) {
        console.warn('[uniteon] /me falhou', e);
        setConfig(randomAvatarConfig());
      }
    })();
  }, []);

  if (!config) {
    return (
      <main style={pageStyle}>
        <span style={{ opacity: 0.6 }}>Carregando…</span>
      </main>
    );
  }

  const update = (patch: Partial<AvatarConfig>) => setConfig({ ...config, ...patch });

  const onEnter = async () => {
    setSaving(true);
    try {
      if (authConfigured && token) {
        await fetch(`${API_URL}/me/avatar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ avatarConfig: config }),
        });
      }
    } catch (e) {
      console.warn('[uniteon] PATCH /me/avatar falhou', e);
    } finally {
      window.location.href = returnTo;
    }
  };

  const glassesIndex = GLASSES_CHOICES.findIndex(
    (g) => g === config.glasses?.style || (g === null && config.glasses === null),
  );

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, textAlign: 'center' }}>Escolha seu avatar</h1>
        <p style={{ margin: '0 0 16px', opacity: 0.6, fontSize: 13, textAlign: 'center' }}>
          Dá pra mudar depois a qualquer momento.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <AvatarPreview config={config} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Picker
            label="Tom de pele"
            value={BODY_COLOR_LABEL[config.body.color]}
            onPrev={() => update({ body: { ...config.body, color: cycle(AVATAR_OPTIONS.body.colors, config.body.color, -1) } })}
            onNext={() => update({ body: { ...config.body, color: cycle(AVATAR_OPTIONS.body.colors, config.body.color, 1) } })}
          />
          <Picker
            label="Cabelo"
            value={HAIR_STYLE_LABEL[config.hair.style]}
            onPrev={() => update({ hair: { ...config.hair, style: cycle(AVATAR_OPTIONS.hair.styles, config.hair.style, -1) } })}
            onNext={() => update({ hair: { ...config.hair, style: cycle(AVATAR_OPTIONS.hair.styles, config.hair.style, 1) } })}
          />
          <Picker
            label="Cor do cabelo"
            value={HAIR_COLOR_LABEL[config.hair.color]}
            onPrev={() => update({ hair: { ...config.hair, color: cycle(AVATAR_OPTIONS.hair.colors, config.hair.color, -1) } })}
            onNext={() => update({ hair: { ...config.hair, color: cycle(AVATAR_OPTIONS.hair.colors, config.hair.color, 1) } })}
          />
          <Picker
            label="Camisa"
            value={TORSO_STYLE_LABEL[config.torso.style]}
            onPrev={() => update({ torso: { ...config.torso, style: cycle(AVATAR_OPTIONS.torso.styles, config.torso.style, -1) } })}
            onNext={() => update({ torso: { ...config.torso, style: cycle(AVATAR_OPTIONS.torso.styles, config.torso.style, 1) } })}
          />
          <Picker
            label="Calça"
            value={LEGS_COLOR_LABEL[config.legs.color]}
            onPrev={() => update({ legs: { ...config.legs, color: cycle(AVATAR_OPTIONS.legs.colors, config.legs.color, -1) } })}
            onNext={() => update({ legs: { ...config.legs, color: cycle(AVATAR_OPTIONS.legs.colors, config.legs.color, 1) } })}
          />
          <Picker
            label="Óculos"
            value={config.glasses ? GLASSES_LABEL[config.glasses.style] : 'Nenhum'}
            onPrev={() => {
              const g = cycle(GLASSES_CHOICES, GLASSES_CHOICES[glassesIndex] ?? null, -1);
              update({ glasses: g ? { style: g } : null });
            }}
            onNext={() => {
              const g = cycle(GLASSES_CHOICES, GLASSES_CHOICES[glassesIndex] ?? null, 1);
              update({ glasses: g ? { style: g } : null });
            }}
          />
        </div>

        <button onClick={onEnter} disabled={saving} style={enterButtonStyle}>
          {saving ? 'Salvando…' : 'Entrar ▶'}
        </button>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  fontFamily: 'system-ui, sans-serif',
  color: '#e8eaf2',
};

const cardStyle: React.CSSProperties = {
  width: 360,
  padding: 28,
  borderRadius: 14,
  background: '#232838',
  boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
};

const arrowStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid #3a4056',
  background: '#1b1e2b',
  color: '#e8eaf2',
  cursor: 'pointer',
  fontSize: 13,
};

const enterButtonStyle: React.CSSProperties = {
  marginTop: 20,
  width: '100%',
  padding: '12px',
  borderRadius: 8,
  border: 'none',
  background: '#2f7d5b',
  color: '#fff',
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
};
