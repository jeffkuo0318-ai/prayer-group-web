'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PrayerCard from '@/components/PrayerCard';
import CreatePrayerModal from '@/components/CreatePrayerModal';
import CompleteProfileModal from '@/components/CompleteProfileModal';
import { Plus, Heart, Sparkles, Filter, Globe, Lock } from 'lucide-react';

export default function PrayersPage() {
  const [prayers, setPrayers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'thanksgiving'>('all');

  // Modal 狀態
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const fetchPrayersAndUser = async () => {
    setLoading(true);
    // 1. 取得當前使用者
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (user) {
      // 檢查 User profile 狀態
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, group_name')
        .eq('id', user.id)
        .single();

      if (!profile?.full_name || !profile?.group_name) {
        setIsProfileOpen(true);
      }
    }

    // 2. 抓取代禱事項 (由 Supabase RLS 自動過濾權限)
    const { data, error } = await supabase
      .from('prayers')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPrayers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrayersAndUser();
  }, []);

  // 篩選過濾
  const filteredPrayers = prayers.filter((p) => {
    if (filter === 'public') return p.type === 'public' && !p.is_private;
    if (filter === 'private') return p.is_private || p.type === 'private';
    if (filter === 'thanksgiving') return p.status === 'thanksgiving' || p.status === 'answered';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* 頂部導覽列 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 backdrop-blur-md bg-white/90">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>🙏</span> 肢體守望代禱牆
          </h1>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm font-bold px-3.5 py-2 rounded-xl shadow-sm transition flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> 我要代禱
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* 🌟 三大直覺入口 (降噪核心重點) */}
        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white p-3.5 md:p-5 rounded-2xl md:rounded-3xl shadow-sm text-center transition space-y-1 cursor-pointer"
          >
            <div className="text-lg md:text-2xl font-bold">🙏</div>
            <div className="text-xs md:text-base font-bold">我要代禱</div>
            <div className="text-[10px] md:text-xs text-amber-100 hidden sm:block">發起需要守望事項</div>
          </button>

          <button
            onClick={() => setFilter('all')}
            className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 p-3.5 md:p-5 rounded-2xl md:rounded-3xl shadow-sm text-center transition space-y-1 cursor-pointer"
          >
            <div className="text-lg md:text-2xl font-bold text-amber-600">❤️</div>
            <div className="text-xs md:text-base font-bold">為肢體守望</div>
            <div className="text-[10px] md:text-xs text-gray-400 hidden sm:block">瀏覽同心阿們代禱</div>
          </button>

          <button
            onClick={() => setFilter('thanksgiving')}
            className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 p-3.5 md:p-5 rounded-2xl md:rounded-3xl shadow-sm text-center transition space-y-1 cursor-pointer"
          >
            <div className="text-lg md:text-2xl font-bold">🙌</div>
            <div className="text-xs md:text-base font-bold">感恩見證</div>
            <div className="text-[10px] md:text-xs text-purple-600 hidden sm:block">數算上帝奇妙恩典</div>
          </button>
        </div>

        {/* 標籤分類過濾 (極簡列) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs md:text-sm">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition cursor-pointer ${
              filter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            全部 ({prayers.length})
          </button>
          <button
            onClick={() => setFilter('public')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
              filter === 'public' ? 'bg-amber-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> 公開代禱
          </button>
          <button
            onClick={() => setFilter('private')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
              filter === 'private' ? 'bg-purple-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> 私密守望
          </button>
        </div>

        {/* 單欄卡片串流區 (全面響應式、絕無內捲軸) */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">載入代禱事項中...</div>
        ) : filteredPrayers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300 p-6 space-y-2">
            <p className="text-gray-500 text-sm md:text-base font-medium">目前尚無此分類事項</p>
            <p className="text-xs text-gray-400">成為第一個分享或發起代禱的人吧！</p>
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
      </main>

      {/* Modal 彈窗 */}
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
    </div>
  );
}