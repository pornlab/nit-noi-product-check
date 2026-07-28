# Warehouse — MVP складского учёта

Фундамент веб-приложения для будущей системы учёта инвентаризаций,
поступлений и утилизаций. На текущем этапе реализованы:

- monorepo-структура `backend` + `frontend`;
- backend на NestJS + Prisma + PostgreSQL с JWT-авторизацией;
- frontend на Next.js + MUI на базе шаблона **Devias Material Kit React**;
- страница входа, защищённый маршрут `/dashboard`, отображение роли пользователя;
- Docker Compose для локальной PostgreSQL;
- seed с тремя тестовыми пользователями (`admin`, `manager`, `employee`).

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

По умолчанию значения согласованы: PostgreSQL слушает `localhost:5432`,
backend — `http://localhost:4000`, frontend — `http://localhost:3000`.
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
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

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
и убедиться, что отображаются имя, email и роль (в виде `Chip`), а кнопка
«Выйти» очищает токен и возвращает на форму входа.
