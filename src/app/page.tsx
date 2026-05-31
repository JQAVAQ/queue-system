"use client";

import { useEffect, useState } from "react";

interface QueueUser {
  id: string;
  wechatNickname: string;
  position: number;
  status: string;
  failCount: number;
  estimatedDate: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  WAITING: { label: "未认证", color: "bg-yellow-100 text-yellow-800" },
  AUTHENTICATING: { label: "正在认证", color: "bg-blue-100 text-blue-800" },
  FAILED: { label: "认证失败", color: "bg-red-100 text-red-800" },
};

export default function QueuePage() {
  const [users, setUsers] = useState<QueueUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState<{ content: string; enabled: boolean }>({ content: "", enabled: false });
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  useEffect(() => {
    fetchQueue();
    fetchAnnouncement();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAnnouncement() {
    try {
      const res = await fetch("/api/announcement");
      const data = await res.json();
      setAnnouncement(data);
      if (data.enabled && data.content) {
        setShowAnnouncement(true);
      }
    } catch {
      // silent
    }
  }

  async function fetchQueue() {
    try {
      const res = await fetch("/api/queue");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setUsers(data.users);
      }
    } catch {
      setError("获取队列失败，请刷新页面");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Announcement Modal */}
      {showAnnouncement && announcement.enabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAnnouncement(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="text-white text-lg font-bold flex items-center gap-2">
                📢 公告
              </h2>
            </div>
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {announcement.content}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowAnnouncement(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">邀请码排队系统</h1>
          <p className="text-gray-600">当前排队人数：{users.length} 人</p>
          {announcement.enabled && (
            <button
              onClick={() => setShowAnnouncement(true)}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
            >
              📢 查看公告
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700">
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            暂时没有人排队
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid grid-cols-[60px_1fr_1fr_120px] gap-4 px-4 py-3 bg-gray-50 border-b font-medium text-sm text-gray-700">
              <div>序号</div>
              <div>昵称</div>
              <div>预计认证日期</div>
              <div>状态</div>
            </div>
            {users.map((user, index) => {
              const statusInfo = STATUS_MAP[user.status] || STATUS_MAP.WAITING;
              return (
                <div
                  key={user.id}
                  className={`grid grid-cols-[60px_1fr_1fr_120px] gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                    user.status === "AUTHENTICATING" ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="font-mono text-gray-700 flex items-center">
                    {user.status === "AUTHENTICATING" ? (
                      <span className="text-blue-600 font-bold">▶ {index + 1}</span>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-900 font-medium">{user.wechatNickname}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-700 text-sm">{user.estimatedDate}</span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>状态每30秒自动刷新 · 预计日期仅供参考</p>
          <p className="mt-1">如需报名请联系管理员获取报名链接</p>
        </div>
      </div>
    </div>
  );
}
