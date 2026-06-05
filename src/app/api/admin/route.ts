import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Simple admin auth check
async function checkAdminAuth(password: string): Promise<boolean> {
  const config = await prisma.adminConfig.findUnique({ where: { id: "admin" } });
  if (!config) return false;
  return bcrypt.compareSync(password, config.value);
}

// GET: Admin login + fetch all user data
export async function GET(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    if (!password || !(await checkAdminAuth(password))) {
      return NextResponse.json({ error: "管理员密码错误" }, { status: 401 });
    }

    let users = await prisma.user.findMany({
      orderBy: { position: "asc" },
    });

    // Auto-correct: ensure the first queued user (non-SUCCESS, non-TIMEOUT) is AUTHENTICATING
    const nonSuccess = users.filter((u) => u.status !== "SUCCESS" && u.status !== "TIMEOUT");
    const currentAuth = users.find((u) => u.status === "AUTHENTICATING");

    if (nonSuccess.length > 0) {
      const shouldBeAuth = nonSuccess[0];
      if (!currentAuth || currentAuth.id !== shouldBeAuth.id) {
        // Demote current AUTHENTICATING (if any) back to WAITING
        if (currentAuth) {
          await prisma.user.update({
            where: { id: currentAuth.id },
            data: { status: "WAITING" },
          });
        }
        // Promote the first non-SUCCESS user to AUTHENTICATING
        await prisma.user.update({
          where: { id: shouldBeAuth.id },
          data: { status: "AUTHENTICATING" },
        });
        // Re-fetch to get updated state
        users = await prisma.user.findMany({
          orderBy: { position: "asc" },
        });
      }
    }

    const tokens = await prisma.token.findMany({
      where: { active: true },
    });

    return NextResponse.json({ users, tokens });
  } catch (error) {
    console.error("Admin GET failed:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}

// PUT: Update user status or position
export async function PUT(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    if (!password || !(await checkAdminAuth(password))) {
      return NextResponse.json({ error: "管理员密码错误" }, { status: 401 });
    }

    const body = await req.json();
    const { action, userId, newPosition, wechatId, wechatNickname, email, position } = body;

    if (!action) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // Handle addUser separately (doesn't require userId)
    if (action === "addUser") {
      if (!wechatId || !wechatNickname || !email) {
        return NextResponse.json({ error: "缺少用户信息" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { wechatId } });
      if (existing) {
        return NextResponse.json({ error: "该微信号已存在" }, { status: 409 });
      }
      const maxPos = await prisma.user.aggregate({ _max: { position: true } });
      const nextPos = (maxPos._max.position ?? 0) + 1;
      const newUser = await prisma.user.create({
        data: {
          wechatId,
          wechatNickname,
          email,
          position: nextPos,
          status: "WAITING",
        },
      });
      return NextResponse.json({ success: true, user: newUser });
    }

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    switch (action) {
      case "startAuth": {
        // First, demote any current AUTHENTICATING user back to WAITING
        await prisma.user.updateMany({
          where: { status: "AUTHENTICATING" },
          data: { status: "WAITING" },
        });
        // Then set the target user to AUTHENTICATING
        await prisma.user.update({
          where: { id: userId },
          data: { status: "AUTHENTICATING" },
        });
        return NextResponse.json({ success: true });
      }

      case "restore": {
        // Restore TIMEOUT user to bottom of queue with WAITING status
        const maxPos = await prisma.user.aggregate({ _max: { position: true } });
        await prisma.user.update({
          where: { id: userId },
          data: {
            status: "WAITING",
            position: (maxPos._max.position ?? 0) + 1,
          },
        });
        return NextResponse.json({ success: true });
      }

      case "success": {
        // Mark as SUCCESS, promote next queued user (non-SUCCESS, non-TIMEOUT)
        await prisma.user.update({
          where: { id: userId },
          data: { status: "SUCCESS" },
        });
        const nextUser = await prisma.user.findFirst({
          where: { status: { notIn: ["SUCCESS", "TIMEOUT"] } },
          orderBy: { position: "asc" },
        });
        if (nextUser) {
          await prisma.user.update({
            where: { id: nextUser.id },
            data: { status: "AUTHENTICATING" },
          });
        }
        return NextResponse.json({ success: true, nextUser });
      }

      case "fail": {
        // Mark as FAILED, move back 5 positions
        const maxPos = await prisma.user.aggregate({ _max: { position: true } });
        const currentPos = user.position;
        const targetPos = Math.min(currentPos + 5, (maxPos._max.position ?? 0) + 1);

        // Step 1: Temporarily move the user to a temp position to avoid unique constraint conflict
        await prisma.user.update({
          where: { id: userId },
          data: { position: 99999 },
        });

        // Step 2: Shift users between old and new position
        if (targetPos > currentPos) {
          // Move users between currentPos+1 and targetPos forward by 1
          await prisma.user.updateMany({
            where: {
              position: { gt: currentPos, lte: targetPos },
              id: { not: userId },
            },
            data: { position: { decrement: 1 } },
          });
        }

        // Step 3: Place the failed user at target position
        await prisma.user.update({
          where: { id: userId },
          data: {
            status: "FAILED",
            position: targetPos,
            failCount: { increment: 1 },
          },
        });

        // Step 4: Promote next queued user (non-SUCCESS, non-TIMEOUT)
        const nextUser = await prisma.user.findFirst({
          where: { status: { notIn: ["SUCCESS", "TIMEOUT"] } },
          orderBy: { position: "asc" },
        });
        if (nextUser) {
          await prisma.user.update({
            where: { id: nextUser.id },
            data: { status: "AUTHENTICATING" },
          });
        }
        return NextResponse.json({ success: true, nextUser });
      }

      case "skip": {
        // Skip without moving back - permanently blacklist
        await prisma.user.update({
          where: { id: userId },
          data: { status: "TIMEOUT" },
        });
        const nextUser = await prisma.user.findFirst({
          where: { status: { notIn: ["SUCCESS", "TIMEOUT"] } },
          orderBy: { position: "asc" },
        });
        if (nextUser) {
          await prisma.user.update({
            where: { id: nextUser.id },
            data: { status: "AUTHENTICATING" },
          });
        }
        return NextResponse.json({ success: true, nextUser });
      }

      case "reorder": {
        if (typeof newPosition !== "number") {
          return NextResponse.json({ error: "缺少新位置" }, { status: 400 });
        }
        // Reorder: swap positions or just update
        await prisma.user.update({
          where: { id: userId },
          data: { position: newPosition },
        });
        return NextResponse.json({ success: true });
      }

      case "delete": {
        const pos = user.position;
        await prisma.user.delete({ where: { id: userId } });
        // Reindex positions
        await prisma.user.updateMany({
          where: { position: { gt: pos } },
          data: { position: { decrement: 1 } },
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin PUT failed:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
