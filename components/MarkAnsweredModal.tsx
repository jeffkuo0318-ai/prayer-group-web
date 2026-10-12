'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Globe, Lock, X, CheckCircle2, HeartHandshake } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prayerId: string;
  prayerTitle: string;
  isPrivatePrayer: boolean; // 是否原本是私密代禱
  onSuccess: () => void;
}

export default function MarkAnsweredModal({
  isOpen,
  onClose,
  prayerId,
  prayerTitle,
  isPrivatePrayer,
  onSuccess,
}: Props) {
  const [sharePublicly, setSharePublicly] = useState(isPrivatePrayer); // 若原本是私密代禱，預設建議轉公開分享
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [testimonyUpdate, setTestimonyUpdate] = useState(''); // 可選：補填神的恩典與回應
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 根據使用者的選擇，更新代禱事項狀態與隱私設定
    const updateData: Record<string, any> = {
      status: 'thanksgiving', // 狀態轉為「獻上感恩 / 蒙應允」
      updated_at: new Date().toISOString(),
    };

    // 如果使用者選擇公開分享
    if (sharePublicly) {
      updateData.is_private = false;
      updateData.type = 'public';
    }

    // 如果選擇匿名公開
    if (isAnonymous) {
      updateData.author_name = '匿名肢體';
    }

    // 如果有填寫補充見證內文，可將內文更新或附加
    if (testimonyUpdate.trim()) {
      updateData.testimony_note = testimonyUpdate.trim();
    }

    const { error } = await supabase
      .from('prayers')
      .update(updateData)
      .eq('id', prayerId);

    if (!error) {
      alert('🙌 哈利路亞！已記錄蒙應允見證！');
      onSuccess();
      onClose();
    } else {
      alert(`更新失敗：${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 標題與圖示 */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">🙌 感謝神！禱告已蒙應允</h2>
          <p className="text-xs text-gray-500 leading-relaxed px-2">
            「你要頌讚耶和華，不可忘記祂的一切恩惠。」<br />
            為《<span className="font-semibold text-amber-700">{prayerTitle}</span>》獻上感恩
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 授權公開選項 */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-gray-700">
              請選擇見證分享方式：
            </label>

            <div
              onClick={() => setSharePublicly(true)}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                sharePublicly
                  ? 'border-amber-500 bg-amber-50/60 shadow-sm'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${sharePublicly ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">公開分享為感恩見證</span>
                  {sharePublicly && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-xs text-gray-500">
                  轉為公開卡片，讓小組肢體一同看見神的作為並數算恩典。
                </p>
              </div>
            </div>

            <div
              onClick={() => setSharePublicly(false)}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                !sharePublicly
                  ? 'border-purple-600 bg-purple-50/60 shadow-sm'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 ${!sharePublicly ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">保持私密（僅記錄蒙應允）</span>
                  {!sharePublicly && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                </div>
                <p className="text-xs text-gray-500">
                  僅將狀態設為蒙應允，內容依然只有您與關懷同工可見。
                </p>
              </div>
            </div>
          </div>

          {/* 匿名勾選（僅當選擇公開時顯示） */}
          {sharePublicly && (
            <div className="flex items-center justify-between bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900">
              <span className="flex items-center gap-1.5 font-medium">
                <HeartHandshake className="w-4 h-4 text-amber-600" />
                以「匿名肢體」發布見證
              </span>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>
          )}

          {/* 補充神的恩典見證 (選填) */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-600">
              補充恩典見證 (選填)
            </label>
            <textarea
              rows={2}
              value={testimonyUpdate}
              onChange={(e) => setTestimonyUpdate(e.target.value)}
              placeholder="簡短分享神是如何為您成就的..."
              className="w-full border rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* 按鈕 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl transition text-xs"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl transition shadow-md text-xs flex items-center justify-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? '更新中...' : '確認標記蒙應允'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}