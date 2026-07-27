import type { Role } from './domain';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface PermissionModule {
  key: string;
  label: string;
}

/**
 * Fonte canônica dos módulos permissionáveis. O arquivo `permissions.json`
 * espelha esta lista para consumo direto pelo frontend/documentação; um teste
 * de sync (futuro) garante que os dois não divirjam — mesmo padrão do LocusLog.
 */
export const PERMISSION_MODULES: PermissionModule[] = [
  { key: 'space', label: 'Espaços' },
  { key: 'zone', label: 'Salas' },
  { key: 'layout', label: 'Layout do mapa' },
  { key: 'object', label: 'Objetos' },
  { key: 'chat', label: 'Chat' },
  { key: 'member', label: 'Membros' },
  { key: 'profile', label: 'Perfis de acesso' },
];

export const PERMISSION_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'edit',
  'delete',
];

/** Roles que ignoram a matriz de perfil e têm acesso total. */
export const FULL_ACCESS_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN'];

/** Matriz de perfil: módulo → ações permitidas. */
export type PermissionMatrix = Record<string, PermissionAction[]>;

export function hasPermission(
  role: Role,
  matrix: PermissionMatrix | null,
  module: string,
  action: PermissionAction,
): boolean {
  if (FULL_ACCESS_ROLES.includes(role)) return true;
  if (!matrix) return false;
  return matrix[module]?.includes(action) ?? false;
}
