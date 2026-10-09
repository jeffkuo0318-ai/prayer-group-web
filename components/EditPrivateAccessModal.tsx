'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Lock, Users, Check, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prayer: any;
  currentUserId: string;
  onSuccess: () => void;
}

export default function EditPrivateAccessModal({
  isOpen,
  onClose,
  prayer,
  currentUserId,
  onSuccess,
}: Props) {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && prayer) {
      // 載入該事項原本設定的允許肢體名單
      setSelectedUserIds(Array.isArray(prayer.allowed_user_ids) ? prayer.allowed_user_ids : []);

      const fetchMembers = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, group_name')
          .eq('status', 'approved')
          .order('full_name', { ascending: true });

        if (data) {
          // 排除發起者本人
          const otherMembers = data.filter((m) => m.id !== currentUserId);
          setMembers(otherMembers);
        }
      };

      fetchMembers();
    }
  }, [isOpen, prayer, currentUserId]);

  if (!isOpen || !prayer) return null;

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('prayers')
      .update({
        type: 'private',
        allowed_user_ids: selectedUserIds,
      })
      .eq('id', prayer.id);

    if (!error) {
      alert('🔒 已成功轉換為私密代禱，並更新肢體檢視權限！');
      onSuccess();
      onClose();
    } else {
      alert(`更新失敗：${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-1.5">
            <Lock className="w-5 h-5 text-purple-600" /> 設定私密代禱參與肢體
          </h2>
          <p className="text-xs text-gray-500 truncate px-4">
            主題：「{prayer.title}」
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-900 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                勾選可加入守望的肢體 ({selectedUserIds.length} 人)
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[10px] text-purple-700 font-bold hover:underline"
              >
                {selectedUserIds.length === members.length ? '取消全選' : '全選成員'}
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 bg-white p-2 rounded-xl border border-purple-100">
              {members.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-4">
                  尚無可勾選的其他小組成員
                </p>
              ) : (
                members.map((m) => {
                  const isSelected = selectedUserIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleSelectUser(m.id)}
                      className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition ${
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl transition text-xs"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-1/2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 text-xs"
            >
              <Save className="w-4 h-4" />
              {loading ? '儲存中...' : '確認轉換並儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}