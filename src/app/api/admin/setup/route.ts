import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST: Initial admin password setup (only works once)
export async function POST(req: NextRequest) {
  try {
    const existing = await prisma.adminConfig.findUnique({ where: { id: "admin" } });
    if (existing) {
      return NextResponse.json({ error: "管理员密码已设置，无法重复设置" }, { status: 400 });
    }

    const body = await req.json();
    const { password } = body;

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
    }

    const hash = bcrypt.hashSync(password, 10);
    await prisma.adminConfig.create({
      data: { id: "admin", value: hash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin setup failed:", error);
    return NextResponse.json({ error: "设置失败" }, { status: 500 });
  }
}

// GET: Check if admin is already set up
export async function GET() {
  try {
    const config = await prisma.adminConfig.findUnique({ where: { id: "admin" } });
    return NextResponse.json({ isSetup: !!config });
  } catch (error) {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
