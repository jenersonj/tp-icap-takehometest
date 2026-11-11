-- CreateEnum
CREATE TYPE "Side" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'AMENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TRADER', 'VIEWER');

-- CreateTable
CREATE TABLE "trades" (
    "id" UUID NOT NULL,
    "tradeRef" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "Side" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "trader" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "tradeTimestamp" TIMESTAMPTZ(3) NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdById" UUID,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_audits" (
    "id" UUID NOT NULL,
    "tradeId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "version" INTEGER NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "changed" TEXT[],
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "symbol" TEXT NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "asOf" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "traderCode" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TRADER',
    "books" TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socket_tickets" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "allowedGroups" TEXT[],
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "sessionExpiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),

    CONSTRAINT "socket_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trades_tradeRef_key" ON "trades"("tradeRef");

-- CreateIndex
CREATE INDEX "trades_status_tradeTimestamp_idx" ON "trades"("status", "tradeTimestamp");

-- CreateIndex
CREATE INDEX "trades_book_symbol_idx" ON "trades"("book", "symbol");

-- CreateIndex
CREATE INDEX "trades_trader_idx" ON "trades"("trader");

-- CreateIndex
CREATE INDEX "trade_audits_tradeId_at_idx" ON "trade_audits"("tradeId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_traderCode_key" ON "users"("traderCode");

-- CreateIndex
CREATE INDEX "socket_tickets_expiresAt_idx" ON "socket_tickets"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- AddForeignKey
ALTER TABLE "trade_audits" ADD CONSTRAINT "trade_audits_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
