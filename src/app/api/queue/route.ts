import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: { in: ["WAITING", "AUTHENTICATING", "FAILED"] },
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

    // Calculate estimated date for each user
    // Today + index (0-based) = estimated date
    // AUTHENTICATING user is today, next is tomorrow, etc.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayMs = new Date(todayStr + "T00:00:00").getTime();

    const usersWithDate = users.map((u: { id: string; wechatNickname: string; position: number; status: string; failCount: number }, index: number) => {
      const d = new Date(todayMs + index * 86400000);
      const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
      return {
        ...u,
        estimatedDate: dateStr,
      };
    });

    return NextResponse.json({ users: usersWithDate });
  } catch (error) {
    console.error("Failed to fetch queue:", error);
    return NextResponse.json({ error: "获取队列失败" }, { status: 500 });
  }
}
