/**
 * Seed do MVP-0: tenant LocusLog, usuários Caio e Vinicius, um Space com o
 * escritório inicial (layout + zonas). Idempotente (upsert por chaves naturais).
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

  const caio = await prisma.user.upsert({
    where: { email: 'caio@locuslog.com.br' },
    update: {},
    create: { email: 'caio@locuslog.com.br', name: 'Caio' },
  });

  const vinicius = await prisma.user.upsert({
    where: { email: 'vinicius@locuslog.com.br' },
    update: {},
    create: { email: 'vinicius@locuslog.com.br', name: 'Vinicius' },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: caio.id, organizationId: org.id } },
    update: { role: 'ADMIN' },
    create: { userId: caio.id, organizationId: org.id, role: 'ADMIN' },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: vinicius.id, organizationId: org.id } },
    update: { role: 'ADMIN' },
    create: { userId: vinicius.id, organizationId: org.id, role: 'ADMIN' },
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
