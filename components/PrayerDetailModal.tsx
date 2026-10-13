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

  // 安全抓取詳情資料 (加入 Try-Catch 全面防呆，絕對不讓畫面崩潰)
  const fetchDetailData = async () => {
    try {
      // 1. 卡片主阿們數
      const { data: amens } = await supabase
        .from('prayer_amens')
        .select('*')
        .eq('prayer_id', prayer.id);

      if (amens) {
        setAmenCount(amens.length);
        if (currentUserId) {
          setHasAmened(amens.some((a) => a.user_id === currentUserId));
        }
      }

      // 2. 留言串 (安全查詢)
      const { data: commentData } = await supabase
        .from('prayer_comments')
        .select('*')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });

      if (commentData) {
        const safeComments = commentData.map((c) => ({
          ...c,
          authorName: c.creator_name || '主內肢體',
          amenCount: 0,
          hasAmened: false,
        }));
        setComments(safeComments);
      }

      // 3. 最新進展歷程
      const { data: updateData } = await supabase
        .from('prayer_updates')
        .select('*')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });

      if (updateData) {
        setUpdates(updateData);
      }
    } catch (err) {
      console.error('Modal fetch safe error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDetailData();
    }
  }, [isOpen, prayer.id, currentUserId]);

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
      console.error(e);
    }
  };

  // 發佈留言
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('prayer_comments').insert({
        prayer_id: prayer.id,
        user_id: currentUserId,
        content: newComment.trim(),
        creator_name: '主內肢體',
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
    if (!newUpdateText.trim() || !currentUserId) return;

    setLoading(true);
    try {
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
    } catch (e: any) {
      alert(`發生錯誤：${e.message || e}`);
    }
    setLoading(false);
  };

  const isOwner = prayer.user_id === currentUserId || prayer.creator_id === currentUserId;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* 頂部 Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
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

        {/* 視窗內容主體 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 主題與內容 */}
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

          {/* 最新進展歷程 */}
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

          {/* 新增最新進展 */}
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

          {/* 按讚阿們按鈕 */}
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

          {/* LINE 風格對話留言串 */}
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
                        <span>{c.authorName}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部輸入框 */}
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