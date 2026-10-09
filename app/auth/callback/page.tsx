'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  useEffect(() => {
    // 1. 監聽認證狀態變更（Supabase 解析完網址 #access_token 後會觸發 SIGNED_IN）
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || session) {
        window.location.href = '/'; // 強制硬跳轉，清除網址 hash 並重新載入首頁狀態
      }
    });

    // 2. 雙重確認當前 Session 狀態
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/';
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50/30">
      <div className="text-center">
        <p className="text-lg font-medium text-amber-900">正在完成 Google 登入驗證...</p>
        <p className="text-sm text-gray-500 mt-2">請稍候，即將為您導向首頁</p>
      </div>
    </div>
  );
}