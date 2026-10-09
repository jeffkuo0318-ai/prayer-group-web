'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Clock, UserCheck, LogOut, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [userState, setUserState] = useState<'guest' | 'fill_profile' | 'waiting_approval'>('guest');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 表單欄位
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [groupName, setGroupName] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 1. 檢查目前登入者的狀態
  const checkUserStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserState('guest');
      return;
    }

    setCurrentUser(user);

    // 讀取 profiles 表格紀錄
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) {
      setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
      setUserState('fill_profile');
      return;
    }

    // 狀態判斷
    if (profile.status === 'approved' && profile.group_name && profile.group_name !== '未指定小組' && profile.group_name !== '未分配小組') {
      // 已核准且已指定小組：自動跳轉代禱頁
      router.push('/prayers');
    } else if (profile.status === 'pending') {
      // 待審核：顯示等待開通畫面
      setUserState('waiting_approval');
    } else {
      // 被解除權限 (suspended) 或 未指定小組：帶入預設資料並請其補充/重新申請
      setFullName(profile.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '');
      setGroupName(profile.group_name && profile.group_name !== '未指定小組' && profile.group_name !== '未分配小組' ? profile.group_name : '');
      setUserState('fill_profile');
    }
  };

  useEffect(() => {
    checkUserStatus();
  }, []);

  // 2. Google 第三方快速登入
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
       redirectTo: `${window.location.origin}/auth/callback`, // 👈 改為轉址回首頁 /
      },
    });
    if (error) {
      setMessage(`Google 登入失敗：${error.message}`);
    }
  };

  // 3. 送出小家資料（重新申請審核）
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: currentUser.id,
        email: currentUser.email,
        full_name: fullName,
        group_name: groupName,
        status: 'pending', // 強制將狀態改回待審核
        role: 'member',
      });

    if (!error) {
      alert('🎉 審核申請已送出！請等待小組長或管理員核准。');
      setUserState('waiting_approval');
    } else {
      alert(`送出失敗：${error.message}`);
      setMessage(`送出失敗：${error.message}`);
    }
    setLoading(false);
  };

  // 4. Email 註冊與登入
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            group_name: groupName,
          },
        },
      });

      if (error) {
        setMessage(`註冊失敗：${error.message}`);
      } else if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          group_name: groupName,
          status: 'pending',
          role: 'member',
        });
        setUserState('waiting_approval');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(`登入失敗：${error.message}`);
      } else {
        checkUserStatus();
      }
    }
    setLoading(false);
  };

  // 登出帳號
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserState('guest');
  };

  return (
    <div className="min-h-screen bg-amber-50/40 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md space-y-6 border border-amber-100">
        
        {/* 畫面 A：被解除會員 / Google 初次登入 ➔ 補充小家資料 */}
        {userState === 'fill_profile' && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-gray-800">補充小組申請資料</h1>
              <p className="text-xs text-gray-500">
                請確認您的姓名與所屬小家，送出後將由小組長/管理員審核開通。
              </p>
            </div>

            {message && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs">
                {message}
              </div>
            )}

            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">真實姓名</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="請輸入您的姓名"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">所屬小家 / 小組</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="例如：國華雅萍小家"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition shadow-md disabled:bg-gray-300"
              >
                {loading ? '送出中...' : '送出審核申請'}
              </button>
            </form>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" /> 登出並切換帳號
            </button>
          </div>
        )}

        {/* 畫面 B：等待核准中 (Pending) */}
        {userState === 'waiting_approval' && (
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-800">⏳ 申請審核中</h1>
              <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                您的資料已送出！目前正在等待小組長或管理員開通權限。
                審核通過後即可進入禱告牆。
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={checkUserStatus}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-md"
              >
                檢查審核狀態 <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full text-xs text-gray-400 hover:text-gray-600 font-semibold py-1"
              >
                登出帳號
              </button>
            </div>
          </div>
        )}

        {/* 畫面 C：未登入訪客 (Guest) */}
        {userState === 'guest' && (
          <>
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-gray-800">
                {isSignUp ? '註冊教會代禱網' : '會員登入'}
              </h1>
              <p className="text-xs text-gray-500">
                {isSignUp ? '填寫基本資料，審核通過後即可使用' : '歡迎回到同心代禱小組'}
              </p>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs ${message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {message}
              </div>
            )}

            {/* Google 第三方快速登入 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              使用 Google 帳號繼續
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-3 text-gray-400 text-xs">或使用 Email {isSignUp ? '註冊' : '登入'}</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Email 表單 */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">電子信箱</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="example@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">密碼</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="至少 6 位數密碼"
                />
              </div>

              {isSignUp && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">真實姓名</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="請輸入姓名"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">所屬小組</label>
                    <input
                      type="text"
                      required
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="例如：國華雅萍小家"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 transition shadow-md disabled:bg-gray-300"
              >
                {loading ? '處理中...' : isSignUp ? '送出審核申請' : '立即登入'}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-amber-700 font-semibold hover:underline"
              >
                {isSignUp ? '已有帳號？點此登入' : '還沒有帳號？點此註冊加入小組'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}