import * as XLSX from "xlsx";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: `file:${path.resolve(__dirname, "../prisma/dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function importUsers() {
  const excelPath = path.resolve(__dirname, "../../报名名单.xls");
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

  console.log(`读取到 ${data.length} 条数据`);
  console.log("列名:", Object.keys(data[0] || {}));

  // Preview first 5 rows
  console.log("\n前5条数据预览:");
  data.slice(0, 5).forEach((row, i) => console.log(`  ${i + 1}:`, row));

  // The Excel only has one column with nicknames like "1. Caliber"
  // Extract nickname from the first column value
  const firstCol = Object.keys(data[0] || {})[0];
  if (!firstCol) {
    console.error("无法读取数据列");
    return;
  }

  console.log(`\n使用列 "${firstCol}" 作为昵称来源\n`);

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rawValue = (row[firstCol] || "").trim();

    if (!rawValue) {
      console.log(`跳过第 ${i + 1} 行: 空值`);
      skipCount++;
      continue;
    }

    // Extract nickname - remove leading number and dot (e.g., "1. Caliber" -> "Caliber")
    const nickname = rawValue.replace(/^\d+\.\s*/, "").trim();

    if (!nickname) {
      console.log(`跳过第 ${i + 1} 行: 解析后昵称为空`);
      skipCount++;
      continue;
    }

    // Generate a unique wechatId from nickname (since we don't have actual wechatId)
    const wechatId = `imported_${nickname}_${i}`;

    try {
      const existing = await prisma.user.findUnique({ where: { wechatId } });
      if (existing) {
        console.log(`跳过第 ${i + 1} 行: ${nickname} 已存在`);
        skipCount++;
        continue;
      }

      const maxPos = await prisma.user.aggregate({ _max: { position: true } });
      const nextPosition = (maxPos._max.position ?? 0) + 1;

      await prisma.user.create({
        data: {
          wechatId,
          wechatNickname: nickname,
          email: "", // No email in the Excel
          position: nextPosition,
          status: "WAITING",
        },
      });
      console.log(`✓ 导入 ${nickname} -> 位置 ${nextPosition}`);
      successCount++;
    } catch (err: any) {
      console.error(`导入第 ${i + 1} 行失败:`, err.message);
      skipCount++;
    }
  }

  console.log(`\n导入完成: 成功 ${successCount} 条, 跳过 ${skipCount} 条`);
  await prisma.$disconnect();
}

importUsers().catch(console.error);
