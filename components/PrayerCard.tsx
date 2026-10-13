'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Clock, Globe, Lock, Plus, Send, ChevronDown, ChevronUp } from 'lucide-react';

interface PrayerCardProps {
  prayer: any;
  currentUserId?: string;
  onRefresh?: () => void;
}

export default function PrayerCard({ prayer, currentUserId: propCurrentUserId, onRefresh }: PrayerCardProps) {
  const [currentUserId, setCurrentUserId] = useState<string>(propCurrentUserId || '');
  const [amenCount, setAmenCount] = useState<number>(0);
  const [hasAmened, setHasAmened] = useState<boolean>(false);
  const [comments, setComments] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newUpdateText, setNewUpdateText] = useState('');
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // 展開/收合 LINE 風格交誼詳情
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propCurrentUserId) {
      setCurrentUserId(propCurrentUserId);
    } else {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setCurrentUserId(user.id);
      });
    }
  }, [propCurrentUserId]);

  const fetchData = async () => {
    try {
      // 1. 阿們數
      const { data: amens } = await supabase.from('prayer_amens').select('*').eq('prayer_id', prayer.id);
      if (amens) {
        setAmenCount(amens.length);
        if (currentUserId) setHasAmened(amens.some((a) => a.user_id === currentUserId));
      }

      // 2. 留言串
      const { data: commentData } = await supabase
        .from('prayer_comments')
        .select('*')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });

      if (commentData) {
        setComments(commentData);
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
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [prayer.id, currentUserId]);

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

    if (hasAmened) {
      await supabase.from('prayer_amens').delete().eq('prayer_id', prayer.id).eq('user_id', uid);
    } else {
      await supabase.from('prayer_amens').insert({ prayer_id: prayer.id, user_id: uid });
    }
    fetchData();
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
        fetchData();
        if (onRefresh) onRefresh();
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
        fetchData();
        if (onRefresh) onRefresh();
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
    <div className="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-sm space-y-4 font-sans hover:border-amber-400 transition">
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
      <div className="space-y-1.5 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <h3 className="text-base md:text-lg font-bold text-gray-800 leading-snug flex items-center justify-between">
          <span>{prayer.title}</span>
          <span className="text-xs text-amber-600 font-normal flex items-center gap-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isOpen ? '收合詳情' : '展開交誼'}
          </span>
        </h3>
        <p className={`text-sm text-gray-600 leading-relaxed ${isOpen ? '' : 'line-clamp-2'}`}>
          {prayer.content}
        </p>
      </div>

      {/* 展開後的 LINE 風格交誼與進展詳情區塊 */}
      {isOpen && (
        <div className="space-y-4 pt-3 border-t border-gray-100 animate-fade-in">
          {/* 最新進展與歷程 */}
          {updates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <span>📈</span> 最新進展與歷程追蹤 ({updates.length})
              </h4>
              <div className="space-y-2 bg-amber-50/60 border border-amber-200/60 p-3.5 rounded-2xl text-xs">
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
                  送出進展
                </button>
              </div>
            </form>
          ) : (
            isOwner && (
              <button
                type="button"
                onClick={() => setIsAddingUpdate(true)}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold bg-amber-100/60 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1 border border-amber-200/80 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> 增加最新進展 / 事件補充
              </button>
            )
          )}

          {/* LINE 風格留言交誼串 */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-amber-600" /> 肢體守望留言串 ({comments.length})
            </h4>

            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">尚無留言，留下您的關懷與守望鼓勵吧！</p>
            ) : (
              <div className="space-y-2 bg-gray-50/80 p-3 rounded-2xl max-h-[250px] overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="bg-white p-2.5 rounded-xl border border-gray-200/60 text-xs space-y-0.5">
                    <div className="font-bold text-gray-800 flex items-center justify-between">
                      <span>{c.creator_name || '主內肢體'}</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-600 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部留言輸入框 (LINE 風格) */}
          <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="像 LINE 群組一樣，留下您的代禱留言與關懷..."
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
      )}

      {/* 卡片底部互動列 */}
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

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition cursor-pointer"
        >
          <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>{isOpen ? '收合交誼' : `進入互動交誼 (${comments.length})`}</span>
        </button>
      </div>
    </div>
  );
}