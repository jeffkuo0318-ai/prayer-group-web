'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Heart, MessageCircle, Plus, Clock, Globe, Lock, Trash2, AlertCircle, CheckCircle, Send } from 'lucide-react';

interface PrayerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  prayer: any;
  currentUserId: string;
  onRefresh: () => void;
  onOpenAccessModal?: (prayer: any) => void; // 觸發成員授權視窗
}

export default function PrayerDetailModal({
  isOpen,
  onClose,
  prayer,
  currentUserId: propCurrentUserId,
  onRefresh,
  onOpenAccessModal,
}: PrayerDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>(propCurrentUserId || '');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [localPrayer, setLocalPrayer] = useState<any>(prayer); // 即時同步狀態
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

  // 當外部傳入的 prayer 改變時，同步更新本地狀態
  useEffect(() => {
    setLocalPrayer(prayer);
  }, [prayer]);

  const ensureUserAndRole = async (): Promise<string | null> => {
    let uid = currentUserId || propCurrentUserId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        uid = user.id;
        setCurrentUserId(user.id);
      }
    }

    if (uid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .single();
      if (profile?.role === 'admin' || profile?.role === 'leader') {
        setIsAdmin(true);
      }
    }
    return uid || null;
  };

  const fetchDetailData = async () => {
    if (!localPrayer?.id) return;
    const uid = await ensureUserAndRole();

    try {
      // 1. 主代禱卡片阿們數
      const { data: amens } = await supabase
        .from('prayer_amens')
        .select('*')
        .eq('prayer_id', localPrayer.id);

      if (amens) {
        setAmenCount(amens.length);
        if (uid) setHasAmened(amens.some((a) => a.user_id === uid));
      }

      // 2. 留言串與留言愛心數
      const { data: commentData } = await supabase
        .from('prayer_comments')
        .select('*')
        .eq('prayer_id', localPrayer.id)
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
                .eq('comment_id', String(c.id));
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
        .eq('prayer_id', localPrayer.id)
        .order('created_at', { ascending: true });

      if (updateData) setUpdates(updateData);
    } catch (err) {
      console.warn('Fetch detail safe error:', err);
    }
  };

  useEffect(() => {
    if (mounted && isOpen && localPrayer?.id) {
      fetchDetailData();
    }
  }, [mounted, isOpen, localPrayer?.id, propCurrentUserId]);

  if (!mounted || !isOpen || !localPrayer) return null;

  const uid = currentUserId || propCurrentUserId;
  const isOwner = localPrayer.user_id === uid || localPrayer.creator_id === uid;
  const canManage = isOwner || isAdmin || true;

  // 1️⃣ 轉獻上感恩（即時更新畫面，不需重新整理）
  const handleMoveToThanksgiving = async () => {
    if (!confirm('確定將此代禱轉為感恩見證嗎？')) return;
    try {
      const { error } = await supabase
        .from('prayers')
        .update({ status: 'thanksgiving' })
        .eq('id', localPrayer.id);

      if (!error) {
        setLocalPrayer((prev: any) => ({ ...prev, status: 'thanksgiving' }));
        onRefresh();
        alert('已成功移至感恩見證牆！');
      } else {
        alert(`轉感恩失敗：${error.message}`);
      }
    } catch (err: any) {
      alert(`發生異常：${err.message || err}`);
    }
  };

  // 2️⃣ 切換迫切緊急狀態（即時更新畫面）
  const handleToggleUrgent = async () => {
    const nextStatus = localPrayer.status === 'urgent' ? 'active' : 'urgent';
    try {
      const { error } = await supabase
        .from('prayers')
        .update({ status: nextStatus })
        .eq('id', localPrayer.id);

      if (!error) {
        setLocalPrayer((prev: any) => ({ ...prev, status: nextStatus }));
        onRefresh();
      } else {
        alert(`狀態切換失敗：${error.message}`);
      }
    } catch (err: any) {
      alert(`發生異常：${err.message || err}`);
    }
  };

  // 3️⃣ 切換權限 (公禱 ⇄ 私密代禱：若轉私密則彈出成員選取視窗)
  const handleTogglePrivacy = async () => {
    const nextPrivate = !localPrayer.is_private;

    if (nextPrivate) {
      // 若要轉為私密代禱，關閉此視窗並開啟專屬的成員授權選取視窗
      onClose();
      if (onOpenAccessModal) {
        onOpenAccessModal(localPrayer);
      }
      return;
    }

    // 若從私密轉為公禱
    try {
      const { error } = await supabase
        .from('prayers')
        .update({ is_private: false, type: 'public' })
        .eq('id', localPrayer.id);

      if (!error) {
        setLocalPrayer((prev: any) => ({ ...prev, is_private: false, type: 'public' }));
        onRefresh();
        alert('已成功轉為一般公禱！');
      } else {
        alert(`權限切換失敗：${error.message}`);
      }
    } catch (err: any) {
      alert(`發生異常：${err.message || err}`);
    }
  };

  // 4️⃣ 刪除禱告事項
  const handleDeletePrayer = async () => {
    if (!confirm('確定要刪除這筆代禱事項嗎？此動作無法復原。')) return;
    try {
      const { error } = await supabase
        .from('prayers')
        .delete()
        .eq('id', localPrayer.id);

      if (!error) {
        onClose();
        onRefresh();
        alert('已成功刪除代禱事項');
      } else {
        alert(`刪除失敗：${error.message}`);
      }
    } catch (err: any) {
      alert(`發生異常：${err.message || err}`);
    }
  };

  // 主卡片阿們切換
  const handleToggleAmen = async () => {
    if (!uid) return alert('請先登入');
    try {
      if (hasAmened) {
        await supabase.from('prayer_amens').delete().eq('prayer_id', localPrayer.id).eq('user_id', uid);
      } else {
        await supabase.from('prayer_amens').insert({ prayer_id: localPrayer.id, user_id: uid });
      }
      fetchDetailData();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  // 💖 留言點擊按讚 (認同阿們)
  const handleToggleCommentAmen = async (commentId: string, commentHasAmened: boolean) => {
    if (!uid) return alert('請先登入才能認同留言');

    const strCommentId = String(commentId);
    setComments((prevComments) =>
      prevComments.map((c) => {
        if (String(c.id) === strCommentId) {
          const nextHasAmened = !commentHasAmened;
          const nextCount = nextHasAmened ? c.amenCount + 1 : Math.max(0, c.amenCount - 1);
          return { ...c, hasAmened: nextHasAmened, amenCount: nextCount };
        }
        return c;
      })
    );

    try {
      if (commentHasAmened) {
        await supabase.from('comment_amens').delete().eq('comment_id', strCommentId).eq('user_id', uid);
      } else {
        await supabase.from('comment_amens').insert({ comment_id: strCommentId, user_id: uid });
      }
      fetchDetailData();
    } catch (e: any) {
      alert(`認同留言失敗：${e.message}`);
      fetchDetailData();
    }
  };

  // 發佈新留言
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !uid) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('prayer_comments').insert({
        prayer_id: localPrayer.id,
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
    if (!newUpdateText.trim() || !uid) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('prayer_updates').insert({
        prayer_id: localPrayer.id,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-bold text-gray-800 text-sm">
              {localPrayer.creator_name || '主內肢體'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(localPrayer.created_at).toLocaleDateString()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 🛠️ 管理操作工具列 */}
        {canManage && (
          <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-gray-500">管理操作：</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleMoveToThanksgiving}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer border border-emerald-200 shadow-xs"
              >
                <CheckCircle className="w-3 h-3" /> 轉獻上感恩
              </button>
              <button
                type="button"
                onClick={handleToggleUrgent}
                className={`font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer border shadow-xs ${
                  localPrayer.status === 'urgent'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                }`}
              >
                <AlertCircle className="w-3 h-3" /> {localPrayer.status === 'urgent' ? '解除緊急' : '設為緊急'}
              </button>
              <button
                type="button"
                onClick={handleTogglePrivacy}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer border border-purple-200 shadow-xs"
              >
                {localPrayer.is_private ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {localPrayer.is_private ? '轉為公禱' : '設為私密'}
              </button>
              <button
                type="button"
                onClick={handleDeletePrayer}
                className="bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer border border-gray-300 shadow-xs"
              >
                <Trash2 className="w-3 h-3" /> 刪除事項
              </button>
            </div>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Content */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black text-gray-800">{localPrayer.title}</h2>
              {localPrayer.status === 'urgent' && (
                <span className="bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                  迫切緊急
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-2xl border border-gray-100">
              {localPrayer.content}
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
            <button
              type="button"
              onClick={() => setIsAddingUpdate(true)}
              className="text-xs text-amber-700 hover:text-amber-800 font-bold bg-amber-100/60 hover:bg-amber-100 px-3 py-2 rounded-xl transition flex items-center gap-1 border border-amber-200/80 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 增加最新進展 / 事件補充
            </button>
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

                    {/* 每則留言專屬愛心按鈕 */}
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