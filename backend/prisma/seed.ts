import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ORG_NAME = 'Nit Noi Coffee';

const usersSeed: Array<{
  email: string;
  password: string;
  name: string;
  role: Role;
}> = [
  { email: 'ilia@nit-noi.com', password: 'u#u80)', name: 'Ilia', role: 'admin' },
];

async function main(): Promise<void> {
  const existingOrg = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  const organization =
    existingOrg ??
    (await prisma.organization.create({
      data: { name: ORG_NAME, description: null, isActive: true },
    }));
  // eslint-disable-next-line no-console
  console.log(`Organization: ${organization.name} (${organization.id})`);

  for (const seed of usersSeed) {
    const passwordHash = await bcrypt.hash(seed.password, 10);
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        organizationId: organization.id,
        name: seed.name,
        role: seed.role,
        isActive: true,
        passwordHash,
      },
      create: {
        email: seed.email,
        name: seed.name,
        role: seed.role,
        organizationId: organization.id,
        passwordHash,
        isActive: true,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`User: ${user.email} (${user.role})`);
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
