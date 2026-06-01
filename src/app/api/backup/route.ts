import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET: Export backup (download JSON or get gist info)
export async function GET(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    if (!password) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const adminConfig = await prisma.adminConfig.findUnique({ where: { id: "admin" } });
    if (!adminConfig || !bcrypt.compareSync(password, adminConfig.value)) {
      return NextResponse.json({ error: "管理员密码错误" }, { status: 401 });
    }

    const users = await prisma.user.findMany({ orderBy: { position: "asc" } });
    const tokens = await prisma.token.findMany({ where: { active: true } });

    // Get gist URL if exists
    const gistConfig = await prisma.adminConfig.findUnique({ where: { id: "gist_id" } });
    let gistUrl = null;
    if (gistConfig) {
      gistUrl = `https://gist.github.com/${gistConfig.value}`;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      users,
      tokens,
      gistUrl,
    });
  } catch (error) {
    console.error("Backup export failed:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}

// POST: Manual backup to Gist
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

    const users = await prisma.user.findMany({ orderBy: { position: "asc" } });
    const tokens = await prisma.token.findMany({ where: { active: true } });

    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      tokens,
    };

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
    }

    const gistConfig = await prisma.adminConfig.findUnique({ where: { id: "gist_id" } });
    const gistId = gistConfig?.value;

    const gistBody = {
      description: `Queue System Backup - ${new Date().toISOString().slice(0, 10)}`,
      files: {
        "queue-backup.json": {
          content: JSON.stringify(backupData, null, 2),
        },
      },
    };

    let response;
    if (gistId) {
      response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gistBody),
      });
    } else {
      response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...gistBody, public: false }),
      });
    }

    if (!response.ok) {
      const err = await response.text();
      console.error("Gist API error:", err);
      return NextResponse.json({ error: "Gist 备份失败" }, { status: 500 });
    }

    const result = await response.json();

    if (!gistId) {
      await prisma.adminConfig.create({
        data: { id: "gist_id", value: result.id },
      });
    }

    return NextResponse.json({ success: true, gistUrl: result.html_url });
  } catch (error) {
    console.error("Manual backup failed:", error);
    return NextResponse.json({ error: "备份失败" }, { status: 500 });
  }
}
