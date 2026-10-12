'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Heart,
  Send,
  Lock,
  Globe,
  Flame,
  UserX,
  Users,
  CheckCircle,
  Sparkles,
  User,
  MessageSquare
} from 'lucide-react';
import MarkAnsweredModal from './MarkAnsweredModal';

interface PrayerCardProps {
  prayer: any;
  currentUserId: string;
}

export default function PrayerCard({ prayer, currentUserId }: PrayerCardProps) {
  const [amenCount, setAmenCount] = useState(0);
  const [hasAmened, setHasAmened] = useState(false);
  const [amenUsers, setAmenUsers] = useState<string[]>([]);
  const [loadingAmen, setLoadingAmen] = useState(false);

  // 留言相關狀態
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false); // 控制留言展開/折疊
  const [members, setMembers] = useState<any[]>([]);

  // 標記蒙應允對話框
  const [isMarkAnsweredOpen, setIsMarkAnsweredOpen] = useState(false);

  const isCreator = prayer.creator_id === currentUserId || prayer.user_id === currentUserId;

  const fetchAmens = async () => {
    try {
      const { data, error } = await supabase
        .from('amens')
        .select('user_id, profiles(full_name, email)')
        .eq('prayer_id', prayer.id);
      if (!error && data) {
        setAmenCount(data.length);
        setHasAmened(data.some((item: any) => item.user_id === currentUserId));
        const names = data.map((item: any) => {
          const profile = item.profiles;
          return profile?.full_name || profile?.email?.split('@')[0] || '小組肢體';
        });
        setAmenUsers(names);
      }
    } catch (e) {
      console.error('Error fetching amens:', e);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id, 
          content, 
          created_at, 
          user_id, 
          profiles(full_name, email),
          comment_amens(user_id, profiles(full_name, email))
        `)
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setComments(data);
      }
    } catch (e) {
      console.error('Error fetching comments:', e);
    }
  };

  const fetchAllMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('status', 'approved');
    if (data) setMembers(data);
  };

  useEffect(() => {
    if (prayer?.id) {
      fetchAmens();
      fetchComments();
      fetchAllMembers();
    }
  }, [prayer?.id, currentUserId]);

  const handleToggleAmen = async () => {
    if (!currentUserId || loadingAmen) return;
    setLoadingAmen(true);
    if (hasAmened) {
      await supabase
        .from('amens')
        .delete()
        .eq('prayer_id', prayer.id)
        .eq('user_id', currentUserId);
    } else {
      await supabase
        .from('amens')
        .insert({ prayer_id: prayer.id, user_id: currentUserId });
    }
    await fetchAmens();
    setLoadingAmen(false);
  };

  const handleToggleCommentAmen = async (commentId: string, isAlreadyAmened: boolean) => {
    if (!currentUserId) return;
    if (isAlreadyAmened) {
      await supabase
        .from('comment_amens')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', currentUserId);
    } else {
      await supabase
        .from('comment_amens')
        .insert({ comment_id: commentId, user_id: currentUserId });
    }
    await fetchComments();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId || loadingComment) return;
    setLoadingComment(true);
    const { error } = await supabase.from('comments').insert({
      prayer_id: prayer.id,
      user_id: currentUserId,
      content: newComment.trim(),
    });
    if (!error) {
      setNewComment('');
      await fetchComments();
    } else {
      alert(`留言失敗：${error.message}`);
    }
    setLoadingComment(false);
  };

  const handleExcludeUser = async (targetUserId: string, targetUserName: string) => {
    if (!isCreator) return;
    if (!confirm(`確定要排除「${targetUserName}」嗎？事項將轉為私密代禱。`)) return;
    let updatedAllowedIds: string[] = [];
    if (prayer.type === 'public') {
      updatedAllowedIds = members
        .map((m) => m.id)
        .filter((id) => id !== targetUserId && id !== currentUserId);
    } else {
      const currentAllowed = Array.isArray(prayer.allowed_user_ids)
        ? prayer.allowed_user_ids
        : members.map((m) => m.id);
      updatedAllowedIds = currentAllowed.filter((id: string) => id !== targetUserId);
    }
    const { error } = await supabase
      .from('prayers')
      .update({
        type: 'private',
        is_private: true,
        allowed_user_ids: updatedAllowedIds,
      })
      .eq('id', prayer.id);
    if (!error) {
      alert(`🔒 已無痕排除「${targetUserName}」。`);
      window.location.reload();
    }
  };

  const visibleMembers = members.filter((m) => {
    if (m.id === prayer.creator_id || m.id === prayer.user_id) return false;
    if (prayer.type === 'public' && !prayer.is_private) return true;
    return Array.isArray(prayer.allowed_user_ids) && prayer.allowed_user_ids.includes(m.id);
  });

  const getStatusBadge = () => {
    switch (prayer.status) {
      case 'urgent':
        return (
          <span className="bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> 迫切緊急
          </span>
        );
      case 'answered':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> 蒙應允
          </span>
        );
      case 'thanksgiving':
        return (
          <span className="bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 獻上感恩
          </span>
        );
      default:
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full">
            禱告中
          </span>
        );
    }
  };

  // 留言無滾動條自然延伸邏輯：預設最多顯示 2 條，點擊展開全部
  const displayedComments = showAllComments ? comments : comments.slice(-2);

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition space-y-4">
      {/* 1. 頂部資訊列 (極簡化、字體不小於 14px) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="font-semibold text-gray-600 flex items-center gap-1 text-xs md:text-sm">
            {prayer.is_private || prayer.type === 'private' ? (
              <Lock className="w-3.5 h-3.5 text-purple-600" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-amber-600" />
            )}
            {prayer.is_private || prayer.type === 'private' ? '私密守望' : '公共代禱'}
          </span>
        </div>
        <div className="text-xs md:text-sm text-gray-400">
          <span>PO 文者：{prayer.author_name || prayer.profiles?.full_name || '小組肢體'}</span>
          <span className="mx-1">•</span>
          <span>{new Date(prayer.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* 2. 代禱事項標題與內容 (正文升級至 16px text-base) */}
      <div className="space-y-2">
        <h3 className="text-base md:text-lg font-bold text-gray-900 leading-snug">
          {prayer.title}
        </h3>
        <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
          {prayer.content}
        </p>

        {prayer.testimony_note && (
          <div className="bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200 text-sm text-amber-900 mt-2 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-amber-800">
              <Sparkles className="w-4 h-4 text-amber-600" /> 恩典見證補充：
            </span>
            <p className="leading-relaxed">{prayer.testimony_note}</p>
          </div>
        )}
      </div>

      {/* 3. 創作者管理按鈕 (標記蒙應允) */}
      {isCreator && prayer.status !== 'thanksgiving' && prayer.status !== 'answered' && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={() => setIsMarkAnsweredOpen(true)}
            className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-sm font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>🙌 標記禱告已蒙應允</span>
          </button>
        </div>
      )}

      {/* 4. 關懷留言區 (自然延伸不含捲軸) */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        {comments.length > 0 && (
          <div className="space-y-2.5">
            {comments.length > 2 && !showAllComments && (
              <button
                type="button"
                onClick={() => setShowAllComments(true)}
                className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 py-1"
              >
                <MessageSquare className="w-3.5 h-3.5" /> 展開其餘 {comments.length - 2} 條肢體關懷...
              </button>
            )}

            {displayedComments.map((c) => {
              const authorName = c.profiles?.full_name || c.profiles?.email?.split('@')[0] || '小組肢體';
              const commentAmens = c.comment_amens || [];
              const isCommentAmenedByMe = commentAmens.some((ca: any) => ca.user_id === currentUserId);
              return (
                <div key={c.id} className="bg-gray-50 p-3 rounded-2xl space-y-1.5 border border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span className="font-bold text-gray-800 flex items-center gap-1 text-sm">
                      <User className="w-3.5 h-3.5 text-amber-600" /> {authorName}
                    </span>
                    <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* 發表留言框 */}
        <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="寫下關懷或同心禱告文字..."
            className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={loadingComment || !newComment.trim()}
            className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1 transition shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> 發布
          </button>
        </form>

        {/* 5. 底部同心阿們按鈕 */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleAmen}
              disabled={loadingAmen}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                hasAmened
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Heart className={`w-4 h-4 ${hasAmened ? 'fill-white' : ''}`} />
              <span>{hasAmened ? '已同心阿們' : '同心阿們'}</span>
              {amenCount > 0 && (
                <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full ml-0.5">
                  {amenCount}
                </span>
              )}
            </button>
            {amenUsers.length > 0 && (
              <span className="text-xs text-amber-900 font-medium bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                🙏 {amenUsers.join('、')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 蒙應允對話框 */}
      <MarkAnsweredModal
        isOpen={isMarkAnsweredOpen}
        onClose={() => setIsMarkAnsweredOpen(false)}
        prayerId={prayer.id}
        prayerTitle={prayer.title}
        isPrivatePrayer={prayer.is_private || prayer.type === 'private'}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}