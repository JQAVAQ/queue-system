import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST: Restore from JSON backup
export async function POST(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    if (!password) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const adminConfig = await prisma.adminConfig.findUnique({ where: { id: "admin" } });
    if (!adminConfig || !bcrypt.compareSync(password, adminConfig.value)) {
      return NextResponse.json({ error: "管理员密码错误" }, { status: 401 });
    }

    const body = await req.json();
    const { users, tokens } = body;

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: "无效的备份数据" }, { status: 400 });
    }

    // Clear existing data
    await prisma.user.deleteMany();
    await prisma.token.deleteMany();

    // Restore users
    for (const u of users) {
      await prisma.user.create({
        data: {
          id: u.id,
          wechatId: u.wechatId,
          wechatNickname: u.wechatNickname,
          email: u.email || "",
          position: u.position,
          status: u.status,
          failCount: u.failCount || 0,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
    }

    // Restore tokens
    if (tokens && Array.isArray(tokens)) {
      for (const t of tokens) {
        await prisma.token.create({
          data: {
            id: t.id,
            value: t.value,
            active: t.active,
            createdAt: new Date(t.createdAt),
          },
        });
      }
    }

    return NextResponse.json({ success: true, restored: { users: users.length, tokens: tokens?.length || 0 } });
  } catch (error) {
    console.error("Restore failed:", error);
    return NextResponse.json({ error: "恢复失败" }, { status: 500 });
  }
}

// GET: Get stored backup info
export async function GET() {
  try {
    const backup = await prisma.adminConfig.findUnique({ where: { id: "backup" } });
    if (!backup) {
      return NextResponse.json({ exists: false });
    }

    const data = JSON.parse(backup.value);
    return NextResponse.json({
      exists: true,
      timestamp: data.timestamp,
      userCount: data.users?.length || 0,
    });
  } catch (error) {
    return NextResponse.json({ exists: false });
  }
}
