/**
 * Разовый скрипт для наполнения демо-данных: несколько утилизаций за разные дни.
 * Запуск: `npx ts-node scripts/demo-disposals.ts` из backend/.
 *
 * Что делает:
 *  - находит организацию Nit Noi Coffee и любого admin-пользователя;
 *  - берёт активные зоны и товары этих зон (только активные + isInventoryTracked);
 *  - создаёт ~8 утилизаций с бэкдейт-createdAt на сегодня / вчера / 2 дня / 5 дней / неделю назад;
 *  - в каждой — от 1 до 3 SKU.
 *
 * Скрипт идемпотентным НЕ является — каждый запуск добавляет новые записи.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const org = await prisma.organization.findFirst({ where: { name: 'Nit Noi Coffee' } });
  if (!org) throw new Error('Организация Nit Noi Coffee не найдена. Сначала запусти seed.');

  const user = await prisma.user.findFirst({
    where: { organizationId: org.id, role: 'admin', isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!user) throw new Error('Нет admin-пользователя в организации.');

  const zones = await prisma.zone.findMany({
    where: { organizationId: org.id, isActive: true },
    orderBy: { name: 'asc' },
  });
  if (zones.length === 0) throw new Error('Нет активных зон. Создай зоны через UI.');

  // Для каждой зоны — список её товаров.
  const zoneProducts = new Map<string, string[]>();
  for (const z of zones) {
    const products = await prisma.product.findMany({
      where: {
        organizationId: org.id,
        isActive: true,
        isInventoryTracked: true,
        zones: { some: { zoneId: z.id } },
      },
      select: { id: true },
    });
    zoneProducts.set(z.id, products.map((p) => p.id));
  }

  const zonesWithProducts = zones.filter((z) => (zoneProducts.get(z.id) ?? []).length > 0);
  if (zonesWithProducts.length === 0) {
    throw new Error('Нет ни одной зоны с товарами. Привяжи товары к зонам в UI.');
  }

  // (daysBack, hour, minute, itemsCount)
  const plan: Array<[number, number, number, number]> = [
    [0, 8, 15, 1],   // сегодня утром — 1 SKU
    [0, 14, 40, 2],  // сегодня днём — 2 SKU
    [0, 19, 5, 3],   // сегодня вечером — 3 SKU
    [1, 9, 30, 2],   // вчера утром
    [1, 17, 55, 1],  // вчера вечером
    [2, 11, 10, 3],  // 2 дня назад
    [5, 15, 20, 2],  // 5 дней назад
    [7, 10, 0, 1],   // неделю назад
  ];

  for (const [i, [daysBack, hour, minute, count]] of plan.entries()) {
    const zone = zonesWithProducts[i % zonesWithProducts.length];
    const pids = zoneProducts.get(zone.id)!;
    const pickCount = Math.min(pids.length, count);
    // берём разные срезы товаров, чтобы утилизации отличались
    const start = (i * 2) % pids.length;
    const chosen: string[] = [];
    for (let j = 0; j < pickCount; j++) chosen.push(pids[(start + j) % pids.length]);

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysBack);
    createdAt.setHours(hour, minute, 0, 0);

    await prisma.disposal.create({
      data: {
        organizationId: org.id,
        zoneId: zone.id,
        createdById: user.id,
        createdAt,
        items: {
          create: chosen.map((pid, idx) => ({
            productId: pid,
            quantity: new Prisma.Decimal((idx + 1) * 3 + (i % 4)),
          })),
        },
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Disposal ${i + 1}: ${zone.name}, ${pickCount} SKU, ${daysBack}d back ${hour}:${String(minute).padStart(2, '0')}`);
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
