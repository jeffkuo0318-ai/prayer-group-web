'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Flame, Globe, Lock, Send, Users, Check, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onSuccess: () => void;
}

export default function CreatePrayerModal({
  isOpen,
  onClose,
  currentUserId,
  onSuccess,
}: Props) {
  const [type, setType] = useState<'public' | 'private'>('public');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [prayerStatus, setPrayerStatus] = useState<'active' | 'thanksgiving' | 'urgent'>('active');
  const [canLeaderView, setCanLeaderView] = useState(true);
  const [loading, setLoading] = useState(false);

  // 小組成員清單與被選中的肢體 ID 陣列
  const [members, setMembers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchMembers = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, group_name')
          .eq('status', 'approved')
          .order('full_name', { ascending: true });

        if (data) {
          const otherMembers = data.filter((m) => m.id !== currentUserId);
          setMembers(otherMembers);
        }
      };

      fetchMembers();
    }
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const toggleSelectUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === members.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(members.map((m) => m.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !currentUserId) return;

    setLoading(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', currentUserId)
      .single();

    const authorName =
      profile?.full_name || profile?.email?.split('@')[0] || '小組肢體';

    const { error } = await supabase.from('prayers').insert({
      creator_id: currentUserId,
      author_name: authorName,
      type,
      title: title.trim(),
      content: content.trim(),
      status: prayerStatus,
      can_leader_view: canLeaderView,
      allowed_user_ids: type === 'private' ? selectedUserIds : [],
    });

    if (!error) {
      alert('🎉 事項已成功發布！');
      setTitle('');
      setContent('');
      setPrayerStatus('active');
      setSelectedUserIds([]);
      onSuccess();
      onClose();
    } else {
      alert(`發布失敗：${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-fade-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-gray-800">🙏 發起代禱與感恩事項</h2>
          <p className="text-xs text-gray-500">
            分享您的需要或獻上感恩見證，讓小組肢體同心守望
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. 公開 / 私密切換 */}
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setType('public')}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                type === 'public'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Globe className="w-4 h-4" /> 公共代禱
            </button>
            <button
              type="button"
              onClick={() => setType('private')}
              className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                type === 'private'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-white/50'
              }`}
            >
              <Lock className="w-4 h-4" /> 私密代禱
            </button>
          </div>

          {/* 2. 事項狀態選擇 (禱告中 / 獻上感恩 / 迫切緊急) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              選擇發起類型
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPrayerStatus('active')}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  prayerStatus === 'active'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>🔥 禱告中</span>
              </button>

              <button
                type="button"
                onClick={() => setPrayerStatus('thanksgiving')}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  prayerStatus === 'thanksgiving'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>🙌 獻上感恩</span>
              </button>

              <button
                type="button"
                onClick={() => setPrayerStatus('urgent')}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1 ${
                  prayerStatus === 'urgent'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>⚡ 迫切緊急</span>
              </button>
            </div>
          </div>

          {/* 3. 私密代禱指定肢體 */}
          {type === 'private' && (
            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-900 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  指定可加入此私禱的肢體 ({selectedUserIds.length} 人)
                </label>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[10px] text-purple-700 font-bold hover:underline"
                >
                  {selectedUserIds.length === members.length ? '取消全選' : '全選成員'}
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-white p-2 rounded-xl border border-purple-100">
                {members.length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-2">
                    尚無其他可勾選的成員
                  </p>
                ) : (
                  members.map((m) => {
                    const isSelected = selectedUserIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleSelectUser(m.id)}
                        className={`p-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-purple-100/80 text-purple-900 font-bold'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className="truncate">
                          {m.full_name || m.email?.split('@')[0]} ({m.group_name || '小組'})
                        </span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 4. 標題與內文 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              主題
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="請簡述主題..."
              className="w-full border rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              詳細內容 / 見證內文
            </label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="詳細分享您的需要或神做成的美事見證..."
              className="w-full border rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* 5. 私密選項 */}
          {type === 'private' && (
            <div className="flex items-center justify-between text-xs text-gray-600 bg-purple-50 p-2.5 rounded-2xl border border-purple-100">
              <span>允許小組長/牧者守望檢視</span>
              <input
                type="checkbox"
                checked={canLeaderView}
                onChange={(e) => setCanLeaderView(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 text-sm"
          >
            <Send className="w-4 h-4" />
            {loading ? '發布中...' : '發布事項'}
          </button>
        </form>
      </div>
    </div>
  );
}