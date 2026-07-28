/**
 * Seed do MVP-0: tenant LocusLog + Space com o escritório inicial (layout +
 * zonas). Idempotente (upsert por chaves naturais). Usuários NÃO são criados
 * aqui — são provisionados no primeiro login real via GET /me
 * (apps/api/src/me/me.service.ts), que faz upsert por id = sub do Supabase.
 */
import { PrismaClient } from '@prisma/client';
import { OFFICE_ZONES, buildOfficeTilemap } from '@uniteon/shared';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'locuslog' },
    update: {},
    create: { slug: 'locuslog', name: 'LocusLog', plan: 'pro' },
  });

  const space = await prisma.space.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'hq' } },
    update: {},
    create: { organizationId: org.id, name: 'Escritório LocusLog', slug: 'hq' },
  });

  // Layout: recria sempre (published único).
  await prisma.layout.deleteMany({ where: { spaceId: space.id } });
  await prisma.layout.create({
    data: {
      spaceId: space.id,
      version: 1,
      published: true,
      tilemap: buildOfficeTilemap(),
    },
  });

  // Zonas: recria a partir da fonte única.
  await prisma.zone.deleteMany({ where: { spaceId: space.id } });
  for (const z of OFFICE_ZONES) {
    await prisma.zone.create({
      data: {
        spaceId: space.id,
        name: z.name,
        type: z.type,
        audioMode: z.audioMode,
        bounds: z.bounds,
      },
    });
  }

  // Canal de chat global do space.
  const existing = await prisma.chatChannel.findFirst({
    where: { organizationId: org.id, spaceId: space.id, scope: 'GLOBAL' },
  });
  if (!existing) {
    await prisma.chatChannel.create({
      data: { organizationId: org.id, spaceId: space.id, scope: 'GLOBAL' },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed concluído:', {
    org: org.slug,
    space: space.slug,
    zones: OFFICE_ZONES.length,
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
