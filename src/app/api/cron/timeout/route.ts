import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// This endpoint is called by Vercel Cron or external cron service every hour
// It checks for users who have been AUTHENTICATING for more than 24 hours
export async function GET() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const timedOutUsers = await prisma.user.findMany({
      where: {
        status: "AUTHENTICATING",
        updatedAt: { lt: twentyFourHoursAgo },
      },
    });

    for (const user of timedOutUsers) {
      // Mark as TIMEOUT
      await prisma.user.update({
        where: { id: user.id },
        data: { status: "TIMEOUT" },
      });
    }

    // If any users timed out, promote next WAITING user
    if (timedOutUsers.length > 0) {
      const nextUser = await prisma.user.findFirst({
        where: { status: "WAITING" },
        orderBy: { position: "asc" },
      });
      if (nextUser) {
        await prisma.user.update({
          where: { id: nextUser.id },
          data: { status: "AUTHENTICATING" },
        });
      }
    }

    return NextResponse.json({
      success: true,
      timedOut: timedOutUsers.length,
    });
  } catch (error) {
    console.error("Cron timeout check failed:", error);
    return NextResponse.json({ error: "超时检查失败" }, { status: 500 });
  }
}
