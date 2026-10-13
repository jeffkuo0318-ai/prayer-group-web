'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Heart, MessageCircle, Plus, Clock, Send } from 'lucide-react';

interface PrayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  prayer: any;
  currentUserId: string;
  onRefresh: () => void;
}

export default function PrayerDetailModal({
  isOpen,
  onClose,
  prayer,
  currentUserId: propCurrentUserId,
  onRefresh,
}: PrayerDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(propCurrentUserId || '');
  const [amenCount, setAmenCount] = useState<number>(0);
  const [hasAmened, setHasAmened] = useState<boolean>(false);
  const [comments, setComments] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newUpdateText, setNewUpdateText] = useState('');
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 確保能獲取到當前使用者 ID
  const ensureUserId = async (): Promise<string | null> => {
    if (currentUserId) return currentUserId;
    if (propCurrentUserId) {
      setCurrentUserId(propCurrentUserId);
      return propCurrentUserId;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      return user.id;
    }
    return null;
  };

  const fetchDetailData = async () => {
    if (!prayer?.id) return;
    const uid = await ensureUserId();

    try {
      // 1. 主代禱卡片阿們數
      const { data: amens } = await supabase
        .from('prayer_amens')
        .select('*')
        .eq('prayer_id', prayer.id);

      if (amens) {
        setAmenCount(amens.length);
        if (uid) setHasAmened(amens.some((a) => a.user_id === uid));
      }

      // 2. 留言串與每則留言的阿們按讚
      const { data: commentData } = await supabase
        .from('prayer_comments')
        .select('*')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });

      if (commentData) {
        const enriched = await Promise.all(
          commentData.map(async (c) => {
            let authorName = '主內肢體';
            if (c.user_id) {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', c.user_id)
                  .single();
                if (profile?.full_name) authorName = profile.full_name;
              } catch (e) {}
            }

            let cAmenCount = 0;
            let cHasAmened = false;
            try {
              const { data: cAmens } = await supabase
                .from('comment_amens')
                .select('*')
                .eq('comment_id', c.id);
              if (cAmens) {
                cAmenCount = cAmens.length;
                if (uid) cHasAmened = cAmens.some((ca) => ca.user_id === uid);
              }
            } catch (e) {}

            return {
              ...c,
              authorName,
              amenCount: cAmenCount,
              hasAmened: cHasAmened,
            };
          })
        );
        setComments(enriched);
      }

      // 3. 最新進展歷程
      const { data: updateData } = await supabase
        .from('prayer_updates')
        .select('*')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });

      if (updateData) setUpdates(updateData);
    } catch (err) {
      console.warn('Fetch detail safe error:', err);
    }
  };

  useEffect(() => {
    if (mounted && isOpen && prayer?.id) {
      fetchDetailData();
    }
  }, [mounted, isOpen, prayer?.id, propCurrentUserId]);

  if (!mounted || !isOpen || !prayer) return null;

  // 主卡片阿們切換
  const handleToggleAmen = async () => {
    const uid = await ensureUserId();
    if (!uid) return alert('請先登入');

    try {
      if (hasAmened) {
        await supabase.from('prayer_amens').delete().eq('prayer_id', prayer.id).eq('user_id', uid);
      } else {
        await supabase.from('prayer_amens').insert({ prayer_id: prayer.id, user_id: uid });
      }
      fetchDetailData();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // 💖 留言愛心（阿們）按鈕觸發 (含雙重備援機制)
  const handleToggleCommentAmen = async (commentId: string, commentHasAmened: boolean) => {
    const uid = await ensureUserId();
    if (!uid) return alert('請先登入才能認同留言');

    // 樂觀更新 (Optimistic UI Update) 讓使用者立刻看到點擊效果
    setComments((prevComments) =>
      prevComments.map((c) => {
        if (c.id === commentId) {
          const nextHasAmened = !commentHasAmened;
          const nextCount = nextHasAmened ? c.amenCount + 1 : Math.max(0, c.amenCount - 1);
          return { ...c, hasAmened: nextHasAmened, amenCount: nextCount };
        }
        return c;
      })
    );

    try {
      if (commentHasAmened) {
        const { error } = await supabase
          .from('comment_amens')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', uid);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comment_amens')
          .insert({ comment_id: commentId, user_id: uid });
        if (error) throw error;
      }
      fetchDetailData();
    } catch (e: any) {
      alert(`認同留言失敗：${e.message || '請確認已於 Supabase 執行 comment_amens 建表 SQL'}`);
      fetchDetailData(); // 復原狀態
    }
  };

  // 發佈新留言
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const uid = await ensureUserId();
    if (!uid) return alert('請先登入才能發佈留言');

    setLoading(true);
    try {
      const { error } = await supabase.from('prayer_comments').insert({
        prayer_id: prayer.id,
        user_id: uid,
        content: newComment.trim(),
      });

      if (!error) {
        setNewComment('');
        fetchDetailData();
        onRefresh();
      } else {
        alert(`發布失敗：${error.message}`);
      }
    } catch (e: any) {
      alert(`發生錯誤：${e.message || e}`);
    }
    setLoading(false);
  };

  // 新增最新進展
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim()) return;

    const uid = await ensureUserId();
    if (!uid) return alert('請先登入');

    setLoading(true);
    try {
      const { error } = await supabase.from('prayer_updates').insert({
        prayer_id: prayer.id,
        user_id: uid,
        content: newUpdateText.trim(),
      });

      if (!error) {
        setNewUpdateText('');
        setIsAddingUpdate(false);
        fetchDetailData();
        onRefresh();
      } else {
        alert(`新增進展失敗：${error.message}`);
      }
    } catch (e: any) {
      alert(`發生錯誤：${e.message || e}`);
    }
    setLoading(false);
  };

  const isOwner = prayer.user_id === currentUserId || prayer.creator_id === currentUserId;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-bold text-gray-800 text-sm">
              {prayer.creator_name || '主內肢體'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(prayer.created_at).toLocaleDateString()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Content */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black text-gray-800">{prayer.title}</h2>
              {prayer.status === 'urgent' && (
                <span className="bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                  迫切緊急
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {prayer.content}
            </p>
          </div>

          {/* Timeline Updates */}
          {updates.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <span>📈</span> 最新進展與歷程追蹤 ({updates.length})
              </h3>
              <div className="space-y-2 bg-amber-50/60 border border-amber-200/60 p-4 rounded-2xl text-xs">
                {updates.map((u) => (
                  <div key={u.id} className="space-y-1 pb-2 border-b border-amber-200/40 last:border-b-0 last:pb-0">
                    <span className="text-[11px] text-amber-700 font-bold">
                      {new Date(u.created_at).toLocaleDateString()} 更新：
                    </span>
                    <p className="text-gray-700 whitespace-pre-wrap pl-2 border-l-2 border-amber-400">
                      {u.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Update Input */}
          {isAddingUpdate ? (
            <form onSubmit={handleAddUpdate} className="bg-gray-50 p-3.5 rounded-2xl border space-y-2">
              <textarea
                value={newUpdateText}
                onChange={(e) => setNewUpdateText(e.target.value)}
                placeholder="請輸入此事件的最新發展或進展補充..."
                className="w-full text-xs p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                rows={2}
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAddingUpdate(false)}
                  className="px-3 py-1.5 rounded-xl text-gray-500 hover:bg-gray-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  送出進展
                </button>
              </div>
            </form>
          ) : (
            isOwner && (
              <button
                type="button"
                onClick={() => setIsAddingUpdate(true)}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold bg-amber-100/60 hover:bg-amber-100 px-3 py-2 rounded-xl transition flex items-center gap-1 border border-amber-200/80 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> 增加最新進展 / 事件補充
              </button>
            )
          )}

          {/* Main Prayer Amen Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleToggleAmen}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs ${
                hasAmened
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-600'
              }`}
            >
              <Heart className={`w-4 h-4 ${hasAmened ? 'fill-current' : ''}`} />
              <span>同心阿們 ({amenCount})</span>
            </button>
          </div>

          {/* LINE Group Comments Section */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-amber-600" /> 肢體守望留言串 ({comments.length})
            </h3>

            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">尚無留言，留下您的關懷與守望鼓勵吧！</p>
            ) : (
              <div className="space-y-2.5 bg-gray-50/80 p-4 rounded-2xl max-h-[300px] overflow-y-auto">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white p-3 rounded-2xl border border-gray-200/60 text-xs flex items-start justify-between gap-3 shadow-xs hover:border-amber-200 transition"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="font-bold text-gray-800 flex items-center justify-between">
                        <span>{c.authorName}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                    </div>

                    {/* 💖 每則留言專屬的愛心按鈕 */}
                    <button
                      type="button"
                      onClick={() => handleToggleCommentAmen(c.id, c.hasAmened)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                        c.hasAmened
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60'
                      }`}
                      title="認同此留言"
                    >
                      <Heart className={`w-3.5 h-3.5 ${c.hasAmened ? 'fill-current text-white' : 'text-amber-500'}`} />
                      <span>{c.amenCount > 0 ? c.amenCount : ''}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Send Comment Row */}
        <form onSubmit={handleAddComment} className="p-4 bg-white border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="像 LINE 群組一樣，留下您的代禱留言與關懷..."
            className="flex-1 text-xs px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4" /> 發佈
          </button>
        </form>
      </div>
    </div>
  );
}