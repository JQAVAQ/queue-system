import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST: Restore from JSON (file upload or Gist)
export async function POST(req: NextRequest) {
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
    let restoreData = body;

    // If source is "gist", fetch from GitHub Gist
    if (body.source === "gist") {
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
      }

      const gistConfig = await prisma.adminConfig.findUnique({ where: { id: "gist_id" } });
      if (!gistConfig) {
        return NextResponse.json({ error: "没有找到 Gist 备份" }, { status: 404 });
      }

      const response = await fetch(`https://api.github.com/gists/${gistConfig.value}`, {
        headers: { Authorization: `Bearer ${githubToken}` },
      });

      if (!response.ok) {
        return NextResponse.json({ error: "获取 Gist 失败" }, { status: 500 });
      }

      const gist = await response.json();
      const fileContent = gist.files["queue-backup.json"]?.content;
      if (!fileContent) {
        return NextResponse.json({ error: "Gist 中没有备份数据" }, { status: 404 });
      }

      restoreData = JSON.parse(fileContent);
    }

    const { users, tokens } = restoreData;

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: "无效的备份数据" }, { status: 400 });
    }

    // Clear existing data
    await prisma.user.deleteMany();
    await prisma.token.deleteMany();

    // Restore users
    for (const u of users) {
      await prisma.user.create({
        data: {
          id: u.id,
          wechatId: u.wechatId,
          wechatNickname: u.wechatNickname,
          email: u.email || "",
          position: u.position,
          status: u.status,
          failCount: u.failCount || 0,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
    }

    // Restore tokens
    if (tokens && Array.isArray(tokens)) {
      for (const t of tokens) {
        await prisma.token.create({
          data: {
            id: t.id,
            value: t.value,
            active: t.active,
            createdAt: new Date(t.createdAt),
          },
        });
      }
    }

    return NextResponse.json({ success: true, restored: { users: users.length, tokens: tokens?.length || 0 } });
  } catch (error) {
    console.error("Restore failed:", error);
    return NextResponse.json({ error: "恢复失败" }, { status: 500 });
  }
}

// GET: Get backup status
export async function GET() {
  try {
    const gistConfig = await prisma.adminConfig.findUnique({ where: { id: "gist_id" } });
    return NextResponse.json({
      hasGist: !!gistConfig,
      gistId: gistConfig?.value || null,
    });
  } catch (error) {
    return NextResponse.json({ hasGist: false });
  }
}
