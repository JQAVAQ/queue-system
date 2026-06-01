import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Daily backup - called by Vercel Cron
export async function GET() {
  try {
    const users = await prisma.user.findMany({ orderBy: { position: "asc" } });
    const tokens = await prisma.token.findMany({ where: { active: true } });

    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      tokens,
    };

    await prisma.adminConfig.upsert({
      where: { id: "backup" },
      update: { value: JSON.stringify(backupData) },
      create: { id: "backup", value: JSON.stringify(backupData) },
    });

    return NextResponse.json({ success: true, timestamp: backupData.timestamp });
  } catch (error) {
    console.error("Daily backup failed:", error);
    return NextResponse.json({ error: "备份失败" }, { status: 500 });
  }
}
