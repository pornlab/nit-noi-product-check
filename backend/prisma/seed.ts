import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const normalizeName = (v: string): string => v.trim().toLowerCase().replace(/\s+/g, ' ');

const ORG_NAME = 'Nit Noi Coffee';

const positionsSeed = ['Владелец', 'Администратор кафе', 'Кондитер'];
const zonesSeed = ['Бар', 'Кухня', 'Кондитерская', 'Основной склад'];

const usersSeed: Array<{
  email: string;
  name: string;
  role: Role;
  positionName: string;
  zones: Array<{ zoneName: string; isResponsible: boolean }>;
}> = [
  {
    email: 'admin@example.com',
    name: 'Admin',
    role: 'admin',
    positionName: 'Владелец',
    zones: [],
  },
  {
    email: 'manager@example.com',
    name: 'Manager',
    role: 'manager',
    positionName: 'Администратор кафе',
    zones: [{ zoneName: 'Основной склад', isResponsible: true }],
  },
  {
    email: 'employee@example.com',
    name: 'Employee',
    role: 'employee',
    positionName: 'Кондитер',
    zones: [{ zoneName: 'Кондитерская', isResponsible: true }],
  },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('password', 10);

  const existingOrg = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  const organization =
    existingOrg ??
    (await prisma.organization.create({
      data: { name: ORG_NAME, description: null, isActive: true },
    }));
  // eslint-disable-next-line no-console
  console.log(`Organization: ${organization.name} (${organization.id})`);

  const positionByName = new Map<string, string>();
  for (const name of positionsSeed) {
    const normalizedName = normalizeName(name);
    const position = await prisma.position.upsert({
      where: { organizationId_normalizedName: { organizationId: organization.id, normalizedName } },
      update: {},
      create: { organizationId: organization.id, name, normalizedName },
    });
    positionByName.set(name, position.id);
    // eslint-disable-next-line no-console
    console.log(`  Position: ${name}`);
  }

  const zoneByName = new Map<string, string>();
  for (const name of zonesSeed) {
    const normalizedName = normalizeName(name);
    const zone = await prisma.zone.upsert({
      where: { organizationId_normalizedName: { organizationId: organization.id, normalizedName } },
      update: {},
      create: { organizationId: organization.id, name, normalizedName },
    });
    zoneByName.set(name, zone.id);
    // eslint-disable-next-line no-console
    console.log(`  Zone: ${name}`);
  }

  for (const seed of usersSeed) {
    const positionId = positionByName.get(seed.positionName) ?? null;

    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        organizationId: organization.id,
        positionId,
        name: seed.name,
        role: seed.role,
        isActive: true,
      },
      create: {
        email: seed.email,
        name: seed.name,
        role: seed.role,
        organizationId: organization.id,
        positionId,
        passwordHash,
        isActive: true,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`User: ${user.email} (${user.role}) → ${seed.positionName}`);

    for (const assignment of seed.zones) {
      const zoneId = zoneByName.get(assignment.zoneName);
      if (!zoneId) continue;
      await prisma.userZone.upsert({
        where: { userId_zoneId: { userId: user.id, zoneId } },
        update: { isResponsible: assignment.isResponsible },
        create: {
          userId: user.id,
          zoneId,
          isResponsible: assignment.isResponsible,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`  Zone assignment: ${seed.email} → ${assignment.zoneName} (resp: ${assignment.isResponsible})`);
    }
  }
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
