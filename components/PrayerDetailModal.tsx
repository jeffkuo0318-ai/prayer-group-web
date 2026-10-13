'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Heart, MessageCircle, Plus, Clock, Globe, Lock, Send } from 'lucide-react';

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
  currentUserId,
  onRefresh,
}: PrayerDetailModalProps) {
  const [amenCount, setAmenCount] = useState<number>(0);
  const [hasAmened, setHasAmened] = useState<boolean>(false);
  const [comments, setComments] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newUpdateText, setNewUpdateText] = useState('');
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !prayer) return null;

  const fetchDetailData = async () => {
    try {
      // 1. 主卡片阿們數（防呆）
      const { data: amens, error: amenErr } = await supabase
        .from('prayer_amens')
        .select('*')
        .eq('prayer_id', prayer.id);

      if (!amenErr && amens) {
        setAmenCount(amens.length);
        setHasAmened(amens.some((a) => a.user_id === currentUserId));
      }

      // 2. 留言串與留言按讚（防呆）
      const { data: commentData, error: commentErr } = await supabase
        .from('prayer_comments')
        .select('*, profiles(full_name)')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });

      if (!commentErr && commentData) {
        const commentsWithAmens = await Promise.all(
          commentData.map(async (c) => {
            try {
              const { data: cAmens, error: caErr } = await supabase
                .from('comment_amens')
                .select('*')
                .eq('comment_id', c.id);
              if (!caErr && cAmens) {
                return {
                  ...c,
                  amenCount: cAmens.length,
                  hasAmened: cAmens.some((ca) => ca.user_id === currentUserId),
                };
              }
            } catch (e) {
              // 防呆：若 comment_amens 表不存在，不阻斷程式
            }
            return { ...c, amenCount: 0, hasAmened: false };
          })
        );
        setComments(commentsWithAmens);
      }

      // 3. 最新進展歷程（防呆）
      const { data: updateData, error: updateErr } = await supabase
        .from('prayer_updates')
        .select('*')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });

      if (!updateErr && updateData) {
        setUpdates(updateData);
      }
    } catch (err) {
      console.error('Modal 載入防呆捕捉：', err);
    }
  };

  useEffect(() => {
    fetchDetailData();
  }, [prayer.id, currentUserId]);

  // 切換卡片阿們
  const handleToggleAmen = async () => {
    if (!currentUserId) return alert('請先登入');
    try {
      if (hasAmened) {
        await supabase.from('prayer_amens').delete().eq('prayer_id', prayer.id).eq('user_id', currentUserId);
      } else {
        await supabase.from('prayer_amens').insert({ prayer_id: prayer.id, user_id: currentUserId });
      }
      fetchDetailData();
    } catch (e) {
      console.error('Amen error:', e);
    }
  };

  // 切換單則留言愛心（含防呆）
  const handleToggleCommentAmen = async (commentId: string, commentHasAmened: boolean) => {
    if (!currentUserId) return alert('請先登入');
    try {
      if (commentHasAmened) {
        await supabase.from('comment_amens').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
      } else {
        await supabase.from('comment_amens').insert({ comment_id: commentId, user_id: currentUserId });
      }
      fetchDetailData();
    } catch (e) {
      alert('無法更新留言按讚，請確認資料庫是否已執行建立 comment_amens 指令');
    }
  };

  // 發佈留言
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;

    setLoading(true);
    const { error } = await supabase.from('prayer_comments').insert({
      prayer_id: prayer.id,
      user_id: currentUserId,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment('');
      fetchDetailData();
    } else {
      alert(`發布失敗：${error.message}`);
    }
    setLoading(false);
  };

  // 新增最新進展
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim() || !currentUserId) return;

    setLoading(true);
    const { error } = await supabase.from('prayer_updates').insert({
      prayer_id: prayer.id,
      user_id: currentUserId,
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
    setLoading(false);
  };

  const isOwner = prayer.user_id === currentUserId || prayer.creator_id === currentUserId;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* 視窗頂部 Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-bold text-gray-800 text-sm">
              {prayer.profiles?.full_name || prayer.creator_name || '主內肢體'}
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

        {/* 視窗內部動態對話交誼 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 禱告主題與具體內容 */}
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

          {/* 最新進展與歷程 */}
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

          {/* 新增最新進展輸入區 */}
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
                onClick={() => setIsAddingUpdate(true)}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold bg-amber-100/60 hover:bg-amber-100 px-3 py-2 rounded-xl transition flex items-center gap-1 border border-amber-200/80 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> 增加最新進展 / 事件補充
              </button>
            )
          )}

          {/* 互動按鈕：主卡片阿們數 */}
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

          {/* LINE 風格留言串 */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-amber-600" /> 肢體守望留言串 ({comments.length})
            </h3>

            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">尚無留言，留下您的關懷與守望鼓勵吧！</p>
            ) : (
              <div className="space-y-2.5 bg-gray-50/80 p-4 rounded-2xl max-h-[300px] overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200/60 text-xs shadow-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-gray-800 flex items-center gap-2">
                        <span>{c.profiles?.full_name || '主內肢體'}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>

                    {/* 單則留言愛心按鈕 */}
                    <button
                      type="button"
                      onClick={() => handleToggleCommentAmen(c.id, c.hasAmened)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                        c.hasAmened
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 hover:bg-amber-100 text-gray-600'
                      }`}
                      title="認同此留言"
                    >
                      <Heart className={`w-3.5 h-3.5 ${c.hasAmened ? 'fill-current' : ''}`} />
                      <span>{c.amenCount > 0 ? c.amenCount : ''}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部固定輸入留言列 */}
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