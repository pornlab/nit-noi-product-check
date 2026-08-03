# Warehouse — складской учёт для HoReCa

Веб-приложение для учёта инвентаризаций и поступлений (изначально — для сети
Nit Noi Coffee). Мульти-организация, RBAC (admin / manager / employee),
несколько зон, поставщики, целевые уровни запаса, локализация RU/EN/TH.

**Реализовано на текущем этапе:**

- monorepo `backend` + `frontend`;
- **auth**: JWT + Passport, три роли (`admin` = владелец, `manager`, `employee`);
- **справочники**: организации, пользователи, должности, зоны, поставщики, категории;
- **товары**: карточка с зонами использования, целевым запасом (min / optimal),
  колонки «Остаток», «Цена» (из последнего поступления), «Норма»; подсветка строк
  жёлтым / красным при опускании ниже optimal / min; фильтры;
- **инвентаризация**: сессии по зонам с уникальным номером `INV-###`,
  черновики (`localStorage` на клиенте), финализация одной кнопкой, история
  по зонам, детальный просмотр сессии; **admin (владелец) может править
  количество** уже завершённой позиции — правка помечается чипом «исправлено»
  с автором и временем;
- **поступления**: документ `ПН-######` с датой, поставщиком, стоимостью
  доставки, валютой (по умолчанию THB); строки со стоимостью партии и
  распределением по зонам товара; правила по дате: manager — не раньше вчерашней,
  admin — любая; **admin может редактировать / удалять** поступление;
- расчёт остатка на странице товаров = последняя инвентаризация + приходы после неё
  (формат `M (+N)`);
- **i18n**: словари RU / EN / TH, переключатель языка в шапке, сохранение в
  `localStorage` (`warehouse-locale`), дефолт — английский;
- Docker Compose для локальной PostgreSQL;
- seed с тремя тестовыми пользователями (`admin`, `manager`, `employee`) и
  демо-данными Nit Noi.

## Стек

**Backend:** Node.js, TypeScript, NestJS, Prisma ORM, PostgreSQL, JWT (`@nestjs/jwt` + Passport), bcrypt, class-validator.

**Frontend:** React 19, TypeScript, Next.js 15 (App Router), MUI 7, react-hook-form, zod. За основу взят бесплатный шаблон [Devias Material Kit React](https://github.com/devias-io/material-kit-react).

**Инфраструктура:** Docker Compose (PostgreSQL 16).

## Требования

- Node.js 20+;
- npm 10+ (проект использует **только npm**, поле `packageManager` зафиксировано в `package.json`);
- Docker + Docker Compose.

## Структура проекта

```
.
├── backend/               # NestJS API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
├── frontend/              # Next.js на базе Devias Kit
│   └── src/
├── docker-compose.yml     # PostgreSQL
├── .env.example           # переменные для docker-compose
└── README.md
```

## Базы данных

Проект использует **две отдельные базы** в PostgreSQL:

| База            | Назначение                                          |
| --------------- | --------------------------------------------------- |
| `products_dev`  | Локальная разработка (`DATABASE_URL` в `.env`).     |
| `products_test` | Интеграционные / API тесты (передаётся через `TEST_DATABASE_URL` или временно через `DATABASE_URL=...` перед командой). |

> ⚠️ **`prisma migrate reset` УНИЧТОЖАЕТ данные** в базе, на которую указывает `DATABASE_URL`. Разрешено запускать только против `products_dev` или `products_test`. Никогда — против production или чужой существующей базы.
>
> При запуске проекта на общем PostgreSQL-сервере обязательно проверяйте `DATABASE_URL` перед `migrate reset` / `migrate dev`. При сомнении сначала сделайте `\l` в `psql` и убедитесь, что база — ваша dev/test.

Создание баз вручную (если PostgreSQL уже поднят):

```bash
docker exec -it <postgres-container> psql -U <user> -c 'CREATE DATABASE products_dev;'
docker exec -it <postgres-container> psql -U <user> -c 'CREATE DATABASE products_test;'
```

## Настройка `.env`

В корне проекта:

```bash
cp .env.example .env
```

Для backend:

```bash
cp backend/.env.example backend/.env
```

Для frontend:

```bash
cp frontend/.env.example frontend/.env.local
```

По умолчанию значения согласованы: PostgreSQL слушает `localhost:5433`
(порт задаётся в корневом `.env` — `POSTGRES_PORT`), backend —
`http://localhost:4000`, frontend — `http://localhost:3000`.
Перед публикацией **обязательно** замените `JWT_SECRET` в `backend/.env`.

## Запуск PostgreSQL

```bash
docker compose up -d
```

Остановка:

```bash
docker compose down
```

## Backend

### Установка зависимостей

```bash
cd backend
npm install
```

### Prisma: генерация клиента и миграции

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

### Seed (тестовые пользователи)

```bash
npm run prisma:seed
```

Seed идемпотентен — повторный запуск не создаёт дубликатов.

### Запуск API

```bash
npm run start:dev
```

API поднимется на `http://localhost:4000`.

## Frontend

### Установка зависимостей

```bash
cd frontend
npm install
```

### Запуск

```bash
npm run frontend:dev
```

Приложение будет доступно на `http://localhost:3000`. Сборка для продакшена —
`npm run build`, запуск после сборки — `npm run start`.

## Тестовые пользователи

Все пароли — `password`.

| Email                  | Роль       |
| ---------------------- | ---------- |
| `admin@example.com`    | `admin`    |
| `manager@example.com`  | `manager`  |
| `employee@example.com` | `employee` |

## API

Базовый URL: `http://localhost:4000`.

### `POST /auth/login`

Запрос:

```json
{ "email": "admin@example.com", "password": "password" }
```

Ответ 200:

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "…",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "admin"
  }
}
```

При неверных данных — `401 Unauthorized`.

### `GET /auth/me`

Требует заголовок `Authorization: Bearer <accessToken>`.

Ответ 200:

```json
{
  "id": "…",
  "email": "admin@example.com",
  "name": "Admin",
  "role": "admin"
}
```

Без токена или с недействительным токеном — `401 Unauthorized`.

## Collector API (внешние интеграции)

Read-only API для внешних систем (аналитика, коллекторы, AI-помощник),
которым нужно затянуть данные warehouse — инвентаризации, поступления,
утилизации, справочники. Отдельный от юзерского JWT, работает по API-key.

**Базовый URL:** `http://localhost:4000/api/v1/collector`

### Аутентификация

Заголовок `X-API-Key: <ключ>`. Ключ и id организации задаются в env
backend'а — один ключ = одна организация. Если хотя бы одно значение
пустое, endpoint отвечает `401 Unauthorized: Collector API disabled`
(вкл./выкл. фичи).

```env
# backend/.env
COLLECTOR_API_KEY=<длинная случайная строка, например `openssl rand -hex 32`>
COLLECTOR_ORG_ID=<uuid организации из таблицы organizations>
```

Сравнение ключей — constant-time (защита от time-attack).

### Endpoints

Все `GET`, отвечают JSON-массивом. Для транзакционных таблиц —
сортировка по хронологии **ASC** (удобно для инкрементального pull),
фильтры по датам **включительные**, формат `YYYY-MM-DD`, интерпретация
по UTC-дню. `limit` — 500 по умолчанию, максимум 1000.

| Endpoint | Параметры | Что возвращает |
| -------- | --------- | -------------- |
| `GET /zones`               | —                                     | Все зоны организации: `id`, `name`, `description`, `isActive`, `createdAt`, `updatedAt`. |
| `GET /suppliers`           | —                                     | Все поставщики: контакты, `isActive`, timestamps. |
| `GET /products`            | —                                     | Все товары: `category`, `baseUnit`, `sku`, `barcode`, `minQuantity`, `optimalQuantity`, `zoneIds[]`, флаги. |
| `GET /inventory-sessions`  | `from`, `to`, `zoneId`, `limit`       | Завершённые инвентаризации со всеми позициями: qty, product, updatedBy (для правок админа). |
| `GET /receivings`          | `from`, `to`, `supplierId`, `limit`   | Поступления с items (qty, cost) и allocations (по зонам), `currency`, `deliveryCost`, `sequenceNumber`. |
| `GET /disposals`           | `from`, `to`, `zoneId`, `limit`       | Утилизации со списком позиций. |

### Пример вызова

```bash
KEY=<your-collector-api-key>

# Все утилизации за июль 2026
curl -H "X-API-Key: $KEY" \
  "http://localhost:4000/api/v1/collector/disposals?from=2026-07-01&to=2026-07-31"

# Справочник товаров
curl -H "X-API-Key: $KEY" \
  "http://localhost:4000/api/v1/collector/products"
```

### Инкрементальный pull

Клиент хранит `lastPulledAt`. При следующем заходе передаёт `from=<lastPulledAt>`,
получает всё новое (сортировка ASC гарантирует порядок), в конце запоминает
свежайший `receivedAt` / `completedAt` / `createdAt` из ответа. `id` записей
стабильные (cuid), можно использовать как ключ идемпотентности.

### Дизайн-правила API

- **Плоский JSON, никакой бизнес-логики.** Только данные, агрегации — на стороне потребителя.
- **Схема стабильна.** Изменения — добавлением полей; удаление/переименование
  требует новой версии (`/api/v2/collector/...`).
- **Timestamps — ISO 8601 UTC.**
- **Decimals — строки** (`quantity: "12.500"`), чтобы не терялась точность в JSON-парсерах.

## Хранение JWT на фронтенде

Для MVP токен сохраняется в `localStorage` (ключ `warehouse-auth-token`).
Работа с токеном инкапсулирована в `frontend/src/lib/api/http.ts` и
`frontend/src/lib/auth/client.ts`, что позволит без переработки страниц
позднее перейти на access + refresh токены в `httpOnly` cookies.

## Полный сценарий проверки

```bash
# 1. Поднять PostgreSQL
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run start:dev

# 3. В другом терминале — frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Открыть `http://localhost:3000`, войти под одним из тестовых пользователей
и убедиться, что отображаются имя, email и роль, а кнопка «Выйти» очищает
токен и возвращает на форму входа.

## Локализация

- Поддерживаются три языка: `en` (по умолчанию), `ru`, `th`.
- Переключатель — в шапке (иконка `Translate` с двухбуквенным кодом).
- Выбранный язык сохраняется в `localStorage` (`warehouse-locale`).
- Словари: `frontend/src/lib/i18n/dictionaries/{en,ru,th}.ts`.
  Ключ типа `products.pageTitle`, интерполяция через `{name}` в шаблоне:
  `t('receivings.confirmDeleteBody', { number: 'ПН-000001' })`.
- Даты форматируются без кириллицы (`dd.MM.yyyy`, `HH:mm`) — одинаково во всех локалях.
- Полностью переведены: меню/шапка, страницы **Инвентаризация** (список зон,
  проведение, история, детальный просмотр), **Товары** (список + диалог),
  **Поступления** (список, создание, редактирование, детальный просмотр,
  пикер товаров). Остальные экраны (справочники: пользователи, должности,
  зоны, поставщики, категории; страница входа) — пока на русском.

## Основные модули

**Backend (Nest):**

- `auth` — вход, JWT, `JwtAuthGuard`, `RolesGuard`, декоратор `@Roles(...)`;
- `organizations`, `users`, `positions`, `zones`, `suppliers`, `categories`, `products`;
- `products` — управление зонами товара (`ProductZone`), цели запаса
  (`minQuantity`, `optimalQuantity`);
- `inventory` — `InventorySession` + `InventoryItem`, per-org счётчик
  через `pg_advisory_xact_lock`, правка `updateItemQuantity` с аудитом
  (`updatedById`); `zoneEligibleProducts` = только активные, `isInventoryTracked=true`,
  принадлежащие зоне через `ProductZone`;
- `receivings` — `Receiving` + `ReceivingItem` + `ReceivingAllocation`; правила по
  дате (admin — любая, manager — не раньше вчерашней); валидация: `sum(allocations) ==
  quantity`, зоны только из `product.zones`, товары — активные и `isPurchasable`;
  `admin` может `PATCH` / `DELETE`.
- `disposals` — `Disposal` + `DisposalItem`, списание с зоны (порча, брак, бой).
  Создавать может любая роль в пределах доступных зон, удалять — только admin
  (кебаб-меню в списке). Список группируется по дням, сводка со стоимостью
  считается по последним ценам поступлений (`?` / `>` префиксы при неизвестных ценах).
- `collector` — read-only API-key endpoints для внешних систем (см. раздел
  «Collector API»). Отдельный `ApiKeyGuard`, полностью изолирован от юзерского JWT.

**Frontend (Next 15 App Router):**

- `/dashboard/inventory` — список зон с последней инвентаризацией;
- `/dashboard/inventory/[zoneId]` — проведение инвентаризации (черновики
  в `localStorage`);
- `/dashboard/inventory/[zoneId]/history` — история по зоне;
- `/dashboard/inventory/sessions/[id]` — детальный просмотр + правка позиций;
- `/dashboard/products` — список с фильтрами, «Остаток `M(+N)`», «Цена» из
  последнего поступления, «Норма `optimal(min)`», подсветка строк ниже порогов;
- `/dashboard/receivings` — список;
- `/dashboard/receivings/new` — создание поступления;
- `/dashboard/receivings/[id]` — просмотр + кнопки edit / delete (admin only);
- `/dashboard/receivings/[id]/edit` — редактирование (admin only);
- `/dashboard/disposals` — список утилизаций с группировкой по дням, фильтрами
  (даты, зона, роль автора для admin), кебаб-меню «Удалить» (admin only);
- `/dashboard/disposals/new` — создание утилизации (одна зона → множество позиций);
- `/dashboard/organization` и её подпункты — справочники (users / positions /
  zones / suppliers / categories).
