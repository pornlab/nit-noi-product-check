-- Валюта поступления. Пока по умолчанию THB (тайский бат).
ALTER TABLE "receivings"
  ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'THB';
