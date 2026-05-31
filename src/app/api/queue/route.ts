import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: { in: ["WAITING", "AUTHENTICATING", "FAILED", "TIMEOUT"] },
      },
      orderBy: { position: "asc" },
      select: {
        id: true,
        wechatNickname: true,
        position: true,
        status: true,
        failCount: true,
      },
    });

    // Desensitize nickname for public view
    const publicUsers = users.map((u) => ({
      ...u,
      wechatNickname:
        u.wechatNickname.length > 2
          ? u.wechatNickname[0] + "*".repeat(u.wechatNickname.length - 2) + u.wechatNickname[u.wechatNickname.length - 1]
          : u.wechatNickname[0] + "*",
    }));

    return NextResponse.json({ users: publicUsers });
  } catch (error) {
    console.error("Failed to fetch queue:", error);
    return NextResponse.json({ error: "获取队列失败" }, { status: 500 });
  }
}
