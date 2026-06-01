"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({
    wechatId: "",
    wechatNickname: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setMessage({ type: "error", text: "无效的报名链接，请联系管理员" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, token }),
      });
      const data = await res.json();

      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setSuccess(true);
        setMessage({ type: "success", text: `报名成功！您的排队序号为 ${data.user.position}` });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full mx-4 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">无效的报名链接</h1>
          <p className="text-gray-600">请向管理员获取正确的报名链接</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full mx-4 text-center">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">报名成功！</h1>
          <p className="text-gray-600 mb-4">{message.text}</p>
          <p className="text-sm text-gray-500">请关注群消息，轮到您时管理员会@您通知</p>
          <a
            href="/"
            className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看队列状态
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">邀请码报名</h1>
          <p className="text-gray-600">填写以下信息加入排队</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          {message.text && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              微信号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.wechatId}
              onChange={(e) => setForm({ ...form, wechatId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="请输入您的微信号（非昵称）"
              required
            />
            <p className="mt-1 text-xs text-gray-500">用于身份唯一性校验，请勿重复填写</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              微信昵称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.wechatNickname}
              onChange={(e) => setForm({ ...form, wechatNickname: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="请输入您的微信昵称"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱 <span className="text-gray-400">（选填）</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 placeholder-gray-500"
              placeholder="请输入您的邮箱（选填）"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "提交中..." : "提交报名"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-blue-600 hover:text-blue-700">
            ← 返回队列查看
          </a>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
