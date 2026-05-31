import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET: Public - get announcement
export async function GET() {
  try {
    const config = await prisma.adminConfig.findUnique({ where: { id: "announcement" } });
    return NextResponse.json({
      content: config?.value || "",
      enabled: !!config && config.value.length > 0,
    });
  } catch (error) {
    console.error("Get announcement failed:", error);
    return NextResponse.json({ content: "", enabled: false });
  }
}

// PUT: Admin - update announcement
export async function PUT(req: NextRequest) {
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
    const { content } = body;

    await prisma.adminConfig.upsert({
      where: { id: "announcement" },
      update: { value: content || "" },
      create: { id: "announcement", value: content || "" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update announcement failed:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
