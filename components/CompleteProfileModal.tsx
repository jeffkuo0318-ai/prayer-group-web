'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  userId: string;
  defaultName: string;
  onComplete: () => void;
}

export default function CompleteProfileModal({ isOpen, userId, defaultName, onComplete }: Props) {
  const [fullName, setFullName] = useState(defaultName || '');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        group_name: groupName,
        status: 'pending', // 補填完後提交審核
      })
      .eq('id', userId);

    if (!error) {
      alert('🎉 基本資料已補充完成！已提交小組長審核。');
      onComplete();
    } else {
      alert(`更新失敗：${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-fade-in">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">歡迎使用 Google 帳號登入</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            為了方便小組長識別與守望，請補充填寫您的真實姓名與所屬小家/小組：
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">真實姓名</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="請輸入您的真實姓名"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">所屬小家 / 小組</label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="例如：國華雅萍小家、喜樂小組"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition shadow-md"
          >
            {loading ? '儲存中...' : '確認送出資料'}
          </button>
        </form>
      </div>
    </div>
  );
}