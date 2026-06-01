import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wechatId, wechatNickname, email, token } = body;

    // Validate required fields
    if (!wechatId || !wechatNickname || !token) {
      return NextResponse.json({ error: "微信号、昵称和报名链接都是必填的" }, { status: 400 });
    }

    // Validate token
    const validToken = await prisma.token.findFirst({
      where: { value: token, active: true },
    });
    if (!validToken) {
      return NextResponse.json({ error: "无效的报名链接，请联系管理员" }, { status: 403 });
    }

    // Check if this registration matches an existing user
    // Rule 1: If existing user has imported_XXX wechatId → match by nickname
    // Rule 2: If existing user has real wechatId → match by wechatId

    // First try to match by wechatId (for real wechatId users)
    let existing = await prisma.user.findUnique({ where: { wechatId } });

    // If not found by wechatId, try to match by nickname (for imported users)
    if (!existing) {
      existing = await prisma.user.findFirst({
        where: { wechatNickname: wechatNickname },
      });
    }

    // If found an existing user
    if (existing) {
      // Reject if already SUCCESS
      if (existing.status === "SUCCESS") {
        return NextResponse.json({ error: "该用户已完成认证，无需重复注册" }, { status: 400 });
      }

      // Determine what to update based on the existing user's wechatId format
      const isImported = existing.wechatId.startsWith("imported_");

      if (isImported) {
        // Imported user: match by nickname, update wechatId + email
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            wechatId: wechatId,
            email: email || "",
          },
        });
      } else {
        // Real user: match by wechatId, update nickname + email
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            wechatNickname: wechatNickname,
            email: email,
          },
        });
      }

      return NextResponse.json({
        success: true,
        updated: true,
        user: { position: existing.position, status: existing.status },
      });
    }

    // No match found → create new user at end of queue
    const maxPos = await prisma.user.aggregate({ _max: { position: true } });
    const nextPosition = (maxPos._max.position ?? 0) + 1;

    const user = await prisma.user.create({
      data: {
        wechatId,
        wechatNickname,
        email,
        position: nextPosition,
        status: "WAITING",
      },
    });

    return NextResponse.json({ success: true, updated: false, user: { position: user.position, status: user.status } });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "报名失败，请重试" }, { status: 500 });
  }
}
