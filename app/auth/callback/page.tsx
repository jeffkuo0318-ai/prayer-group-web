'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('正在完成 Google 登入驗證...');

  useEffect(() => {
    const handleAuth = async () => {
      // 1. 檢查是否已有 Session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('登入成功，正在進入代禱頁面...');
        router.replace('/prayers');
        return;
      }

      // 2. 監聽 Session 寫入
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session || event === 'SIGNED_IN') {
          setStatus('驗證成功，即將跳轉...');
          setTimeout(() => {
            router.replace('/prayers');
          }, 400); // 緩衝 400ms 確保 localStorage 完整儲存
        }
      });

      // 3. 安全防死鎖退路
      const timer = setTimeout(() => {
        router.replace('/prayers');
      }, 3000);

      return () => {
        authListener.subscription.unsubscribe();
        clearTimeout(timer);
      };
    };

    handleAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-amber-50/30">
      <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-amber-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p className="text-amber-900 font-medium">{status}</p>
        <p className="text-xs text-gray-400 mt-2">請稍候，系統處理中...</p>
      </div>
    </div>
  );
}