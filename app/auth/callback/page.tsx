'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('正在完成 Google 登入驗證...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. 檢查網址 Hash 是否包含 access_token (Implicit Flow)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            setStatus('正在建立登入工作階段...');
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Set session error:', error.message);
            }
          }
        }

        // 2. 檢查網址 Query 是否包含 code (PKCE Flow)
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          setStatus('正在交換授權憑證...');
          await supabase.auth.exchangeCodeForSession(code);
        }

        // 3. 確認是否成功取得 Session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          // 給予 1 秒緩衝再讀取一次
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
        console.error('Callback error:', err);
        router.replace('/login');
      }
    };

    handleCallback();
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