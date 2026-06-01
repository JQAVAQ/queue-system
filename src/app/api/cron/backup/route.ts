import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Daily backup to GitHub Gist - called by Vercel Cron
export async function GET() {
  try {
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

    // Check if gist already exists (stored in AdminConfig)
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
      // Update existing gist
      response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gistBody),
      });
    } else {
      // Create new gist
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
      return NextResponse.json({ error: "Gist backup failed" }, { status: 500 });
    }

    const result = await response.json();

    // Save gist ID for future updates
    if (!gistId) {
      await prisma.adminConfig.create({
        data: { id: "gist_id", value: result.id },
      });
    }

    return NextResponse.json({ success: true, gistUrl: result.html_url });
  } catch (error) {
    console.error("Daily backup failed:", error);
    return NextResponse.json({ error: "备份失败" }, { status: 500 });
  }
}
