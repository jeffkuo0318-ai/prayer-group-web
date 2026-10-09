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
  User
} from 'lucide-react';

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

  const [members, setMembers] = useState<any[]>([]);
  const isCreator = prayer.creator_id === currentUserId;

  // 1. 讀取主代禱事項阿們名單
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

  // 2. 讀取留言紀錄與專屬阿們
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
      } else if (error) {
        console.error('Fetch comments error:', error.message);
      }
    } catch (e) {
      console.error('Error fetching comments:', e);
    }
  };

  // 3. 讀取小組成員 (供創作者一鍵無痕排除)
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

  // 點擊 / 取消 主代禱事項阿們
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

  // 點擊 / 取消 單一留言的阿們 (LINE 式回應按讚)
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

  // 送出新關懷留言 (含明確錯誤警示)
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
      alert(`留言發表失敗：${error.message}`);
      console.error('Comment insert error:', error);
    }
    setLoadingComment(false);
  };

  // 創作者點擊成員姓名：一鍵轉私禱並無痕排除該員
  const handleExcludeUser = async (targetUserId: string, targetUserName: string) => {
    if (!isCreator) return;

    if (
      !confirm(
        `確定要在此事項中排除「${targetUserName}」嗎？\n此事項將自動轉為私密代禱，且對方將完全無法察覺或檢視此內容。`
      )
    )
      return;

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
        allowed_user_ids: updatedAllowedIds,
      })
      .eq('id', prayer.id);

    if (!error) {
      alert(`🔒 已無痕排除「${targetUserName}」，此事項已轉為私密代禱。`);
      window.location.reload();
    } else {
      alert(`排除失敗：${error.message}`);
    }
  };

  // 計算目前可查看此事項的肢體清單
  const visibleMembers = members.filter((m) => {
    if (m.id === prayer.creator_id) return false;
    if (prayer.type === 'public') return true;
    return Array.isArray(prayer.allowed_user_ids) && prayer.allowed_user_ids.includes(m.id);
  });

  // 狀態標籤樣式
  const getStatusBadge = () => {
    switch (prayer.status) {
      case 'urgent':
        return (
          <span className="bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <Flame className="w-3 h-3" /> 迫切緊急
          </span>
        );
      case 'answered':
        return (
          <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <CheckCircle className="w-3 h-3" /> 蒙應允
          </span>
        );
      case 'thanksgiving':
        return (
          <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <Sparkles className="w-3 h-3" /> 獻上感恩
          </span>
        );
      default:
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
            禱告中
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition space-y-3">
      {/* 1. 頂部資訊列 */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="font-semibold text-gray-500 flex items-center gap-1 text-[11px]">
            {prayer.type === 'private' ? (
              <Lock className="w-3 h-3 text-purple-600" />
            ) : (
              <Globe className="w-3 h-3 text-amber-600" />
            )}
            {prayer.type === 'private' ? '私密守望' : '公共代禱'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span>{new Date(prayer.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span>PO 文者：{prayer.author_name || prayer.profiles?.full_name || '小組肢體'}</span>
        </div>
      </div>

      {/* 2. 代禱事項標題與內容 */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-gray-900 leading-snug">
          {prayer.title}
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
          {prayer.content}
        </p>
      </div>

      {/* 3. 創作者專屬：可檢視成員列表 & 點擊名字一鍵無痕排除 */}
      {isCreator && (
        <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-2.5 text-[11px] space-y-1">
          <div className="flex items-center justify-between text-gray-500 font-bold">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              目前參與此事項的肢體 ({visibleMembers.length} 人)
            </span>
            <span className="text-[10px] text-gray-400">💡 點擊成員姓名可一鍵無痕剔除</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {visibleMembers.length === 0 ? (
              <span className="text-gray-400 text-[10px]">無其他成員（僅您本人可見）</span>
            ) : (
              visibleMembers.map((m) => {
                const name = m.full_name || m.email?.split('@')[0];
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleExcludeUser(m.id, name)}
                    className="bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-gray-200 px-2 py-0.5 rounded-lg text-gray-700 font-medium transition flex items-center gap-1 group shadow-2xs"
                    title={`點擊一鍵無痕排除 ${name}`}
                  >
                    <span>{name}</span>
                    <UserX className="w-3 h-3 text-gray-400 group-hover:text-red-500" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. 關懷留言區 */}
      <div className="space-y-2.5 pt-2 border-t border-gray-100">
        {/* 歷史留言列表 */}
        {comments.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {comments.map((c) => {
              const authorName =
                c.profiles?.full_name ||
                c.profiles?.email?.split('@')[0] ||
                '小組肢體';

              const commentAmens = c.comment_amens || [];
              const commentAmenUsers = commentAmens.map((ca: any) =>
                ca.profiles?.full_name || ca.profiles?.email?.split('@')[0] || '肢體'
              );
              const isCommentAmenedByMe = commentAmens.some(
                (ca: any) => ca.user_id === currentUserId
              );

              return (
                <div
                  key={c.id}
                  className="bg-gray-50/80 p-2.5 rounded-xl space-y-1.5 text-xs border border-gray-100 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 flex items-center gap-1 text-[11px]">
                      <User className="w-3 h-3 text-amber-600" />
                      {authorName}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-gray-700 text-[11px] leading-relaxed pl-4 pr-12">
                    {c.content}
                  </p>

                  <div className="flex items-center justify-between pt-1 pl-4 text-[10px]">
                    {commentAmenUsers.length > 0 ? (
                      <span className="text-amber-800 font-medium bg-amber-100/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span>🙏</span>
                        <span>{commentAmenUsers.join('、')}</span>
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleCommentAmen(c.id, isCommentAmenedByMe)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition font-semibold ${
                        isCommentAmenedByMe
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                      }`}
                      title="對此留言回應阿們"
                    >
                      <Heart className={`w-3 h-3 ${isCommentAmenedByMe ? 'fill-white' : ''}`} />
                      <span>阿們</span>
                      {commentAmens.length > 0 && <span>{commentAmens.length}</span>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 發表關懷留言輸入框 */}
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="寫下您的關懷或守望文字..."
            className="flex-grow bg-gray-50 border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={loadingComment || !newComment.trim()}
            className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
          >
            <Send className="w-3 h-3" />
            {loadingComment ? '發布中...' : '發布'}
          </button>
        </form>

        {/* 5. 底部：主代禱事項阿們按鈕 */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleToggleAmen}
              disabled={loadingAmen}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                hasAmened
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${hasAmened ? 'fill-white' : ''}`} />
              <span>{hasAmened ? '已同心阿們' : '同心阿們'}</span>
              {amenCount > 0 && (
                <span className="text-[10px] bg-white/30 px-1.5 rounded-full">
                  {amenCount}
                </span>
              )}
            </button>

            {amenUsers.length > 0 && (
              <span className="text-[11px] text-amber-800 font-medium bg-amber-50/60 px-2.5 py-1 rounded-xl border border-amber-100">
                🙏 {amenUsers.join('、')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}