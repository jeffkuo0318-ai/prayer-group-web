'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. 監聽 Supabase 認證狀態變化（當瀏覽器解析完 URL 上的 Token 後會自動觸發）
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace('/');
      }
    });

    // 2. 檢查當前是否已成功取得 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50/30">
      <div className="text-center">
        <p className="text-lg font-medium text-amber-900">正在完成 Google 登入驗證...</p>
        <p className="text-sm text-gray-500 mt-2">請稍候，即將為您導向首頁</p>
      </div>
    </div>
  );
}