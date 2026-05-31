import { createClient } from "@libsql/client";
import * as XLSX from "xlsx";
import path from "path";
import "dotenv/config";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function initDB() {
  console.log("正在初始化 Turso 数据库...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "wechatId" TEXT NOT NULL,
      "wechatNickname" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "position" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'WAITING',
      "failCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `);

  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "users_wechatId_key" ON "users"("wechatId")
  `);

  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "users_position_key" ON "users"("position")
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "tokens" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "tokens_value_key" ON "tokens"("value")
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "AdminConfig" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'admin',
      "value" TEXT NOT NULL
    )
  `);

  console.log("✓ 数据库表创建成功");

  // Import users from Excel
  const excelPath = path.resolve(__dirname, "../../报名名单.xls");
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  console.log(`读取到 ${data.length} 条数据`);

  const firstCol = Object.keys(data[0] || {})[0];
  if (!firstCol) {
    console.error("无法读取数据列");
    return;
  }

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rawValue = (row[firstCol] || "").trim();
    if (!rawValue) {
      skipCount++;
      continue;
    }

    const nickname = rawValue.replace(/^\d+\.\s*/, "").trim();
    if (!nickname) {
      skipCount++;
      continue;
    }

    const wechatId = `imported_${nickname}_${i}`;
    const id = `user_${i}_${Date.now()}`;

    try {
      await client.execute({
        sql: `INSERT OR IGNORE INTO "users" ("id", "wechatId", "wechatNickname", "email", "position", "status", "failCount", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, 'WAITING', 0, datetime('now'), datetime('now'))`,
        args: [id, wechatId, nickname, "", i + 1],
      });
      console.log(`✓ 导入 ${nickname} -> 位置 ${i + 1}`);
      successCount++;
    } catch (err: any) {
      console.error(`导入 ${nickname} 失败:`, err.message);
      skipCount++;
    }
  }

  console.log(`\n导入完成: 成功 ${successCount} 条, 跳过 ${skipCount} 条`);
  await client.close();
}

initDB().catch(console.error);
