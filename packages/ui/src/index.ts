/**
 * @uniteon/ui — componentes React compartilhados (topbar, controles de mídia,
 * chat, indicadores de status). Preenchido a partir do Épico 2.
 */
import type { PresenceStatus } from '@uniteon/shared';
import { STATUS_EMOJI } from '@uniteon/shared';

export function statusLabel(status: PresenceStatus): string {
  const labels: Record<PresenceStatus, string> = {
    WORKING: 'Trabalhando',
    AWAY: 'Ausente',
    MEETING: 'Em reunião',
    OFFLINE: 'Offline',
  };
  return `${STATUS_EMOJI[status]} ${labels[status]}`;
}
