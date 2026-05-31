import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wechatId, wechatNickname, email, token } = body;

    // Validate required fields
    if (!wechatId || !wechatNickname || !email || !token) {
      return NextResponse.json({ error: "所有字段都是必填的" }, { status: 400 });
    }

    // Validate token
    const validToken = await prisma.token.findFirst({
      where: { value: token, active: true },
    });
    if (!validToken) {
      return NextResponse.json({ error: "无效的报名链接，请联系管理员" }, { status: 403 });
    }

    // Check duplicate wechatId
    const existing = await prisma.user.findUnique({ where: { wechatId } });
    if (existing) {
      return NextResponse.json({ error: "该微信号已报名，请勿重复提交" }, { status: 409 });
    }

    // Get next position
    const maxPos = await prisma.user.aggregate({ _max: { position: true } });
    const nextPosition = (maxPos._max.position ?? 0) + 1;

    // Create user
    const user = await prisma.user.create({
      data: {
        wechatId,
        wechatNickname,
        email,
        position: nextPosition,
        status: "WAITING",
      },
    });

    return NextResponse.json({ success: true, user: { position: user.position, status: user.status } });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "报名失败，请重试" }, { status: 500 });
  }
}
