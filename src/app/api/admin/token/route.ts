import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function checkAdminAuth(password: string): Promise<boolean> {
  const config = await prisma.adminConfig.findUnique({ where: { id: "admin" } });
  if (!config) return false;
  return bcrypt.compareSync(password, config.value);
}

// POST: Generate new token
export async function POST(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    if (!password || !(await checkAdminAuth(password))) {
      return NextResponse.json({ error: "管理员密码错误" }, { status: 401 });
    }

    const tokenValue = crypto.randomBytes(16).toString("hex");
    const token = await prisma.token.create({
      data: { value: tokenValue, active: true },
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token creation failed:", error);
    return NextResponse.json({ error: "创建token失败" }, { status: 500 });
  }
}

// DELETE: Deactivate a token
export async function DELETE(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    if (!password || !(await checkAdminAuth(password))) {
      return NextResponse.json({ error: "管理员密码错误" }, { status: 401 });
    }

    const body = await req.json();
    const { tokenId } = body;

    await prisma.token.update({
      where: { id: tokenId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Token deactivation failed:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
