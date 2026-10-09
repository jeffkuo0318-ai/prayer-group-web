'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('正在完成 Google 登入驗證...');

  useEffect(() => {
    // 1. 監聽 Supabase 認證狀態變更
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session || event === 'SIGNED_IN') {
        window.location.href = '/';
      }
    });

    // 2. 檢查當前 Session 狀態
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/';
      }
    });

    // 3. 安全退路機制：2.5 秒後若 Token 已被讀取或已登入，直接強制導向首頁
    const timer = setTimeout(() => {
      setStatus('正在為您導向首頁...');
      window.location.href = '/';
    }, 2500);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50/30">
      <div className="text-center">
        <p className="text-lg font-medium text-amber-900">{status}</p>
        <p className="text-sm text-gray-500 mt-2">請稍候，系統處理中...</p>
      </div>
    </div>
  );
}