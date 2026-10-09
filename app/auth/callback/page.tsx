'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('正在完成 Google 登入驗證...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // 1. 檢查網址列是否包含 PKCE 的 code 參數
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          setStatus('正在交換授權憑證...');
          // 主動用 code 交換 Session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Exchange code error:', error.message);
            setStatus(`驗證失敗: ${error.message}`);
            setTimeout(() => router.replace('/login'), 2000);
            return;
          }
        }

        // 2. 驗證是否成功取得 Session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.warn('找不到有效 Session，重新嘗試...');
          // 給予 1 秒緩衝再查一次
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              setStatus('登入成功，正在進入代禱頁面...');
              router.replace('/prayers');
            } else {
              setStatus('登入逾時，請重新登入...');
              setTimeout(() => router.replace('/login'), 1500);
            }
          }, 1000);
          return;
        }

        setStatus('登入成功，正在進入代禱頁面...');
        router.replace('/prayers');
      } catch (err) {
        console.error('Callback 發生未預期錯誤：', err);
        router.replace('/login');
      }
    };

    handleOAuthCallback();
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