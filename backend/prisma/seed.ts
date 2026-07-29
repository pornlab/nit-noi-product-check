import { PrismaClient, Role, Unit } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const normalizeName = (v: string): string => v.trim().toLowerCase().replace(/\s+/g, ' ');

const ORG_NAME = 'Nit Noi Coffee';

const positionsSeed = ['Владелец', 'Администратор кафе', 'Кондитер'];
const zonesSeed = ['Бар', 'Кухня', 'Кондитерская', 'Основной склад'];

const categoriesSeed: Array<{ name: string; description: string | null }> = [
  { name: 'Молочные продукты', description: 'Молоко, сливки, масло и сыры' },
  { name: 'Овощи и фрукты', description: null },
  { name: 'Мука и сухие ингредиенты', description: null },
  { name: 'Упаковка', description: 'Стаканы, крышки, коробки для выпечки' },
  { name: 'Бытовая химия', description: null },
];

const productsSeed: Array<{
  name: string;
  categoryName: string | null;
  baseUnit: Unit;
  description: string | null;
  isInventoryTracked: boolean;
  isPurchasable: boolean;
}> = [
  { name: 'Молоко цельное', categoryName: 'Молочные продукты', baseUnit: 'MILLILITER', description: 'Молоко 3,2% для кофе и выпечки', isInventoryTracked: true, isPurchasable: true },
  { name: 'Сливки', categoryName: 'Молочные продукты', baseUnit: 'MILLILITER', description: null, isInventoryTracked: true, isPurchasable: true },
  { name: 'Яйцо куриное', categoryName: 'Молочные продукты', baseUnit: 'PIECE', description: null, isInventoryTracked: true, isPurchasable: true },
  { name: 'Мука пшеничная', categoryName: 'Мука и сухие ингредиенты', baseUnit: 'GRAM', description: null, isInventoryTracked: true, isPurchasable: true },
  { name: 'Сахар', categoryName: 'Мука и сухие ингредиенты', baseUnit: 'GRAM', description: null, isInventoryTracked: true, isPurchasable: true },
  { name: 'Авокадо', categoryName: 'Овощи и фрукты', baseUnit: 'PIECE', description: 'Для тостов и салатов', isInventoryTracked: true, isPurchasable: true },
  { name: 'Коробка для торта', categoryName: 'Упаковка', baseUnit: 'PIECE', description: 'Белая с окном', isInventoryTracked: true, isPurchasable: true },
  { name: 'Средство для мытья посуды', categoryName: 'Бытовая химия', baseUnit: 'MILLILITER', description: null, isInventoryTracked: true, isPurchasable: true },
];

const suppliersSeed: Array<{
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
}> = [
  {
    name: 'Makro Phuket',
    contactPerson: null,
    phone: null,
    email: null,
    address: 'Wichit, Phuket',
    taxId: null,
    notes: 'Основной супермаркет для оптовых закупок',
  },
  {
    name: 'Дед с авокадо на рынке Раваи',
    contactPerson: 'Ной',
    phone: null,
    email: null,
    address: 'Rawai Market',
    taxId: null,
    notes: 'Частный продавец, обычно приезжает утром',
  },
];

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

  for (const c of categoriesSeed) {
    const normalizedName = normalizeName(c.name);
    await prisma.category.upsert({
      where: { organizationId_normalizedName: { organizationId: organization.id, normalizedName } },
      update: {},
      create: {
        organizationId: organization.id,
        name: c.name,
        normalizedName,
        description: c.description,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`  Category: ${c.name}`);
  }

  const categoryByName = new Map<string, string>();
  const seededCategories = await prisma.category.findMany({
    where: { organizationId: organization.id },
    select: { id: true, name: true },
  });
  for (const c of seededCategories) categoryByName.set(c.name, c.id);

  for (const p of productsSeed) {
    const normalizedName = normalizeName(p.name);
    const categoryId = p.categoryName ? categoryByName.get(p.categoryName) ?? null : null;
    await prisma.product.upsert({
      where: { organizationId_normalizedName: { organizationId: organization.id, normalizedName } },
      update: {},
      create: {
        organizationId: organization.id,
        categoryId,
        name: p.name,
        normalizedName,
        description: p.description,
        baseUnit: p.baseUnit,
        isInventoryTracked: p.isInventoryTracked,
        isPurchasable: p.isPurchasable,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`  Product: ${p.name}`);
  }

  for (const s of suppliersSeed) {
    const normalizedName = normalizeName(s.name);
    await prisma.supplier.upsert({
      where: { organizationId_normalizedName: { organizationId: organization.id, normalizedName } },
      update: {},
      create: {
        organizationId: organization.id,
        name: s.name,
        normalizedName,
        contactPerson: s.contactPerson,
        phone: s.phone,
        email: s.email,
        address: s.address,
        taxId: s.taxId,
        notes: s.notes,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`  Supplier: ${s.name}`);
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
