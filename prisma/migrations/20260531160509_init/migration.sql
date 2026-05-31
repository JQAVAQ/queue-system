-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wechatId" TEXT NOT NULL,
    "wechatNickname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AdminConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'admin',
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wechatId_key" ON "users"("wechatId");

-- CreateIndex
CREATE UNIQUE INDEX "users_position_key" ON "users"("position");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_value_key" ON "tokens"("value");
