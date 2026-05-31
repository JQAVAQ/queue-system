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
    // Get Beijing date string directly
    const bjDateStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
    const todayMs = new Date(bjDateStr + "T00:00:00+08:00").getTime();

    const usersWithDate = users.map((u: { id: string; wechatNickname: string; position: number; status: string; failCount: number }, index: number) => {
      const d = new Date(todayMs + index * 86400000);
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
