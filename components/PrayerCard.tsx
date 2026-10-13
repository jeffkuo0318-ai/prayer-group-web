'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Clock, Globe, Lock, Plus } from 'lucide-react';
import PrayerDetailModal from './PrayerDetailModal';

interface PrayerCardProps {
  prayer: any;
  currentUserId?: string;
  onRefresh?: () => void;
}

export default function PrayerCard({ prayer, currentUserId: propCurrentUserId, onRefresh }: PrayerCardProps) {
  const [mounted, setMounted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(propCurrentUserId || '');
  const [amenCount, setAmenCount] = useState<number>(0);
  const [hasAmened, setHasAmened] = useState<boolean>(false);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [updates, setUpdates] = useState<any[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (propCurrentUserId) {
      setCurrentUserId(propCurrentUserId);
    } else {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setCurrentUserId(user.id);
      });
    }
  }, [propCurrentUserId]);

  const fetchData = async () => {
    if (!prayer?.id) return;
    try {
      // 1. 阿們數
      const { data: amens } = await supabase.from('prayer_amens').select('*').eq('prayer_id', prayer.id);
      if (amens) {
        setAmenCount(amens.length);
        if (currentUserId) setHasAmened(amens.some((a) => a.user_id === currentUserId));
      }

      // 2. 留言數
      const { count: cCount } = await supabase.from('prayer_comments').select('*', { count: 'exact', head: true }).eq('prayer_id', prayer.id);
      if (cCount !== null) setCommentCount(cCount);

      // 3. 最新進展
      const { data: updateData } = await supabase.from('prayer_updates').select('*').eq('prayer_id', prayer.id).order('created_at', { ascending: true });
      if (updateData) setUpdates(updateData);
    } catch (e) {
      console.warn('Safe fetch prayer card error:', e);
    }
  };

  useEffect(() => {
    if (mounted && prayer?.id) {
      fetchData();
    }
  }, [mounted, prayer?.id, currentUserId]);

  if (!mounted || !prayer) return null;

  // 快捷按阿們
  const handleToggleAmen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let uid = currentUserId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        uid = user.id;
        setCurrentUserId(user.id);
      } else {
        alert('請先登入才能按阿們');
        return;
      }
    }

    try {
      if (hasAmened) {
        await supabase.from('prayer_amens').delete().eq('prayer_id', prayer.id).eq('user_id', uid);
      } else {
        await supabase.from('prayer_amens').insert({ prayer_id: prayer.id, user_id: uid });
      }
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {/* 點擊整張代禱卡片開啟專屬彈出式 LINE 風格交誼視窗 */}
      <div
        onClick={() => setIsDetailOpen(true)}
        className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-sm space-y-4 font-sans hover:border-amber-400 hover:shadow-md transition cursor-pointer"
      >
        {/* 卡片頂部 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 text-sm">
              {prayer.creator_name || '主內肢體'}
            </span>
            <span className="text-gray-400">•</span>
            <span className="flex items-center gap-1 text-gray-400">
              <Clock className="w-3 h-3" /> {new Date(prayer.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {prayer.status === 'urgent' && (
              <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                迫切緊急
              </span>
            )}
            {prayer.is_private || prayer.type === 'private' ? (
              <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-0.5">
                <Lock className="w-3 h-3" /> 私密代禱
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-0.5">
                <Globe className="w-3 h-3" /> 一般公禱
              </span>
            )}
          </div>
        </div>

        {/* 標題與內容 */}
        <div className="space-y-1.5">
          <h3 className="text-base md:text-lg font-bold text-gray-800 leading-snug">
            {prayer.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {prayer.content}
          </p>
        </div>

        {/* 最新進展摘要 */}
        {updates.length > 0 && (
          <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-3 text-xs space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> 最新進展摘要 ({updates.length})
            </div>
            <p className="text-gray-700 truncate">{updates[updates.length - 1].content}</p>
          </div>
        )}

        {/* 底部互動列 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleToggleAmen}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
              hasAmened
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${hasAmened ? 'fill-current' : ''}`} />
            <span>阿們 ({amenCount})</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition">
            <MessageCircle className="w-4 h-4 text-amber-600" />
            <span>進入互動交誼與留言 ({commentCount})</span>
          </div>
        </div>
      </div>

      {/* 彈出式交誼視窗 (Modal) */}
      {isDetailOpen && (
        <PrayerDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          prayer={prayer}
          currentUserId={currentUserId}
          onRefresh={() => {
            fetchData();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </>
  );
}