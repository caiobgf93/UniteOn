/**
 * Modelo de dados do avatar (Passo 3 do upgrade visual — ver
 * docs/VISUAL-UPGRADE-PLAN.md). As opções aqui espelham
 * apps/web/public/assets/manifest.json (seção "avatars") — são a MESMA
 * lista, só que tipada em TS pro resto do código validar/usar. Se adicionar
 * um estilo/cor novo no manifest (Passo 1), espelhe aqui também.
 */

export type BodyStyle = 'male';
export type BodyColor = 'light' | 'amber' | 'olive' | 'brown' | 'black';

export type HairStyle = 'long' | 'bob' | 'pixie';
export type HairColor = 'blonde' | 'light_brown' | 'dark_brown' | 'ginger' | 'black';

export type TorsoStyle = 'tshirt' | 'polo';
export type TorsoColor = 'white';

export type LegsStyle = 'pants';
export type LegsColor = 'white' | 'black';

export type FeetStyle = 'shoes';
export type FeetColor = 'white';

export type GlassesStyle = 'glasses' | 'round';

export interface AvatarConfig {
  body: { style: BodyStyle; color: BodyColor };
  hair: { style: HairStyle; color: HairColor };
  torso: { style: TorsoStyle; color: TorsoColor };
  legs: { style: LegsStyle; color: LegsColor };
  feet: { style: FeetStyle; color: FeetColor };
  /** Óculos são opcionais — `null` = sem óculos. */
  glasses: { style: GlassesStyle } | null;
}

/** Listas de opções válidas — usadas tanto pra validar quanto pela tela de
 * criação/edição de avatar (Passo 5). */
export const AVATAR_OPTIONS = {
  body: { styles: ['male'] as BodyStyle[], colors: ['light', 'amber', 'olive', 'brown', 'black'] as BodyColor[] },
  hair: {
    styles: ['long', 'bob', 'pixie'] as HairStyle[],
    colors: ['blonde', 'light_brown', 'dark_brown', 'ginger', 'black'] as HairColor[],
  },
  torso: { styles: ['tshirt', 'polo'] as TorsoStyle[], colors: ['white'] as TorsoColor[] },
  legs: { styles: ['pants'] as LegsStyle[], colors: ['white', 'black'] as LegsColor[] },
  feet: { styles: ['shoes'] as FeetStyle[], colors: ['white'] as FeetColor[] },
  glasses: { styles: ['glasses', 'round'] as GlassesStyle[] },
} as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/** Gera um avatar aleatório válido — usado como default no primeiro login. */
export function randomAvatarConfig(): AvatarConfig {
  return {
    body: { style: pick(AVATAR_OPTIONS.body.styles), color: pick(AVATAR_OPTIONS.body.colors) },
    hair: { style: pick(AVATAR_OPTIONS.hair.styles), color: pick(AVATAR_OPTIONS.hair.colors) },
    torso: { style: pick(AVATAR_OPTIONS.torso.styles), color: pick(AVATAR_OPTIONS.torso.colors) },
    legs: { style: pick(AVATAR_OPTIONS.legs.styles), color: pick(AVATAR_OPTIONS.legs.colors) },
    feet: { style: pick(AVATAR_OPTIONS.feet.styles), color: pick(AVATAR_OPTIONS.feet.colors) },
    glasses: Math.random() < 0.4 ? { style: pick(AVATAR_OPTIONS.glasses.styles) } : null,
  };
}

/** Valida (sem lançar) um objeto qualquer vindo do banco/rede como AvatarConfig. */
export function isValidAvatarConfig(v: unknown): v is AvatarConfig {
  if (!v || typeof v !== 'object') return false;
  const a = v as Partial<AvatarConfig>;
  const partOk = <S extends string, C extends string>(
    part: unknown,
    styles: readonly S[],
    colors: readonly C[],
  ): boolean =>
    !!part &&
    typeof part === 'object' &&
    styles.includes((part as { style?: S }).style as S) &&
    colors.includes((part as { color?: C }).color as C);

  if (!partOk(a.body, AVATAR_OPTIONS.body.styles, AVATAR_OPTIONS.body.colors)) return false;
  if (!partOk(a.hair, AVATAR_OPTIONS.hair.styles, AVATAR_OPTIONS.hair.colors)) return false;
  if (!partOk(a.torso, AVATAR_OPTIONS.torso.styles, AVATAR_OPTIONS.torso.colors)) return false;
  if (!partOk(a.legs, AVATAR_OPTIONS.legs.styles, AVATAR_OPTIONS.legs.colors)) return false;
  if (!partOk(a.feet, AVATAR_OPTIONS.feet.styles, AVATAR_OPTIONS.feet.colors)) return false;
  if (a.glasses !== null) {
    if (!a.glasses || !AVATAR_OPTIONS.glasses.styles.includes(a.glasses.style as GlassesStyle)) return false;
  }
  return true;
}

/** Caminho do arquivo de uma camada (bate com `manifest.json.avatars.pathTemplate`). */
export function avatarLayerPath(layer: string, style: string, color: string, sheet: 'walk' | 'idle'): string {
  return `sprites/avatars/${layer}/${style}/${color}/${sheet}.png`;
}

/** Lista as camadas (com caminho de arquivo) de um AvatarConfig, na ordem de
 * empilhamento pro compositor (Passo 4): corpo → cabeça → roupa → cabelo →
 * óculos. A cabeça (forma + rosto) segue sempre o mesmo tom do corpo — não é
 * uma escolha própria do usuário, então não entra em `AvatarConfig`/
 * `AVATAR_OPTIONS`, só é derivada de `body.color` na hora de montar as
 * camadas. */
export function avatarLayerFiles(config: AvatarConfig, sheet: 'walk' | 'idle'): string[] {
  const files = [
    avatarLayerPath('body', config.body.style, config.body.color, sheet),
    avatarLayerPath('legs', config.legs.style, config.legs.color, sheet),
    avatarLayerPath('feet', config.feet.style, config.feet.color, sheet),
    avatarLayerPath('torso', config.torso.style, config.torso.color, sheet),
    avatarLayerPath('head', 'human', config.body.color, sheet),
    avatarLayerPath('hair', config.hair.style, config.hair.color, sheet),
  ];
  if (config.glasses) files.push(avatarLayerPath('glasses', config.glasses.style, 'default', sheet));
  return files;
}
