'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Copy, Check } from 'lucide-react';

export default function ProverbsBanner() {
  const [proverb, setProverb] = useState<{ chapter: number; verse: number; content: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // 讀取隨機箴言經文
  const fetchRandomProverb = async () => {
    const { data, error } = await supabase.rpc('get_random_proverb');
    if (!error && data && data.length > 0) {
      setProverb(data[0]);
    }
  };

  useEffect(() => {
    fetchRandomProverb();
  }, []);

  // 複製經文至剪貼簿
  const copyProverb = () => {
    if (!proverb) return;
    navigator.clipboard.writeText(`【箴言 ${proverb.chapter}:${proverb.verse}】${proverb.content}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!proverb) return <div className="p-4 text-center text-gray-400 text-sm">載入今日經文中...</div>;

  return (
    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-sm my-4 relative max-w-xl mx-auto">
      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
        今日箴言靈糧
      </span>
      <blockquote className="mt-3 text-base sm:text-lg font-medium text-gray-800 italic">
        「{proverb.content}」
      </blockquote>
      <p className="mt-2 text-right text-xs sm:text-sm font-semibold text-amber-900">
        —— 箴言 {proverb.chapter}:{proverb.verse}
      </p>
      <div className="mt-3 flex justify-end gap-3 text-xs">
        <button onClick={fetchRandomProverb} className="flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium">
          <RefreshCw className="w-3.5 h-3.5" /> 換一節
        </button>
        <button onClick={copyProverb} className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 transition">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '已複製' : '複製經文'}
        </button>
      </div>
    </div>
  );
}