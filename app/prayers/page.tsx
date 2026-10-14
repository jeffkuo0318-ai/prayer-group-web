'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PrayerCard from '@/components/PrayerCard';
import CreatePrayerModal from '@/components/CreatePrayerModal';
import CompleteProfileModal from '@/components/CompleteProfileModal';
import EditPrivateAccessModal from '@/components/EditPrivateAccessModal';
import {
  Plus,
  RotateCcw,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function PrayersPage() {
  const [prayers, setPrayers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdminOrLeader, setIsAdminOrLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'public' | 'private' | 'answered' | 'thanksgiving'>('all');

  // 聚焦檢視單一事項 ID
  const [focusedPrayerId, setFocusedPrayerId] = useState<string | null>(null);

  // Modals 狀態
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingPrayerForAccess, setEditingPrayerForAccess] = useState<any>(null);

  // 支援靜默背景更新，避免每次互動都觸發 setLoading(true) 導致彈窗被關閉
  const fetchPrayersAndUser = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    // 1. 取得當前使用者與角色權限
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (user) {
      const role = user.user_metadata?.role;
      const userEmail = user.email || '';

      if (
        role === 'admin' ||
        role === 'leader' ||
        userEmail === 'jeffkuo0318@gmail.com'
      ) {
        setIsAdminOrLeader(true);
      }

      // 檢查 User profile 是否已填寫真實姓名與小組
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, group_name, role')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.role === 'admin' || profile.role === 'leader') {
          setIsAdminOrLeader(true);
        }
        if (!profile.full_name || !profile.group_name) {
          setIsProfileOpen(true);
        }
      } else {
        setIsProfileOpen(true);
      }
    }

    // 2. 抓取代禱事項
    const { data, error } = await supabase
      .from('prayers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPrayers(data);
    } else if (error) {
      console.error('Fetch error:', error.message);
    }

    if (showLoading) setLoading(false);
  };

  useEffect(() => {
    fetchPrayersAndUser(true);

    // 監聽來自 PrayerDetailModal 的事件：當點擊設為私密時，自動開啟 EditPrivateAccessModal 讓使用者選擇成員
    const handleOpenAccessModal = (e: any) => {
      if (e.detail) {
        setEditingPrayerForAccess(e.detail);
      }
    };

    window.addEventListener('open-private-access-modal', handleOpenAccessModal as EventListener);
    return () => {
      window.removeEventListener('open-private-access-modal', handleOpenAccessModal as EventListener);
    };
  }, []);

  // 📊 數據統計計算
  const stats = {
    active: prayers.filter((p) => p.status !== 'answered' && p.status !== 'thanksgiving').length,
    urgent: prayers.filter((p) => p.status === 'urgent').length,
    answered: prayers.filter((p) => p.status === 'answered').length,
    thanksgiving: prayers.filter((p) => p.status === 'thanksgiving').length,
  };

  // 🎯 依標籤分頁嚴格過濾與隱私安全控管
  const filteredPrayers = prayers.filter((p) => {
    if (focusedPrayerId) return p.id === focusedPrayerId;

    if (filter === 'all') {
      return p.status !== 'answered' && p.status !== 'thanksgiving';
    }
    if (filter === 'urgent') {
      return p.status === 'urgent';
    }
    if (filter === 'public') {
      return (!p.is_private && p.type !== 'private') && p.status !== 'urgent' && p.status !== 'answered' && p.status !== 'thanksgiving';
    }
    if (filter === 'private') {
      return (p.is_private || p.type === 'private') && p.status !== 'answered' && p.status !== 'thanksgiving';
    }
    if (filter === 'answered') {
      if (p.status !== 'answered') return false;
      if (p.is_private || p.type === 'private') {
        const isOwner = p.user_id === currentUser?.id || p.creator_id === currentUser?.id;
        const isAllowedMember = Array.isArray(p.allowed_users) && p.allowed_users.includes(currentUser?.id);
        return isOwner || isAllowedMember || isAdminOrLeader;
      }
      return true;
    }
    if (filter === 'thanksgiving') {
      return p.status === 'thanksgiving';
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20 font-sans">
      {/* 1. 頂部導覽 Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs md:text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> 返回首頁
            </Link>
            <h1 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-1.5">
              代禱與守望感恩中心
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {isAdminOrLeader && (
              <Link
                href="/admin/audit"
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-300 transition flex items-center gap-1"
              >
                <ShieldCheck className="w-4 h-4 text-amber-700" /> 管理後台
              </Link>
            )}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm font-bold px-4 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 我要代禱
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 2. 📊 全網守望狀態概況 */}
        <div className="bg-slate-900 text-white p-4 md:p-5 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>全網守望狀態概況</span>
            <span className="text-[11px] text-slate-400">點擊數字卡片可快速過濾顯示</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              onClick={() => {
                setFocusedPrayerId(null);
                setFilter('all');
              }}
              className={`bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/80 cursor-pointer transition flex items-center justify-between ${
                filter === 'all' && !focusedPrayerId ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              <span className="text-xs font-bold text-slate-200">禱告中</span>
              <span className="text-lg md:text-xl font-black text-amber-400">{stats.active}</span>
            </div>

            <div
              onClick={() => {
                setFocusedPrayerId(null);
                setFilter('urgent');
              }}
              className={`bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/80 cursor-pointer transition flex items-center justify-between ${
                filter === 'urgent' ? 'ring-2 ring-red-400' : ''
              }`}
            >
              <span className="text-xs font-bold text-slate-200">迫切緊急</span>
              <span className="text-lg md:text-xl font-black text-red-400">{stats.urgent}</span>
            </div>

            <div
              onClick={() => {
                setFocusedPrayerId(null);
                setFilter('answered');
              }}
              className={`bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/80 cursor-pointer transition flex items-center justify-between ${
                filter === 'answered' ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              <span className="text-xs font-bold text-slate-200">蒙應允</span>
              <span className="text-lg md:text-xl font-black text-emerald-400">{stats.answered}</span>
            </div>

            <div
              onClick={() => {
                setFocusedPrayerId(null);
                setFilter('thanksgiving');
              }}
              className={`bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/80 cursor-pointer transition flex items-center justify-between ${
                filter === 'thanksgiving' ? 'ring-2 ring-purple-400' : ''
              }`}
            >
              <span className="text-xs font-bold text-slate-200">獻上感恩</span>
              <span className="text-lg md:text-xl font-black text-purple-400">{stats.thanksgiving}</span>
            </div>
          </div>
        </div>

        {/* 3. 主區塊：滿版置中禱告牆與分頁過濾 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs md:text-sm">
              <button
                onClick={() => {
                  setFocusedPrayerId(null);
                  setFilter('all');
                }}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  filter === 'all' && !focusedPrayerId
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                全部代禱
              </button>

              <button
                onClick={() => {
                  setFocusedPrayerId(null);
                  setFilter('urgent');
                }}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  filter === 'urgent'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                迫切緊急
              </button>

              <button
                onClick={() => {
                  setFocusedPrayerId(null);
                  setFilter('public');
                }}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  filter === 'public'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                一般公禱
              </button>

              <button
                onClick={() => {
                  setFocusedPrayerId(null);
                  setFilter('private');
                }}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  filter === 'private'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                私密代禱
              </button>

              <button
                onClick={() => {
                  setFocusedPrayerId(null);
                  setFilter('answered');
                }}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  filter === 'answered'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                蒙應允
              </button>

              <button
                onClick={() => {
                  setFocusedPrayerId(null);
                  setFilter('thanksgiving');
                }}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  filter === 'thanksgiving'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                感恩見證牆
              </button>
            </div>
          </div>

          {focusedPrayerId && (
            <div className="bg-amber-500 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs md:text-sm font-bold shadow-xs animate-fade-in">
              <span>目前檢視單一事項中（可於下方留言與同心阿們）</span>
              <button
                onClick={() => setFocusedPrayerId(null)}
                className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 返回完整列表
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">載入代禱事項中...</div>
          ) : filteredPrayers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300 p-6 space-y-2">
              <p className="text-gray-500 text-sm md:text-base font-medium">目前尚無此分類事項</p>
              <p className="text-xs text-gray-400">點擊右上角「+ 我要代禱」成為第一個分享的人吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPrayers.map((prayer) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  currentUserId={currentUser?.id || ''}
                  onRefresh={() => fetchPrayersAndUser(false)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals 彈窗群 */}
      <CreatePrayerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUserId={currentUser?.id || ''}
        onSuccess={() => fetchPrayersAndUser(false)}
      />

      {currentUser && (
        <CompleteProfileModal
          isOpen={isProfileOpen}
          userId={currentUser.id}
          defaultName={currentUser.user_metadata?.full_name || ''}
          onComplete={() => setIsProfileOpen(false)}
        />
      )}

      {editingPrayerForAccess && (
        <EditPrivateAccessModal
          isOpen={!!editingPrayerForAccess}
          onClose={() => setEditingPrayerForAccess(null)}
          prayer={editingPrayerForAccess}
          currentUserId={currentUser?.id || ''}
          onSuccess={() => fetchPrayersAndUser(false)}
        />
      )}
    </div>
  );
}