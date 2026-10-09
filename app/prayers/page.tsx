'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PrayerCard from '@/components/PrayerCard';
import CreatePrayerModal from '@/components/CreatePrayerModal';
import CompleteProfileModal from '@/components/CompleteProfileModal';
import EditPrivateAccessModal from '@/components/EditPrivateAccessModal';
import {
  Plus,
  Home,
  ShieldCheck,
  ListTodo,
  Check,
  Flame,
  Globe,
  Lock,
  Sparkles,
  ArrowRight,
  Trash2,
  ShieldAlert,
  HeartHandshake,
  ArrowLeft,
  User,
  Calendar,
  ChevronRight,
  X,
  MessageSquareHeart
} from 'lucide-react';
import Link from 'next/link';

export default function PrayersPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'public' | 'private' | 'urgent' | 'thanksgiving'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'public' | 'private'>('all');
  
  // 「禱告中」儀表板點擊對話框
  const [showActiveTypeModal, setShowActiveTypeModal] = useState(false);

  // 聚焦檢視的單一代禱事項 ID
  const [selectedSinglePrayerId, setSelectedSinglePrayerId] = useState<string | null>(null);

  // 欲設定私密成員的事項物件 (開啟 EditPrivateAccessModal 彈窗)
  const [editingPrivatePrayer, setEditingPrivatePrayer] = useState<any | null>(null);

  // 動態牆與全數清單
  const [prayers, setPrayers] = useState<any[]>([]);
  const [allPrayersList, setAllPrayersList] = useState<any[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [canAccessPrivate, setCanAccessPrivate] = useState<boolean>(false);
  
  // 禱告發布彈窗控制
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfileName, setUserProfileName] = useState('');

  const [counts, setCounts] = useState({
    active: 0,
    answered: 0,
    thanksgiving: 0,
    urgent: 0,
  });

  // 1. 權限驗證與個人資料讀取
  useEffect(() => {
    const checkUserPermission = async () => {
      // 改用 getSession，讀取速度更快且不干擾 Server
      let { data: { session } } = await supabase.auth.getSession();

      // 若初次讀取未拿到 Session，緩衝 1 秒供 Storage 寫入
      if (!session?.user) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const { data: { session: recheckSession } } = await supabase.auth.getSession();
        session = recheckSession;
      }

      const user = session?.user;

      if (!user) {
        console.warn('❌ 找不到有效的登入 Session');
        window.location.href = '/login';
        return;
      }

      setCurrentUserId(user.id);

      // 讀取 Profile 資料（使用 maybeSingle 避免找不到資料時拋出例外）
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('status, group_name, full_name, role, can_access_private')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('讀取 Profile 發生錯誤：', error);
      }

      // 關鍵診斷 1：若 profiles 表格查不到此 Google 帳號 ID
      if (!profile) {
        alert(`您的 Google 帳號登入成功，但資料庫 profiles 表格中尚未建立您的 ID：\n${user.id}\n\n請將此 ID 新增至 profiles 資料表即可通過驗證！`);
        window.location.href = '/login';
        return;
      }

      // 關鍵診斷 2：若 status 不是 approved
      if (profile.status !== 'approved') {
        alert(`您的帳號狀態為「${profile.status}」，尚未通過審核！`);
        window.location.href = '/login';
        return;
      }

      // 通過驗證，寫入 State
      setUserProfileName(profile.full_name ?? '');
      setUserRole(profile.role ?? '');
      setCanAccessPrivate(profile.can_access_private ?? false);
    };

    checkUserPermission();
  }, []);

      setCurrentUserId(user.id);
      setUserRole(profile.role || 'member');
      setCanAccessPrivate(!!profile.can_access_private);

      if (!profile.group_name || profile.group_name === '未指定小組' || profile.group_name === '未分配小組') {
        setUserProfileName(profile.full_name || '');
        setShowProfileModal(true);
      }
    };

    checkUserPermission();
  }, []);

  // 2. 讀取代禱與感恩清單 (包含右側總覽清單與動態牆精準隔離)
  const loadPrayersAndDashboard = async (targetStatusFilter?: string) => {
    if (!currentUserId) return;

    const currentFilter = targetStatusFilter !== undefined ? targetStatusFilter : statusFilter;

    const { data: allPrayers } = await supabase
      .from('prayers')
      .select('*')
      .order('created_at', { ascending: false });

    const isLeaderOrAdmin = [
      'admin',
      'developer',
      'leader',
      'group_leader',
      '小組長',
      '小家長'
    ].includes(userRole);

    // 🔒 創作者與私禱絕對隱私隔離白名單
    const permissionFilteredPrayers = (allPrayers || []).filter((p) => {
      if (p.type === 'private') {
        const isCreator = p.creator_id === currentUserId;
        const isSpecificallyAllowed =
          Array.isArray(p.allowed_user_ids) && p.allowed_user_ids.includes(currentUserId);

        return isCreator || isSpecificallyAllowed || isLeaderOrAdmin;
      }
      return true;
    });

    // 計算 Lapis 藍儀表板概況數據
    setCounts({
      active: permissionFilteredPrayers.filter((p) => p.status === 'active').length,
      answered: permissionFilteredPrayers.filter((p) => p.status === 'answered').length,
      thanksgiving: permissionFilteredPrayers.filter((p) => p.status === 'thanksgiving').length,
      urgent: permissionFilteredPrayers.filter((p) => p.status === 'urgent').length,
    });

    // 右側代禱事項總覽清單過濾邏輯：
    let sideList = permissionFilteredPrayers;

    if (activeTab === 'all') {
      if (currentFilter === 'all') {
        // 全部代禱右側清單：排除「已蒙應允」與「感恩事項」
        sideList = permissionFilteredPrayers.filter((p) => p.status !== 'answered' && p.status !== 'thanksgiving');
      } else if (currentFilter === 'active') {
        sideList = permissionFilteredPrayers.filter((p) => p.status === 'active');
        if (typeFilter !== 'all') sideList = sideList.filter((p) => p.type === typeFilter);
      } else if (currentFilter === 'urgent') {
        sideList = permissionFilteredPrayers.filter((p) => p.status === 'urgent');
      } else if (currentFilter === 'answered') {
        sideList = permissionFilteredPrayers.filter((p) => p.status === 'answered');
      }
    } else if (activeTab === 'public') {
      sideList = permissionFilteredPrayers.filter(
        (p) => p.type === 'public' && p.status !== 'answered' && p.status !== 'thanksgiving'
      );
    } else if (activeTab === 'private') {
      sideList = permissionFilteredPrayers.filter(
        (p) => p.type === 'private' && p.status !== 'answered' && p.status !== 'thanksgiving'
      );
    } else if (activeTab === 'urgent') {
      sideList = permissionFilteredPrayers.filter(
        (p) => p.status === 'urgent' && p.status !== 'answered' && p.status !== 'thanksgiving'
      );
    } else if (activeTab === 'thanksgiving') {
      sideList = permissionFilteredPrayers.filter((p) => p.status === 'thanksgiving');
    }

    setAllPrayersList(sideList);

    // 🌟 左側「禱告牆」各分頁直覺資料過濾：
    let wallPrayers = permissionFilteredPrayers;

    if (activeTab === 'all') {
      if (currentFilter === 'all') {
        // 全部代禱：排除「已蒙應允」與「感恩事項」
        wallPrayers = permissionFilteredPrayers.filter(
          (p) => p.status !== 'answered' && p.status !== 'thanksgiving'
        );
      } else if (currentFilter === 'urgent') {
        wallPrayers = permissionFilteredPrayers.filter((p) => p.status === 'urgent');
      } else if (currentFilter === 'active') {
        wallPrayers = permissionFilteredPrayers.filter((p) => p.status === 'active');
        if (typeFilter !== 'all') {
          wallPrayers = wallPrayers.filter((p) => p.type === typeFilter);
        }
      } else if (currentFilter === 'answered') {
        wallPrayers = permissionFilteredPrayers.filter((p) => p.status === 'answered');
      }
    } else if (activeTab === 'public') {
      // 一般公禱：直接列出所有公共代禱（排除蒙應允與感恩）
      wallPrayers = permissionFilteredPrayers.filter(
        (p) => p.type === 'public' && p.status !== 'answered' && p.status !== 'thanksgiving'
      );
    } else if (activeTab === 'private') {
      // 私密代禱：直接列出所有獲授權的私密代禱（排除蒙應允與感恩）
      wallPrayers = permissionFilteredPrayers.filter(
        (p) => p.type === 'private' && p.status !== 'answered' && p.status !== 'thanksgiving'
      );
    } else if (activeTab === 'urgent') {
      // 迫切緊急：直接列出所有迫切緊急事項（排除蒙應允與感恩）
      wallPrayers = permissionFilteredPrayers.filter(
        (p) => p.status === 'urgent' && p.status !== 'answered' && p.status !== 'thanksgiving'
      );
    } else if (activeTab === 'thanksgiving') {
      // 感恩見證牆：直覺列出所有感恩事項
      wallPrayers = permissionFilteredPrayers.filter((p) => p.status === 'thanksgiving');
    }

    setPrayers(wallPrayers);
  };

  useEffect(() => {
    if (currentUserId) {
      loadPrayersAndDashboard();
    }
  }, [activeTab, statusFilter, typeFilter, currentUserId, canAccessPrivate, userRole]);

  // 3. 點擊某一代禱/感恩事項：切換至對應屬性分頁，並單獨聚焦顯示
  const handleFocusSinglePrayer = (prayer: any) => {
    let targetTab: 'public' | 'private' | 'urgent' | 'thanksgiving' = 'public';
    
    if (prayer.status === 'thanksgiving') {
      targetTab = 'thanksgiving';
    } else if (prayer.status === 'urgent') {
      targetTab = 'urgent';
    } else if (prayer.type === 'private') {
      targetTab = 'private';
    } else {
      targetTab = 'public';
    }

    setActiveTab(targetTab);
    setSelectedSinglePrayerId(prayer.id);
    setHighlightedId(prayer.id);
    setStatusFilter('all');

    setTimeout(() => {
      const el = document.getElementById(`prayer-card-${prayer.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // 4. 手動點擊頂部 Tab 分頁：切換分頁並清空聚焦，列出該分頁所有列表
  const handleTabChange = (tab: 'all' | 'public' | 'private' | 'urgent' | 'thanksgiving') => {
    setActiveTab(tab);
    setStatusFilter('all');
    setTypeFilter('all');
    setSelectedSinglePrayerId(null);
  };

  // 5. 點擊儀表板【🔥 禱告中】 -> 跳出對話框選公禱或私禱
  const handleActiveDashboardClick = () => {
    setShowActiveTypeModal(true);
  };

  // 在「禱告中」對話框選擇公禱或私禱
  const handleSelectActiveType = (type: 'public' | 'private') => {
    setActiveTab('all');
    setStatusFilter('active');
    setTypeFilter(type);
    setSelectedSinglePrayerId(null);
    setShowActiveTypeModal(false);
  };

  // 點擊儀表板【⚡ 迫切緊急】 -> 於「全部代禱」列出緊急事項
  const handleUrgentDashboardClick = () => {
    setActiveTab('all');
    setStatusFilter('urgent');
    setTypeFilter('all');
    setSelectedSinglePrayerId(null);
  };

  // 點擊儀表板【🌱 蒙應允】 -> 於「全部代禱」列出蒙應允事項
  const handleAnsweredDashboardClick = () => {
    setActiveTab('all');
    setStatusFilter('answered');
    setTypeFilter('all');
    setSelectedSinglePrayerId(null);
  };

  // 6. 勾選/取消【蒙應允】 (權限控管：僅限發起人、小組長、管理員/開發者)
  const togglePrayerCompletion = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();

    const isCreator = item.creator_id === currentUserId;
    const isLeaderOrAdmin = [
      'admin',
      'developer',
      'leader',
      'group_leader',
      '小組長',
      '小家長'
    ].includes(userRole);

    if (!isCreator && !isLeaderOrAdmin) {
      alert('⚠️ 權限限制：僅有「禱告發起人」、「小組長/小家長」或「系統管理員」可以點擊標記蒙應允。');
      return;
    }

    const isCurrentlyAnswered = item.status === 'answered';
    const newStatus = isCurrentlyAnswered ? 'active' : 'answered';

    const { error } = await supabase
      .from('prayers')
      .update({ status: newStatus })
      .eq('id', item.id);

    if (!error) {
      await loadPrayersAndDashboard();
      setHighlightedId(item.id);
    } else {
      alert(`狀態更新失敗：${error.message}`);
    }
  };

  // 轉為/取消【獻上感恩】
  const toggleThanksgivingStatus = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCurrentlyThanksgiving = item.status === 'thanksgiving';
    const newStatus = isCurrentlyThanksgiving ? 'active' : 'thanksgiving';

    const { error } = await supabase
      .from('prayers')
      .update({ status: newStatus })
      .eq('id', item.id);

    if (!error) {
      await loadPrayersAndDashboard();
    } else {
      alert(`更新失敗：${error.message}`);
    }
  };

  // 切換迫切緊急
  const toggleUrgentStatus = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = item.status === 'urgent' ? 'active' : 'urgent';

    const { error } = await supabase
      .from('prayers')
      .update({ status: newStatus })
      .eq('id', item.id);

    if (!error) {
      await loadPrayersAndDashboard();
    } else {
      alert(`更新失敗：${error.message}`);
    }
  };

  // 7. 轉為私禱 (開啟成員選單) 或 切換為公禱
  const handleMoveToPrivate = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();

    if (item.type !== 'private') {
      setEditingPrivatePrayer(item);
    } else {
      if (!confirm(`確定要將此私密代禱「${item.title}」轉為【公開代禱】嗎？`)) return;

      const { error } = await supabase
        .from('prayers')
        .update({ type: 'public', allowed_user_ids: [] })
        .eq('id', item.id);

      if (!error) {
        await loadPrayersAndDashboard();
      } else {
        alert(`轉置失敗：${error.message}`);
      }
    }
  };

  // 8. 刪除事項
  const handleDeletePrayer = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`⚠️ 確定要刪除事項「${item.title}」嗎？此操作無法復原。`)) return;

    const { error } = await supabase
      .from('prayers')
      .delete()
      .eq('id', item.id);

    if (!error) {
      if (selectedSinglePrayerId === item.id) {
        setSelectedSinglePrayerId(null);
      }
      await loadPrayersAndDashboard();
    } else {
      alert(`刪除失敗：${error.message}`);
    }
  };

  // 計算單一獨佔顯示的代禱/感恩事項
  const singleFocusedPrayer = prayers.find((p) => p.id === selectedSinglePrayerId);

  return (
    <main className="min-h-screen bg-gray-50/70 p-3 sm:p-5 lg:p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* 頂部頁頭 */}
        <div className="bg-white border rounded-2xl p-3 sm:p-4 shadow-sm flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-amber-600 bg-gray-50 border px-3 py-1.5 rounded-xl transition"
          >
            <Home className="w-3.5 h-3.5" /> 返回首頁
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-1.5">
            🙏 代禱與守望感恩中心
          </h1>
          <Link
            href="/admin/audit"
            className="text-xs text-amber-800 bg-amber-100/80 border border-amber-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 hover:bg-amber-200 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> 管理後台
          </Link>
        </div>

        {/* 💙 Lapis 瑠璃藍 全網概況儀表板 */}
        <div className="bg-[#1a4b84] border border-blue-800/90 rounded-2xl p-3.5 shadow-md space-y-2 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-blue-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> 全網守望狀態概況
            </h2>
            <span className="text-[10px] text-blue-200/90 font-medium">點擊數字卡片可快速過濾顯示</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. 禱告中 */}
            <button
              onClick={handleActiveDashboardClick}
              className={`p-2.5 rounded-xl text-center border transition flex items-center justify-between ${
                statusFilter === 'active' && activeTab === 'all'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-300'
                  : 'bg-white/90 border-blue-200/60 hover:bg-white text-amber-950 shadow-2xs'
              }`}
            >
              <span className="text-xs font-bold opacity-90">🔥 禱告中</span>
              <span className="text-base font-black">{counts.active}</span>
            </button>

            {/* 2. 蒙應允 */}
            <button
              onClick={handleAnsweredDashboardClick}
              className={`p-2.5 rounded-xl text-center border transition flex items-center justify-between ${
                statusFilter === 'answered' && activeTab === 'all'
                  ? 'bg-green-600 text-white border-green-600 shadow-sm ring-2 ring-green-300'
                  : 'bg-white/90 border-blue-200/60 hover:bg-white text-green-950 shadow-2xs'
              }`}
            >
              <span className="text-xs font-bold opacity-90">🌱 蒙應允</span>
              <span className="text-base font-black">{counts.answered}</span>
            </button>

            {/* 3. 獻上感恩 */}
            <button
              onClick={() => handleTabChange('thanksgiving')}
              className={`p-2.5 rounded-xl text-center border transition flex items-center justify-between ${
                activeTab === 'thanksgiving'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-300'
                  : 'bg-white/90 border-blue-200/60 hover:bg-white text-purple-950 shadow-2xs'
              }`}
            >
              <span className="text-xs font-bold opacity-90">🙌 獻上感恩</span>
              <span className="text-base font-black">{counts.thanksgiving}</span>
            </button>

            {/* 4. 迫切緊急 */}
            <button
              onClick={handleUrgentDashboardClick}
              className={`p-2.5 rounded-xl text-center border transition flex items-center justify-between ${
                statusFilter === 'urgent' && activeTab === 'all'
                  ? 'bg-red-600 text-white border-red-600 shadow-sm ring-2 ring-red-300'
                  : 'bg-white/90 border-blue-200/60 hover:bg-white text-red-950 shadow-2xs'
              }`}
            >
              <span className="text-xs font-bold opacity-90">⚡ 迫切緊急</span>
              <span className="text-base font-black">{counts.urgent}</span>
            </button>
          </div>
        </div>

        {/* 主區域 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* 【左側】：主禱告牆 */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-3.5">

            {/* 🌟 醒目名稱標題：禱告牆 */}
            <div className="flex items-center justify-between px-1 pt-1">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-800 flex items-center gap-2">
                <MessageSquareHeart className="w-5 h-5 text-amber-500 fill-amber-100" />
                <span>禱告牆</span>
              </h2>
              <span className="text-[11px] text-gray-400 font-medium">點擊事項可展開內容與參與留言</span>
            </div>

            {/* 主頁籤選單 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-white p-1.5 rounded-2xl border shadow-sm text-xs font-bold">
              <button
                onClick={() => handleTabChange('all')}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 ${
                  activeTab === 'all' && statusFilter === 'all' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                全部代禱
              </button>

              <button
                onClick={() => handleTabChange('public')}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 ${
                  activeTab === 'public' && statusFilter === 'all' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> 一般公禱
              </button>

              <button
                onClick={() => handleTabChange('private')}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 ${
                  activeTab === 'private' && statusFilter === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> 私密代禱
              </button>

              <button
                onClick={() => handleTabChange('urgent')}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 ${
                  activeTab === 'urgent' && statusFilter === 'all' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Flame className="w-3.5 h-3.5" /> 迫切緊急
              </button>

              <button
                onClick={() => handleTabChange('thanksgiving')}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 col-span-2 sm:col-span-1 ${
                  activeTab === 'thanksgiving' ? 'bg-purple-700 text-white shadow-md ring-2 ring-purple-300' : 'text-purple-800 bg-purple-50/70 hover:bg-purple-100'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" /> 感恩見證牆
              </button>
            </div>

            {/* 單一聚焦模式提示與返回列 */}
            {selectedSinglePrayerId && (
              <div className="bg-amber-500 text-white p-2.5 rounded-2xl shadow-sm flex items-center justify-between text-xs font-bold animate-fade-in">
                <span className="flex items-center gap-1.5">
                  ✨ 目前檢視單一事項中（可於下方留言與同心阿們）
                </span>
                <button
                  onClick={() => setSelectedSinglePrayerId(null)}
                  className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-xl font-extrabold flex items-center gap-1 shadow-sm transition text-[11px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> 返回完整列表
                </button>
              </div>
            )}

            {/* 過濾狀態提示與重置列 */}
            {!selectedSinglePrayerId && statusFilter !== 'all' && (
              <div className="bg-amber-500 text-white p-2.5 rounded-2xl shadow-sm flex items-center justify-between text-xs font-bold animate-fade-in">
                <span className="flex items-center gap-1.5">
                  ✨ 目前篩選：{statusFilter === 'urgent' ? '⚡ 迫切緊急事項' : statusFilter === 'answered' ? '🌱 蒙應允事項' : typeFilter === 'private' ? '🔒 私密代禱中' : '🌐 公共代禱中'}
                </span>
                <button
                  onClick={() => handleTabChange('all')}
                  className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-xl font-extrabold flex items-center gap-1 shadow-sm transition text-[11px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> 重置篩選
                </button>
              </div>
            )}

            {/* 動態牆內容區：各分頁直覺列出所屬清單或單一展開卡片 */}
            <div className="space-y-3">
              {selectedSinglePrayerId && singleFocusedPrayer ? (
                /* 單一事項展開檢視卡片 */
                <div
                  id={`prayer-card-${singleFocusedPrayer.id}`}
                  className="transition-all duration-300 rounded-2xl ring-4 ring-amber-400/80 shadow-xl"
                >
                  <PrayerCard prayer={singleFocusedPrayer} currentUserId={currentUserId} />
                </div>
              ) : prayers.length === 0 ? (
                /* 列表無資料提示 */
                <div className="bg-white border border-dashed rounded-2xl p-10 text-center text-gray-400 text-xs">
                  {activeTab === 'thanksgiving'
                    ? '🙌 目前尚無獻上感恩與見證紀錄，邀請您將蒙應允事項轉為感恩見證！'
                    : '目前尚無符合條件的代禱事項，點擊右下角「+」即可發起新的禱告！'}
                </div>
              ) : (
                /* 🌟 禱告牆直覺主題列表 */
                <div className="space-y-2">
                  {prayers.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleFocusSinglePrayer(p)}
                      className="bg-white border border-gray-200/80 hover:border-amber-400 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0 flex-grow">
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.status === 'urgent' && (
                            <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              ⚡ 迫切緊急
                            </span>
                          )}
                          {p.status === 'answered' && (
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              🌱 蒙應允
                            </span>
                          )}
                          {p.status === 'thanksgiving' && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              🙌 感恩見證
                            </span>
                          )}
                          {p.type === 'private' ? (
                            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <Lock className="w-3 h-3" /> 私密守望
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <Globe className="w-3 h-3" /> 公共代禱
                            </span>
                          )}

                          <h3 className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-amber-600 transition truncate">
                            {p.title}
                          </h3>
                        </div>

                        <p className="text-[11px] text-gray-500 truncate">{p.content}</p>

                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-amber-600" />
                            PO 文者：{p.author_name || p.profiles?.full_name || '小組肢體'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-amber-600 font-bold text-xs shrink-0 bg-amber-50 px-2.5 py-1.5 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition">
                        <span>展開內容</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 【右側】：代禱事項總覽清單 */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-3 lg:sticky lg:top-5">
            <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h2 className="text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-amber-600" /> 
                  {activeTab === 'thanksgiving'
                    ? '🙌 感恩見證清單'
                    : activeTab === 'private'
                    ? '🔒 私密代禱清單'
                    : activeTab === 'public'
                    ? '🌐 一般公禱清單'
                    : '代禱事項總覽清單'}
                </h2>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  共 {allPrayersList.length} 項
                </span>
              </div>

              {/* 說明卡 */}
              <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5 text-[10px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" /> 操作說明：
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-amber-800">
                  <span>1. ⭕ <b>大勾選框</b>：標記【蒙應允】(發起人/小組長/管理員)</span>
                  <span>2. 🙌 <b>獻上感恩</b>：移至感恩見證牆</span>
                  <span>3. 🔥 <b>設為緊急</b>：切換迫切緊急</span>
                  <span>4. 🔒 <b>轉為私禱</b>：選取/排除參與肢體</span>
                </div>
              </div>

              {/* 代禱/感恩清單列表 */}
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {allPrayersList.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-xs">目前無任何事項紀錄</p>
                ) : (
                  allPrayersList.map((item) => {
                    const isAnswered = item.status === 'answered';
                    const isThanksgiving = item.status === 'thanksgiving';
                    const isUrgent = item.status === 'urgent';
                    const isPrivate = item.type === 'private';
                    const isSelected = selectedSinglePrayerId === item.id || highlightedId === item.id;

                    const canManage =
                      userRole === 'admin' ||
                      userRole === 'developer' ||
                      item.creator_id === currentUserId;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleFocusSinglePrayer(item)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col gap-2 ${
                          isSelected
                            ? 'bg-amber-50 border-amber-400 shadow-sm'
                            : isAnswered
                            ? 'bg-green-50/40 border-green-200'
                            : isThanksgiving
                            ? 'bg-purple-50/40 border-purple-200'
                            : 'bg-gray-50/60 border-gray-200/80 hover:bg-gray-100/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0 flex-grow">
                            
                            {/* 加大版蒙應允方框按鈕 (w-6 h-6) */}
                            <button
                              onClick={(e) => togglePrayerCompletion(item, e)}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                isAnswered
                                  ? 'bg-green-600 border-green-600 text-white shadow-2xs'
                                  : 'bg-white border-gray-300 hover:border-amber-500'
                              }`}
                              title={isAnswered ? '取消蒙應允完成狀態' : '勾選標記為已完成蒙應允 (限發起人/小組長/管理員)'}
                            >
                              {isAnswered && <Check className="w-4 h-4 stroke-[3]" />}
                            </button>

                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isAnswered && (
                                  <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                    🌱 已完成
                                  </span>
                                )}
                                {isThanksgiving && (
                                  <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                    🙌 獻上感恩
                                  </span>
                                )}
                                {isUrgent && (
                                  <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                    ⚡ 緊急
                                  </span>
                                )}
                                {isPrivate && (
                                  <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                    🔒 私禱
                                  </span>
                                )}
                                <h3 className={`text-xs font-bold truncate ${isAnswered ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                  {item.title || '無標題事項'}
                                </h3>
                              </div>
                              <p className="text-[10px] text-gray-500 truncate">
                                {item.content}
                              </p>
                            </div>
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-1" />
                        </div>

                        {/* 管理操作欄 */}
                        {canManage && (
                          <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-gray-100/80 text-[10px] flex-wrap">
                            <button
                              onClick={(e) => toggleThanksgivingStatus(item, e)}
                              className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition ${
                                isThanksgiving
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : 'bg-white text-gray-500 border border-gray-200 hover:text-purple-700 hover:bg-purple-50'
                              }`}
                              title={isThanksgiving ? '取消獻上感恩狀態' : '標記為獻上感恩見證'}
                            >
                              <Sparkles className={`w-3 h-3 ${isThanksgiving ? 'text-purple-600' : 'text-gray-400'}`} />
                              <span>{isThanksgiving ? '已獻感恩' : '轉獻感恩'}</span>
                            </button>

                            <button
                              onClick={(e) => toggleUrgentStatus(item, e)}
                              className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition ${
                                isUrgent
                                  ? 'bg-red-100 text-red-600 border border-red-200'
                                  : 'bg-white text-gray-500 border border-gray-200 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title={isUrgent ? '取消迫切緊急' : '設為迫切緊急'}
                            >
                              <Flame className={`w-3 h-3 ${isUrgent ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                              <span>{isUrgent ? '已設緊急' : '設為緊急'}</span>
                            </button>

                            <button
                              onClick={(e) => handleMoveToPrivate(item, e)}
                              className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition ${
                                isPrivate
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : 'bg-white text-gray-500 border border-gray-200 hover:text-purple-600 hover:bg-purple-50'
                              }`}
                              title={isPrivate ? '點擊轉為公開代禱' : '點擊設定私密代禱與成員選擇'}
                            >
                              <Lock className="w-3 h-3 text-purple-600" />
                              <span>{isPrivate ? '權限/轉公禱' : '轉為私禱'}</span>
                            </button>

                            <button
                              onClick={(e) => handleDeletePrayer(item, e)}
                              className="px-2 py-0.5 rounded-lg font-bold bg-white text-red-500 border border-red-200 hover:bg-red-500 hover:text-white transition flex items-center gap-1"
                              title="刪除事項"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>刪除</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 點擊儀表板「🔥 禱告中」彈出的類型選擇對話框 */}
      {showActiveTypeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative text-center">
            <button
              onClick={() => setShowActiveTypeModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-800">🔥 篩選「禱告中」事項</h3>
              <p className="text-xs text-gray-500">請選擇要在「全部代禱」中列出的禱告類型：</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleSelectActiveType('public')}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold p-3.5 rounded-2xl shadow-sm transition flex flex-col items-center gap-1 text-xs"
              >
                <Globe className="w-5 h-5" />
                <span>🌐 一般公禱</span>
              </button>

              <button
                onClick={() => handleSelectActiveType('private')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold p-3.5 rounded-2xl shadow-sm transition flex flex-col items-center gap-1 text-xs"
              >
                <Lock className="w-5 h-5" />
                <span>🔒 私密代禱</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 發起禱告懸浮按鈕 */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed right-6 bottom-6 bg-amber-500 text-white p-3.5 rounded-full shadow-lg hover:bg-amber-600 transition flex items-center justify-center z-40"
        title="發起新代禱事項"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* 發起禱告彈窗 */}
      <CreatePrayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUserId={currentUserId}
        onSuccess={loadPrayersAndDashboard}
      />

      {/* 私密肢體權限設定彈窗 */}
      <EditPrivateAccessModal
        isOpen={!!editingPrivatePrayer}
        prayer={editingPrivatePrayer}
        currentUserId={currentUserId}
        onClose={() => setEditingPrivatePrayer(null)}
        onSuccess={loadPrayersAndDashboard}
      />

      {/* 補填小組資料彈窗 */}
      <CompleteProfileModal
        isOpen={showProfileModal}
        userId={currentUserId}
        defaultName={userProfileName}
        onComplete={() => {
          setShowProfileModal(false);
          loadPrayersAndDashboard();
        }}
      />
    </main>
  );
}