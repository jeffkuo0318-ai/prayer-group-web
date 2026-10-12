'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PrayerCard from '@/components/PrayerCard';
import CreatePrayerModal from '@/components/CreatePrayerModal';
import CompleteProfileModal from '@/components/CompleteProfileModal';
import EditPrivateAccessModal from '@/components/EditPrivateAccessModal';
import {
  Plus,
  Globe,
  Lock,
  Flame,
  CheckCircle,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  Trash2,
  ChevronRight,
  Info,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function PrayersPage() {
  const [prayers, setPrayers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdminOrLeader, setIsAdminOrLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'urgent' | 'thanksgiving'>('all');

  // 聚焦檢視單一事項 ID
  const [focusedPrayerId, setFocusedPrayerId] = useState<string | null>(null);

  // Modals 狀態
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingPrayerForAccess, setEditingPrayerForAccess] = useState<any>(null);

  const fetchPrayersAndUser = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => {
    fetchPrayersAndUser();
  }, []);

  // 快捷操作：切換狀態 (轉感恩/設緊急/恢復禱告中)
  const handleUpdateStatus = async (prayerId: string, newStatus: string) => {
    const { error } = await supabase
      .from('prayers')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', prayerId);

    if (!error) {
      fetchPrayersAndUser();
    } else {
      alert(`狀態更新失敗：${error.message}`);
    }
  };

  // 快捷操作：切換公私密權限
  const handleTogglePrivate = async (prayer: any) => {
    if (prayer.is_private || prayer.type === 'private') {
      const { error } = await supabase
        .from('prayers')
        .update({ is_private: false, type: 'public' })
        .eq('id', prayer.id);
      if (!error) fetchPrayersAndUser();
    } else {
      setEditingPrayerForAccess(prayer);
    }
  };

  // 快捷操作：刪除代禱事項
  const handleDeletePrayer = async (prayerId: string) => {
    if (!confirm('確定要刪除這筆代禱事項嗎？刪除後無法復原。')) return;
    const { error } = await supabase.from('prayers').delete().eq('id', prayerId);
    if (!error) {
      if (focusedPrayerId === prayerId) setFocusedPrayerId(null);
      fetchPrayersAndUser();
    } else {
      alert(`刪除失敗：${error.message}`);
    }
  };

  // 數據統計計算
  const stats = {
    active: prayers.filter((p) => p.status === 'active' || !p.status).length,
    answered: prayers.filter((p) => p.status === 'answered').length,
    thanksgiving: prayers.filter((p) => p.status === 'thanksgiving').length,
    urgent: prayers.filter((p) => p.status === 'urgent').length,
  };

  // 私密事項清單（供右側面板管理者/創作者檢視）
  const privatePrayers = prayers.filter(
    (p) =>
      (p.is_private || p.type === 'private') &&
      (p.user_id === currentUser?.id || p.creator_id === currentUser?.id || isAdminOrLeader)
  );

  // 依標籤篩選
  const filteredPrayers = prayers.filter((p) => {
    if (focusedPrayerId) return p.id === focusedPrayerId;
    if (filter === 'public') return !p.is_private && p.type !== 'private';
    if (filter === 'private') return p.is_private || p.type === 'private';
    if (filter === 'urgent') return p.status === 'urgent';
    if (filter === 'thanksgiving') return p.status === 'thanksgiving' || p.status === 'answered';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20 font-sans">
      {/* 1. 頂部導覽 Bar (保留唯一且明確的「+ 我要代禱」按鈕) */}
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
              <span>🙏</span> 代禱與守望感恩中心
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
        {/* 2. 📊 全網守望狀態概況 (統計數據與快捷過濾卡片) */}
        <div className="bg-slate-900 text-white p-4 md:p-5 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> 全網守望狀態概況
            </span>
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
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <Flame className="w-4 h-4 text-amber-400" /> 🔥 禱告中
              </span>
              <span className="text-lg md:text-xl font-black text-amber-400">{stats.active}</span>
            </div>

            <div
              onClick={() => {
                setFocusedPrayerId(null);
                setFilter('thanksgiving');
              }}
              className={`bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/80 cursor-pointer transition flex items-center justify-between ${
                filter === 'thanksgiving' ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> 🌱 蒙應允
              </span>
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
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-purple-400" /> 🙌 獻上感恩
              </span>
              <span className="text-lg md:text-xl font-black text-purple-400">{stats.thanksgiving}</span>
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
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <Flame className="w-4 h-4 text-red-400" /> ⚡ 迫切緊急
              </span>
              <span className="text-lg md:text-xl font-black text-red-400">{stats.urgent}</span>
            </div>
          </div>
        </div>

        {/* 3. 主區塊：左側禱告牆 (2/3) + 右側私密代禱清單管理面板 (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* 左側：禱告牆與單一焦點檢視模式 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 統一的分類標籤過濾 Bar */}
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
                    setFilter('public');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                    filter === 'public'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" /> 一般公禱
                </button>
                <button
                  onClick={() => {
                    setFocusedPrayerId(null);
                    setFilter('private');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                    filter === 'private'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" /> 私密代禱
                </button>
                <button
                  onClick={() => {
                    setFocusedPrayerId(null);
                    setFilter('urgent');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                    filter === 'urgent'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" /> 迫切緊急
                </button>
                <button
                  onClick={() => {
                    setFocusedPrayerId(null);
                    setFilter('thanksgiving');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                    filter === 'thanksgiving'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> 感恩見證牆
                </button>
              </div>
            </div>

            {/* 若在單一檢視模式下，顯示橙色返回提示 Bar */}
            {focusedPrayerId && (
              <div className="bg-amber-500 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs md:text-sm font-bold shadow-xs animate-fade-in">
                <span>✨ 目前檢視單一事項中（可於下方留言與同心阿們）</span>
                <button
                  onClick={() => setFocusedPrayerId(null)}
                  className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 返回完整列表
                </button>
              </div>
            )}

            {/* 卡片列表 */}
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
                  />
                ))}
              </div>
            )}
          </div>

          {/* 右側：私密代禱管理面板 */}
          <div className="space-y-4">
            <div className="bg-white border border-amber-200/80 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-600" /> 私密代禱清單
                </h2>
                <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full">
                  共 {privatePrayers.length} 項
                </span>
              </div>

              {/* 操作說明提示 */}
              <div className="bg-amber-50/80 border border-amber-200/60 p-3 rounded-2xl text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-amber-800">
                  <Info className="w-3.5 h-3.5" /> 操作說明：
                </p>
                <ol className="list-decimal pl-4 space-y-0.5 text-amber-900/90 leading-relaxed">
                  <li>
                    <strong>轉獻上感恩</strong>：移至感恩見證牆。
                  </li>
                  <li>
                    <strong>設為緊急</strong>：切換迫切緊急狀態。
                  </li>
                  <li>
                    <strong>權限/轉公禱</strong>：選取或排除參與肢體。
                  </li>
                </ol>
              </div>

              {/* 私密清單單卡列表 */}
              {privatePrayers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">無管轄中的私密代禱事項</p>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {privatePrayers.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-2xl border transition space-y-2 text-xs ${
                        focusedPrayerId === p.id
                          ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                          : 'border-gray-200 bg-gray-50/60 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          onClick={() => setFocusedPrayerId(p.id)}
                          className="font-bold text-gray-800 truncate cursor-pointer hover:text-amber-600 flex items-center gap-1.5"
                        >
                          <Lock className="w-3 h-3 text-purple-600 shrink-0" />
                          <span className="truncate">{p.title}</span>
                        </span>
                        <button
                          onClick={() => setFocusedPrayerId(p.id)}
                          className="text-gray-400 hover:text-amber-600 p-0.5 cursor-pointer"
                          title="聚焦檢視此卡片"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 快捷管理控制按鈕列 */}
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-200/60 text-[10px]">
                        <button
                          onClick={() => handleUpdateStatus(p.id, 'thanksgiving')}
                          className="bg-white hover:bg-purple-50 text-purple-800 border border-gray-200 px-2 py-1 rounded-lg font-bold transition flex items-center gap-0.5 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-purple-600" /> 轉獻上感恩
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(p.id, p.status === 'urgent' ? 'active' : 'urgent')}
                          className="bg-white hover:bg-red-50 text-red-700 border border-gray-200 px-2 py-1 rounded-lg font-bold transition flex items-center gap-0.5 cursor-pointer"
                        >
                          <Flame className="w-3 h-3 text-red-500" /> 設為緊急
                        </button>
                        <button
                          onClick={() => handleTogglePrivate(p)}
                          className="bg-white hover:bg-purple-50 text-purple-900 border border-gray-200 px-2 py-1 rounded-lg font-bold transition flex items-center gap-0.5 cursor-pointer"
                        >
                          <Lock className="w-3 h-3 text-purple-600" /> 權限/轉公禱
                        </button>
                        <button
                          onClick={() => handleDeletePrayer(p.id)}
                          className="bg-white hover:bg-red-50 text-red-600 border border-gray-200 px-1.5 py-1 rounded-lg font-bold transition cursor-pointer"
                          title="刪除代禱"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals 彈窗群 */}
      <CreatePrayerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUserId={currentUser?.id || ''}
        onSuccess={fetchPrayersAndUser}
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
          onSuccess={fetchPrayersAndUser}
        />
      )}
    </div>
  );
}