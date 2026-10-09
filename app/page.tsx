'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ProverbsBanner from '@/components/ProverbsBanner';
import { HeartHandshake, LogIn, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function WelcomePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser(data.user);
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/60 via-white to-gray-50 flex flex-col justify-between p-6">
      <div className="max-w-xl mx-auto w-full space-y-8 pt-8">
        {/* 頂部 Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-8 h-8 text-amber-600" />
            <h1 className="text-xl font-bold text-gray-800">教會同心代禱網</h1>
          </div>
          
          <Link 
            href="/admin/audit" 
            className="text-xs text-amber-800 bg-amber-100/80 hover:bg-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1 font-semibold transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> 管理員審核
          </Link>
        </div>

        {/* 歡迎文案 */}
        <div className="text-center space-y-2 py-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            「凡兩三人同心合意」
          </h2>
          <p className="text-sm text-gray-600">
            分享代禱需求，彼此守望，經歷上帝豐富的恩典與應允。
          </p>
        </div>

        {/* 規格 1：隨機推薦聖經箴言 */}
        <ProverbsBanner />

        {/* 規格 2：登入 / 註冊與進入代禱中心按鈕 */}
        <div className="space-y-3 pt-4">
          <Link
            href="/prayers"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 text-base"
          >
            進入禱告頁面 <ArrowRight className="w-5 h-5" />
          </Link>

          {currentUser ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-center text-xs">
              <span className="flex items-center gap-1.5 text-amber-900 font-semibold">
                <UserCheck className="w-4 h-4 text-green-600" /> 已登入：{currentUser.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-amber-800 hover:text-amber-950 font-bold underline"
              >
                登出
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3.5 px-6 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 text-sm"
            >
              <LogIn className="w-4 h-4 text-amber-600" /> 會員註冊 / 登入
            </Link>
          )}
        </div>
      </div>

      <footer className="text-center text-xs text-gray-400 py-6">
  教會小組禱告網頁 © 2026 同心守望
</footer>
    </main>
  );
}