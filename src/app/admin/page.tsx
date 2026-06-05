"use client";

import { useEffect, useState, useCallback } from "react";

interface UserData {
  id: string;
  wechatId: string;
  wechatNickname: string;
  email: string;
  position: number;
  status: string;
  failCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TokenData {
  id: string;
  value: string;
  active: boolean;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  WAITING: { label: "未认证", color: "bg-yellow-100 text-yellow-800" },
  AUTHENTICATING: { label: "正在认证", color: "bg-blue-100 text-blue-800" },
  SUCCESS: { label: "已成功", color: "bg-green-100 text-green-800" },
  FAILED: { label: "认证失败", color: "bg-red-100 text-red-800" },
  TIMEOUT: { label: "已超时", color: "bg-gray-100 text-gray-800" },
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [setupPassword, setSetupPassword] = useState("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showTokenSection, setShowTokenSection] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ wechatId: "", wechatNickname: "", email: "" });
  const [showSuccessUsers, setShowSuccessUsers] = useState(false);
  const [showTimeoutUsers, setShowTimeoutUsers] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);

  const checkSetup = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/setup");
      const data = await res.json();
      setIsSetup(data.isSetup);
    } catch {
      setMessage({ type: "error", text: "检查设置状态失败" });
    }
  }, []);

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: setupPassword }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "管理员密码设置成功！" });
        setIsSetup(true);
      }
    } catch {
      setMessage({ type: "error", text: "设置失败" });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setUsers(data.users);
        setTokens(data.tokens);
        setIsLoggedIn(true);
        setMessage({ type: "", text: "" });
        fetchAnnouncement();
      }
    } catch {
      setMessage({ type: "error", text: "登录失败" });
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    try {
      const res = await fetch("/api/admin", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (!data.error) {
        setUsers(data.users);
        setTokens(data.tokens);
      }
    } catch {
      // silent
    }
  }

  async function fetchAnnouncement() {
    try {
      const res = await fetch("/api/announcement");
      const data = await res.json();
      setAnnouncementContent(data.content || "");
      setAnnouncementEnabled(data.enabled || false);
    } catch {
      // silent
    }
  }

  async function handleSaveAnnouncement() {
    setLoading(true);
    try {
      const res = await fetch("/api/announcement", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ content: announcementContent }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "公告已保存" });
        setAnnouncementEnabled(announcementContent.length > 0);
      }
    } catch {
      setMessage({ type: "error", text: "保存失败" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(userId: string, action: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ action, userId }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "操作成功" });
        await refreshData();
      }
    } catch {
      setMessage({ type: "error", text: "操作失败" });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateToken() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/token", {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "新报名链接已生成" });
        await refreshData();
      }
    } catch {
      setMessage({ type: "error", text: "生成失败" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivateToken(tokenId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/token", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ tokenId }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "链接已失效" });
        await refreshData();
      }
    } catch {
      setMessage({ type: "error", text: "操作失败" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const maxPos = users.length > 0 ? Math.max(...users.map((u) => u.position)) : 0;
      const res = await fetch("/api/admin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action: "addUser",
          ...newUser,
          position: maxPos + 1,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "用户添加成功" });
        setNewUser({ wechatId: "", wechatNickname: "", email: "" });
        setShowAddUser(false);
        await refreshData();
      }
    } catch {
      setMessage({ type: "error", text: "添加失败" });
    } finally {
      setLoading(false);
    }
  }

  async function handleExportBackup() {
    setLoading(true);
    try {
      const res = await fetch("/api/backup", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
        return;
      }
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `queue-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "备份已下载" });
    } catch {
      setMessage({ type: "error", text: "导出失败" });
    } finally {
      setLoading(false);
    }
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("导入将覆盖当前所有数据，确定继续吗？")) {
      e.target.value = "";
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `导入成功：${result.restored.users} 个用户，${result.restored.tokens} 个链接` });
        await refreshData();
      }
    } catch {
      setMessage({ type: "error", text: "导入失败，请检查文件格式" });
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  async function handleGistBackup() {
    setLoading(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "已备份到 GitHub Gist" });
      }
    } catch {
      setMessage({ type: "error", text: "Gist 备份失败" });
    } finally {
      setLoading(false);
    }
  }

  async function handleGistRestore() {
    if (!confirm("从 Gist 恢复将覆盖当前所有数据，确定继续吗？")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ source: "gist" }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: `从 Gist 恢复成功：${data.restored.users} 个用户` });
        await refreshData();
      }
    } catch {
      setMessage({ type: "error", text: "Gist 恢复失败" });
    } finally {
      setLoading(false);
    }
  }

  // Setup page
  if (isSetup === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">初始化设置</h1>
          <p className="text-gray-600 text-center mb-6">首次使用，请设置管理员密码</p>

          {message.text && (
            <div
              className={`p-3 rounded-lg text-sm mb-4 ${
                message.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">管理员密码</label>
              <input
                type="password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-500"
                placeholder="至少6位"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "设置中..." : "设置密码"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Login page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">管理员登录</h1>
          <p className="text-gray-600 text-center mb-6">请输入管理员密码</p>

          {message.text && (
            <div className="p-3 rounded-lg text-sm mb-4 bg-red-50 text-red-700 border border-red-200">
              {message.text}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-500"
                placeholder="请输入密码"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main admin dashboard
  // Queued users: non-SUCCESS and non-TIMEOUT (TIMEOUT = permanently blacklisted)
  const queuedUsers = users.filter((u) => u.status !== "SUCCESS" && u.status !== "TIMEOUT");
  const successUsers = users.filter((u) => u.status === "SUCCESS");
  const timeoutUsers = users.filter((u) => u.status === "TIMEOUT");
  const currentAuth = users.find((u) => u.status === "AUTHENTICATING");
  // Next user to authenticate: first queued user by position
  const nextInLine = !currentAuth ? queuedUsers[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">管理员后台</h1>
            <p className="text-gray-600">
              当前排队 {queuedUsers.length} 人 · 已成功 {successUsers.length} 人
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              刷新
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              公开页面
            </a>
            <button
              onClick={handleExportBackup}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              💾 下载JSON
            </button>
            <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              📂 导入JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
            <button
              onClick={handleGistBackup}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              ☁️ 备份到Gist
            </button>
            <button
              onClick={handleGistRestore}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              🔄 从Gist恢复
            </button>
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setPassword("");
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              退出
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`p-3 rounded-lg text-sm mb-4 ${
              message.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-green-50 text-green-700 border border-green-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Current authentication */}
        {currentAuth && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-blue-800">当前正在认证：</span>
                <span className="ml-2 font-bold text-blue-900">{currentAuth.wechatNickname}</span>
                <span className="ml-2 text-sm text-blue-700">（微信号：{currentAuth.wechatId}）</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(currentAuth.id, "success")}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  ✓ 认证成功
                </button>
                <button
                  onClick={() => handleAction(currentAuth.id, "fail")}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  ✗ 认证失败
                </button>
                <button
                  onClick={() => handleAction(currentAuth.id, "skip")}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  ⏭ 跳过
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {!currentAuth && nextInLine && (
            <button
              onClick={() => handleAction(nextInLine.id, "startAuth")}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              ▶ 开始认证第一位（{nextInLine.wechatNickname}）
            </button>
          )}
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showAddUser ? "取消" : "+ 手动添加用户"}
          </button>
          <button
            onClick={() => setShowTokenSection(!showTokenSection)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showTokenSection ? "收起" : "🔗 报名链接管理"}
          </button>
          <button
            onClick={() => setShowSuccessUsers(!showSuccessUsers)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showSuccessUsers ? "收起" : `✓ 已成功用户 (${successUsers.length})`}
          </button>
          <button
            onClick={() => setShowTimeoutUsers(!showTimeoutUsers)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showTimeoutUsers ? "收起" : `⏱ 超时/拉黑 (${timeoutUsers.length})`}
          </button>
          <button
            onClick={() => {
              setShowAnnouncement(!showAnnouncement);
              if (!showAnnouncement) fetchAnnouncement();
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showAnnouncement ? "收起" : `📢 公告管理 ${announcementEnabled ? "✓" : ""}`}
          </button>
        </div>

        {/* Add user form */}
        {showAddUser && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">手动添加用户</h3>
            <form onSubmit={handleAddUser} className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs text-gray-700 mb-1">微信号</label>
                <input
                  type="text"
                  value={newUser.wechatId}
                  onChange={(e) => setNewUser({ ...newUser, wechatId: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">微信昵称</label>
                <input
                  type="text"
                  value={newUser.wechatNickname}
                  onChange={(e) => setNewUser({ ...newUser, wechatNickname: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                添加
              </button>
            </form>
          </div>
        )}

        {/* Token management */}
        {showTokenSection && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">报名链接管理</h3>
              <button
                onClick={handleGenerateToken}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                生成新链接
              </button>
            </div>
            {tokens.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无有效报名链接</p>
            ) : (
              <div className="space-y-2">
                {tokens.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-500">报名链接：</span>
                      <span className="text-sm font-mono text-gray-700 break-all">
                        {typeof window !== "undefined" ? `${window.location.origin}/register?token=${t.value}` : `/register?token=${t.value}`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeactivateToken(t.id)}
                      className="ml-3 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    >
                      失效
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Success users */}
        {showSuccessUsers && successUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">已成功用户</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-700">
                    <th className="py-2 pr-4">序号</th>
                    <th className="py-2 pr-4">微信号</th>
                    <th className="py-2 pr-4">昵称</th>
                    <th className="py-2 pr-4">邮箱</th>
                  </tr>
                </thead>
                <tbody>
                  {successUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 text-gray-700 font-medium">{u.position}</td>
                      <td className="py-2 pr-4 text-gray-900 font-medium">{u.wechatId}</td>
                      <td className="py-2 pr-4 text-gray-900 font-medium">{u.wechatNickname}</td>
                      <td className="py-2 pr-4 text-gray-800">{u.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Timeout users (blacklisted) */}
        {showTimeoutUsers && timeoutUsers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">⏱ 超时/拉黑用户</h3>
            <p className="text-sm text-gray-600 mb-3">这些用户已被管理员手动跳过，不会自动参与排队。点击「恢复」可将其放回队列最底部。</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-700">
                    <th className="py-2 pr-4">原位置</th>
                    <th className="py-2 pr-4">微信号</th>
                    <th className="py-2 pr-4">昵称</th>
                    <th className="py-2 pr-4">邮箱</th>
                    <th className="py-2 pr-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {timeoutUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 text-gray-700 font-medium">{u.position}</td>
                      <td className="py-2 pr-4 text-gray-900 font-medium">{u.wechatId}</td>
                      <td className="py-2 pr-4 text-gray-900 font-medium">{u.wechatNickname}</td>
                      <td className="py-2 pr-4 text-gray-800">{u.email}</td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => handleAction(u.id, "restore")}
                          className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          恢复
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Announcement editor */}
        {showAnnouncement && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">📢 公告管理</h3>
            <p className="text-sm text-gray-600 mb-3">
              公告内容会在用户打开排队页面时自动弹出。留空则不显示公告。
            </p>
            <textarea
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-500 resize-y"
              rows={6}
              placeholder="输入公告内容..."
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {announcementEnabled ? "✅ 公告已启用" : "⚪ 公告未启用（内容为空）"}
              </span>
              <button
                onClick={handleSaveAnnouncement}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "保存中..." : "保存公告"}
              </button>
            </div>
          </div>
        )}

        {/* Queue table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-800">位置</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800">微信号</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800">昵称</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800">邮箱</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800">状态</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800">失败次数</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-800">操作</th>
                </tr>
              </thead>
              <tbody>
                {queuedUsers.map((user) => {
                  const statusInfo = STATUS_MAP[user.status] || STATUS_MAP.WAITING;
                  return (
                    <tr
                      key={user.id}
                      className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                        user.status === "AUTHENTICATING" ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-gray-700 font-medium">{user.position}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{user.wechatId}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{user.wechatNickname}</td>
                      <td className="px-4 py-3 text-gray-800">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900 font-medium">{user.failCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {user.status !== "AUTHENTICATING" && user.status !== "SUCCESS" && !currentAuth && user.position === queuedUsers[0]?.position && (
                            <button
                              onClick={() => handleAction(user.id, "startAuth")}
                              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              开始认证
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const newPos = prompt("输入新位置：", String(user.position));
                              if (newPos && !isNaN(Number(newPos))) {
                                fetch("/api/admin", {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                    "x-admin-password": password,
                                  },
                                  body: JSON.stringify({
                                    action: "reorder",
                                    userId: user.id,
                                    newPosition: Number(newPos),
                                  }),
                                }).then(() => refreshData());
                              }
                            }}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            调序
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`确定删除 ${user.wechatNickname} 吗？`)) {
                                handleAction(user.id, "delete");
                              }
                            }}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>数据每30秒自动刷新 · 管理员可随时调整队列顺序</p>
        </div>
      </div>
    </div>
  );
}
