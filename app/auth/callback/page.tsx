'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('正在完成 Google 登入驗證...');

  useEffect(() => {
    // 1. 監聽 Auth 狀態變化（這是 Supabase 寫入 OAuth Token 的標準作法）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session || event === 'SIGNED_IN') {
        setStatus('驗證成功，即將進入代禱頁面...');
        setTimeout(() => {
          router.replace('/prayers');
        }, 500);
      }
    });

    // 2. 主動檢查 Session（若已自動寫入）
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('登入成功，正在跳轉...');
        router.replace('/prayers');
      }
    };

    checkSession();

    // 3. 安全退路：5 秒內若完全無反應才退回登入頁
    const timer = setTimeout(() => {
      setStatus('驗證超時，返回登入頁...');
      router.replace('/login');
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
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