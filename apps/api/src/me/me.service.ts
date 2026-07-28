import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { SupabaseIdentity } from '../auth/supabase-identity';

/**
 * Tenant único do MVP-0 (LocusLog). Quando o produto virar multi-tenant de fato
 * (Espaço 4+), isso vira resolução por subdomínio; por ora todo login novo
 * entra automaticamente na LocusLog.
 */
const DEFAULT_ORG_SLUG = 'locuslog';
const DEFAULT_SPACE_SLUG = 'hq';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Provisiona o usuário no primeiro login (upsert por id = sub do Supabase) e
   * garante a membership no tenant default. Idempotente — chamado a cada login.
   */
  async ensureProfile(identity: SupabaseIdentity) {
    const org = await this.prisma.organization.upsert({
      where: { slug: DEFAULT_ORG_SLUG },
      update: {},
      create: { slug: DEFAULT_ORG_SLUG, name: 'LocusLog' },
    });

    const user = await this.prisma.user.upsert({
      where: { id: identity.userId },
      update: { email: identity.email, name: identity.name },
      create: { id: identity.userId, email: identity.email, name: identity.name },
    });

    const membership = await this.prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: {},
      // Time pequeno no MVP-0: todo membro novo entra como ADMIN.
      create: { userId: user.id, organizationId: org.id, role: 'ADMIN' },
    });

    const space = await this.prisma.space.findUnique({
      where: { organizationId_slug: { organizationId: org.id, slug: DEFAULT_SPACE_SLUG } },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: membership.role,
      organization: { id: org.id, slug: org.slug, name: org.name },
      space: space ? { id: space.id, slug: space.slug, name: space.name } : null,
    };
  }
}
