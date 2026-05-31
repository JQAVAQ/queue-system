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

    // Calculate estimated date for each user using Beijing time (UTC+8)
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const bjMs = utcMs + 8 * 3600000;
    const bj = new Date(bjMs);
    const year = bj.getFullYear();
    const month = bj.getMonth();
    const day = bj.getDate();
    const todayBjMs = new Date(year, month, day).getTime() - 8 * 3600000;

    const usersWithDate = users.map((u: { id: string; wechatNickname: string; position: number; status: string; failCount: number }, index: number) => {
      const d = new Date(todayBjMs + (index + 1) * 86400000);
      const dateStr = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
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
