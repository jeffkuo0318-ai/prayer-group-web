'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Check,
  X,
  ArrowLeft,
  ShieldCheck,
  UserX,
  UserCheck,
  Clock,
  Edit3,
  Save,
  Search,
  Users,
  BarChart3,
  Code,
  User,
  Lock,
  Unlock,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function AdminAudit() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'suspended'>('pending');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 編輯模式狀態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGroup, setEditGroup] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'developer' | 'admin' | 'member'>('member');
  const [editCanAccessPrivate, setEditCanAccessPrivate] = useState<boolean>(false);

  // 讀取所有成員資料
  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setAllUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 統計數據計算
  const counts = {
    pending: allUsers.filter((u) => u.status === 'pending').length,
    approved: allUsers.filter((u) => u.status === 'approved').length,
    suspended: allUsers.filter((u) => u.status === 'suspended').length,
    total: allUsers.length,
    developers: allUsers.filter((u) => u.role === 'developer').length,
    admins: allUsers.filter((u) => u.role === 'admin').length,
    privateAccess: allUsers.filter((u) => u.can_access_private).length,
  };

  // 過濾搜尋成員
  const filteredUsers = allUsers.filter((user) => {
    const matchesTab = user.status === activeTab;
    const matchesSearch =
      (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.group_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // 開啟編輯模式
  const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditName(user.full_name || '');
    setEditGroup(user.group_name || '國華雅萍小家');
    setEditRole(user.role || 'member');
    setEditCanAccessPrivate(!!user.can_access_private);
  };

  // 儲存身分與私禱權限修改
  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        group_name: editGroup,
        role: editRole,
        can_access_private: editCanAccessPrivate,
      })
      .eq('id', id);

    if (!error) {
      alert('已成功修改成員資料與私禱存取權限！');
      setEditingId(null);
      fetchUsers();
    } else {
      alert(`修改失敗：${error.message}`);
    }
  };

  // 修改審核開通狀態
  const handleStatusChange = async (
    id: string,
    newStatus: 'approved' | 'suspended' | 'rejected',
    userName: string
  ) => {
    const actionName =
      newStatus === 'approved'
        ? '核准開通'
        : newStatus === 'suspended'
        ? '解除/停用會員權限'
        : '退回申請';

    if (!confirm(`確定要將「${userName || '該成員'}」執行【${actionName}】嗎？`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      fetchUsers();
    } else {
      alert(`操作失敗：${error.message}`);
    }
  };

  // 渲染身份徽章
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'developer':
        return (
          <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <Code className="w-3 h-3 text-purple-600" /> 系統開發者
          </span>
        );
      case 'admin':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-amber-600" /> 管理員
          </span>
        );
      default:
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <User className="w-3 h-3 text-blue-500" /> 一般會員
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 頂部頁頭 */}
        <div className="bg-white border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/prayers"
              className="p-2 bg-gray-50 border rounded-xl hover:bg-gray-100 transition shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-amber-600" /> 小組成員權限管理後台
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                分級成員身份管控 (開發者/管理員/會員) 與私禱權限精準開關
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-gray-600 bg-amber-50/70 border border-amber-200/80 px-3.5 py-2 rounded-xl">
            <Users className="w-4 h-4 text-amber-600" />
            <span>總人數：<strong className="text-amber-800 text-sm">{counts.total}</strong></span>
            <span className="text-gray-300">|</span>
            <span className="text-purple-700">私禱開放: <strong>{counts.privateAccess}</strong> 人</span>
          </div>
        </div>

        {/* 主要區域 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左側欄：過濾與說明 */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-5">
            
            {/* 數據儀表板 */}
            <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-amber-600" /> 審核狀態過濾
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
                <div
                  onClick={() => setActiveTab('pending')}
                  className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                    activeTab === 'pending'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-amber-50/50 border-amber-100 hover:bg-amber-100/50 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">待審核申請</span>
                  </div>
                  <span className="text-base font-extrabold">{counts.pending}</span>
                </div>

                <div
                  onClick={() => setActiveTab('approved')}
                  className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                    activeTab === 'approved'
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-green-50/50 border-green-100 hover:bg-green-100/50 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">正式開通成員</span>
                  </div>
                  <span className="text-base font-extrabold">{counts.approved}</span>
                </div>

                <div
                  onClick={() => setActiveTab('suspended')}
                  className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                    activeTab === 'suspended'
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-red-50/50 border-red-100 hover:bg-red-100/50 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">已解除/停用</span>
                  </div>
                  <span className="text-base font-extrabold">{counts.suspended}</span>
                </div>
              </div>
            </div>

            {/* 即時搜尋 */}
            <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-2.5">
              <label className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-amber-600" /> 快速搜尋成員
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋姓名、Email 或小組..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 私禱權限說明 */}
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 text-xs space-y-2 text-purple-950">
              <p className="font-bold flex items-center gap-1.5 text-purple-900">
                <ShieldAlert className="w-4 h-4 text-purple-700" /> 私禱排除與驗證說明：
              </p>
              <ul className="space-y-1.5 text-[11px] leading-relaxed text-purple-900 list-disc list-inside">
                <li>預設開通之會員可能無私禱存取權。</li>
                <li>點擊成員的 <strong>鉛筆編輯圖示</strong> 可手動勾選開啟「私禱區存取權限」。</li>
                <li>未開啟者進入私禱區時，系統將**自動排除他人私禱**，僅顯示自己的私禱。</li>
              </ul>
            </div>
          </div>

          {/* 右側成員清單 */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            
            {/* 分頁 Tab */}
            <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl border shadow-sm text-xs font-bold">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock className="w-4 h-4" /> 待審核 ({counts.pending})
              </button>

              <button
                onClick={() => setActiveTab('approved')}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'approved'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <UserCheck className="w-4 h-4" /> 正式成員 ({counts.approved})
              </button>

              <button
                onClick={() => setActiveTab('suspended')}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'suspended'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <UserX className="w-4 h-4" /> 已解除 ({counts.suspended})
              </button>
            </div>

            {/* 成員列表 */}
            {loading ? (
              <div className="bg-white border rounded-2xl p-12 text-center text-gray-400 text-xs">
                資料載入中...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white border border-dashed rounded-2xl p-12 text-center text-gray-400 text-xs">
                {searchQuery
                  ? `查無符合「${searchQuery}」的成員紀錄`
                  : activeTab === 'pending'
                  ? '🎉 目前沒有等待審核的新申請者'
                  : activeTab === 'approved'
                  ? '尚無正式成員紀錄'
                  : '尚無已解除/停用的成員'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3"
                  >
                    {editingId === u.id ? (
                      /* 編輯模式 (可設置私禱進出權限) */
                      <div className="space-y-2.5 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                              成員姓名
                            </label>
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full border rounded-lg p-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                              所屬小家 / 小組
                            </label>
                            <input
                              value={editGroup}
                              onChange={(e) => setEditGroup(e.target.value)}
                              className="w-full border rounded-lg p-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                              身分權限階級
                            </label>
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as any)}
                              className="w-full border rounded-lg p-2 text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500 font-bold text-gray-700"
                            >
                              <option value="member">👤 一般會員</option>
                              <option value="admin">🛡️ 管理員 (小組長)</option>
                              <option value="developer">💻 系統開發者 (最高權限)</option>
                            </select>
                          </div>

                          {/* 精準勾選/排除私禱權限 */}
                          <div className="bg-purple-100/60 border border-purple-200 p-2.5 rounded-xl flex items-center justify-between mt-2">
                            <span className="font-bold text-purple-900 flex items-center gap-1 text-[11px]">
                              <Lock className="w-3.5 h-3.5 text-purple-700" /> 開放進出私密代禱區
                            </span>
                            <input
                              type="checkbox"
                              checked={editCanAccessPrivate}
                              onChange={(e) => setEditCanAccessPrivate(e.target.checked)}
                              className="w-4 h-4 accent-purple-700 rounded cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded-lg font-bold"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => saveEdit(u.id)}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Save className="w-3.5 h-3.5" /> 儲存變更
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* 檢視模式 */
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-base">
                                {u.full_name || '未填寫姓名'}
                              </span>
                              {renderRoleBadge(u.role)}
                            </div>
                            <button
                              onClick={() => startEdit(u)}
                              className="text-gray-400 hover:text-amber-600 transition p-1.5 bg-gray-50 rounded-lg border hover:bg-amber-50"
                              title="編輯成員或設置私禱權限"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-1 text-xs text-gray-500">
                            <p>
                              信箱：
                              <span className="font-semibold text-gray-700 break-all">
                                {u.email || '未填寫信箱'}
                              </span>
                            </p>
                            <p>
                              所屬小組：
                              <span
                                className={`font-semibold ${
                                  !u.group_name || u.group_name === '未指定小組'
                                    ? 'text-red-500 font-bold'
                                    : 'text-amber-800'
                                }`}
                              >
                                {u.group_name || '未指定小組'}
                              </span>
                            </p>

                            {/* 私禱權限開放標籤 */}
                            <div className="pt-1 flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400">私禱存取：</span>
                              {u.can_access_private || u.role === 'admin' || u.role === 'developer' ? (
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.2 rounded-md flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-purple-600" /> 已獲授權可檢視
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.2 rounded-md flex items-center gap-1">
                                  <Unlock className="w-3 h-3 text-gray-400" /> 排除/僅限個人
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 審核按鈕 */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                          {activeTab === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(u.id, 'approved', u.full_name)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
                              >
                                <Check className="w-3.5 h-3.5" /> 核准開通
                              </button>
                              <button
                                onClick={() => handleStatusChange(u.id, 'suspended', u.full_name)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
                              >
                                <X className="w-3.5 h-3.5" /> 拒絕退回
                              </button>
                            </>
                          )}

                          {activeTab === 'approved' && u.role !== 'developer' && (
                            <button
                              onClick={() => handleStatusChange(u.id, 'suspended', u.full_name)}
                              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1"
                            >
                              <UserX className="w-3.5 h-3.5" /> 解除權限
                            </button>
                          )}

                          {activeTab === 'suspended' && (
                            <button
                              onClick={() => handleStatusChange(u.id, 'approved', u.full_name)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> 恢復會員
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}