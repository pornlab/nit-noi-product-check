import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const users: Array<{ email: string; name: string; role: Role }> = [
  { email: 'admin@example.com', name: 'Admin', role: 'admin' },
  { email: 'manager@example.com', name: 'Manager', role: 'manager' },
  { email: 'employee@example.com', name: 'Employee', role: 'employee' },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('password', 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Seeded user: ${user.email} (${user.role})`);
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
