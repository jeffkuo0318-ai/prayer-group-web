'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Plus, Clock, Globe, Lock, Send } from 'lucide-react';

interface PrayerCardProps {
  prayer: any;
  currentUserId?: string;
}

export default function PrayerCard({ prayer, currentUserId: propCurrentUserId }: PrayerCardProps) {
  const [currentUserId, setCurrentUserId] = useState<string>(propCurrentUserId || '');
  const [amenCount, setAmenCount] = useState<number>(0);
  const [hasAmened, setHasAmened] = useState<boolean>(false);
  const [comments, setComments] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newUpdateText, setNewUpdateText] = useState('');
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [loading, setLoading] = useState(false);

  // 確保能抓到當前使用者 ID
  useEffect(() => {
    if (propCurrentUserId) {
      setCurrentUserId(propCurrentUserId);
    } else {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setCurrentUserId(user.id);
      });
    }
  }, [propCurrentUserId]);

  // 抓取阿們數、留言與最新進展
  const fetchData = async () => {
    try {
      // 1. 阿們紀錄
      const { data: amens, error: amenError } = await supabase
        .from('prayer_amens')
        .select('*')
        .eq('prayer_id', prayer.id);

      if (!amenError && amens) {
        setAmenCount(amens.length);
        if (currentUserId) {
          setHasAmened(amens.some((a) => a.user_id === currentUserId));
        }
      }

      // 2. 留言紀錄
      const { data: commentData, error: commentError } = await supabase
        .from('prayer_comments')
        .select('*, profiles(full_name)')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });

      if (!commentError && commentData) {
        setComments(commentData);
      }

      // 3. 最新進展/更新歷程
      const { data: updateData, error: updateError } = await supabase
        .from('prayer_updates')
        .select('*')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });

      if (!updateError && updateData) {
        setUpdates(updateData);
      }
    } catch (err) {
      console.error('Fetch prayer card data error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [prayer.id, currentUserId]);

  // 切換「阿們」
  const handleToggleAmen = async () => {
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
        const { error } = await supabase
          .from('prayer_amens')
          .delete()
          .eq('prayer_id', prayer.id)
          .eq('user_id', uid);
        if (error) {
          alert(`取消阿們失敗：${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase
          .from('prayer_amens')
          .insert({ prayer_id: prayer.id, user_id: uid });
        if (error) {
          alert(`阿們失敗：${error.message}`);
          return;
        }
      }
      fetchData();
    } catch (err: any) {
      alert(`操作發生錯誤：${err.message || err}`);
    }
  };

  // 送出新留言 (「發佈」按鈕)
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    let uid = currentUserId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        uid = user.id;
        setCurrentUserId(user.id);
      } else {
        alert('請先登入才能留言');
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('prayer_comments').insert({
        prayer_id: prayer.id,
        user_id: uid,
        content: newComment.trim(),
      });

      if (error) {
        alert(`留言發布失敗：${error.message}`);
      } else {
        setNewComment('');
        fetchData();
      }
    } catch (err: any) {
      alert(`留言發生錯誤：${err.message || err}`);
    }
    setLoading(false);
  };

  // ➕ 新增最新進展
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim()) return;

    let uid = currentUserId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        uid = user.id;
        setCurrentUserId(user.id);
      } else {
        alert('請先登入');
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('prayer_updates').insert({
        prayer_id: prayer.id,
        user_id: uid,
        content: newUpdateText.trim(),
      });

      if (error) {
        alert(`新增進展失敗：${error.message}`);
      } else {
        setNewUpdateText('');
        setIsAddingUpdate(false);
        fetchData();
      }
    } catch (err: any) {
      alert(`發生錯誤：${err.message || err}`);
    }
    setLoading(false);
  };

  const isOwner = prayer.user_id === currentUserId || prayer.creator_id === currentUserId;

  return (
    <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-sm space-y-4 font-sans hover:border-amber-300 transition">
      {/* 1. 卡片頂部資訊 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800 text-sm">
            {prayer.profiles?.full_name || prayer.creator_name || '主內肢體'}
          </span>
          <span className="text-gray-400">•</span>
          <span className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3 h-3" />
            {new Date(prayer.created_at).toLocaleDateString()}
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

      {/* 2. 禱告主題與內容 */}
      <div className="space-y-1.5">
        <h3 className="text-base md:text-lg font-bold text-gray-800 leading-snug">
          {prayer.title}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
          {prayer.content}
        </p>
      </div>

      {/* 3. 📈 最新進展歷程區塊 */}
      {updates.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="font-bold text-amber-900 flex items-center justify-between border-b border-amber-200/50 pb-1.5">
            <span>最新進展與歷程 ({updates.length})</span>
          </div>
          <div className="space-y-2">
            {updates.map((u) => (
              <div key={u.id} className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold">
                  <span>• {new Date(u.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-700 text-xs pl-3 border-l-2 border-amber-400 whitespace-pre-wrap">
                  {u.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 新增最新進展按鈕區 */}
      {isAddingUpdate ? (
        <form onSubmit={handleAddUpdate} className="bg-gray-50 p-3 rounded-2xl border space-y-2">
          <textarea
            value={newUpdateText}
            onChange={(e) => setNewUpdateText(e.target.value)}
            placeholder="請輸入此事件的最新發展或進展補充..."
            className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
            rows={2}
          />
          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsAddingUpdate(false)}
              className="px-3 py-1 rounded-lg text-gray-500 hover:bg-gray-200 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition cursor-pointer"
            >
              送出最新進展
            </button>
          </div>
        </form>
      ) : (
        isOwner && (
          <button
            onClick={() => setIsAddingUpdate(true)}
            className="text-xs text-amber-700 hover:text-amber-800 font-bold bg-amber-100/60 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1 border border-amber-200/80 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> 增加最新進展 / 事件補充
          </button>
        )
      )}

      {/* 5. 卡片底部互動區 (同心阿們 & 留言) */}
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

        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>留言 ({comments.length})</span>
        </div>
      </div>

      {/* 6. 留言列表與發送區塊 */}
      <div className="space-y-2 pt-1">
        {comments.length > 0 && (
          <div className="space-y-1.5 bg-gray-50/80 p-3 rounded-2xl text-xs">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-1.5">
                <span className="font-bold text-gray-700 shrink-0">
                  {c.profiles?.full_name || '肢體'}：
                </span>
                <span className="text-gray-600">{c.content}</span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="寫下您的關懷或守望文字..."
            className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> 發佈
          </button>
        </form>
      </div>
    </div>
  );
}