import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET: Export all data as JSON (admin only)
export async function GET(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    if (!password) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const adminConfig = await prisma.adminConfig.findUnique({ where: { id: "admin" } });
    if (!adminConfig || !bcrypt.compareSync(password, adminConfig.value)) {
      return NextResponse.json({ error: "管理员密码错误" }, { status: 401 });
    }

    const users = await prisma.user.findMany({ orderBy: { position: "asc" } });
    const tokens = await prisma.token.findMany({ where: { active: true } });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      users,
      tokens,
    });
  } catch (error) {
    console.error("Backup export failed:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}

// POST: Auto backup (called by cron, no password needed)
export async function POST() {
  try {
    const users = await prisma.user.findMany({ orderBy: { position: "asc" } });
    const tokens = await prisma.token.findMany({ where: { active: true } });

    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      tokens,
    };

    // Store backup in AdminConfig (overwrite previous)
    await prisma.adminConfig.upsert({
      where: { id: "backup" },
      update: { value: JSON.stringify(backupData) },
      create: { id: "backup", value: JSON.stringify(backupData) },
    });

    return NextResponse.json({ success: true, timestamp: backupData.timestamp });
  } catch (error) {
    console.error("Auto backup failed:", error);
    return NextResponse.json({ error: "备份失败" }, { status: 500 });
  }
}
