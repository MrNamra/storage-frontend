import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Shield,
  ShieldAlert,
  Database,
  Search,
  Key,
  Edit,
  Trash2,
  Lock,
  ArrowLeft,
  RefreshCw,
  UserCheck,
  UserX,
  Plus,
  CheckCircle,
  AlertCircle,
  Folder,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchDataFromAPI } from '@/lib/api';
import { getUser, saveUserLocally } from '@/lib/constants';
import toast from 'react-hot-toast';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  status_reason?: string | null;
  bucketAllowed: number;
  buckets_count: number;
  created_at: string;
  last_login_at?: string | null;
}

interface StatsData {
  total_users: number;
  active_users: number;
  suspended_users: number;
  admin_count: number;
  total_buckets: number;
  recent_users: UserRecord[];
}

export default function Admin() {
  const navigate = useNavigate();
  const token = JSON.parse(getUser() || 'null');

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editBucketAllowed, setEditBucketAllowed] = useState(5);
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [savingEdit, setSavingEdit] = useState(false);

  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Verify admin role on mount
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetchDataFromAPI<{ data?: any }>('user/profile', 'get', '', token)
      .then((res) => {
        const userProfile = res?.data;
        setCurrentUser(userProfile);
        if (userProfile?.role !== 'admin') {
          toast.error('Access denied. Administrator privileges required.');
          navigate('/dashboard');
        } else {
          loadData();
        }
      })
      .catch((err) => {
        console.error('Failed to authenticate admin:', err);
        navigate('/login');
      });
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadUsers()]);
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const res = await fetchDataFromAPI<{ data: StatsData }>('admin/stats', 'get', '', token);
      if (res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  };

  const loadUsers = async () => {
    try {
      let queryUrl = `admin/users?page=${page}&per_page=15`;
      if (searchQuery.trim()) {
        queryUrl += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      if (statusFilter !== 'all') {
        queryUrl += `&status=${statusFilter}`;
      }
      if (roleFilter !== 'all') {
        queryUrl += `&role=${roleFilter}`;
      }

      const res = await fetchDataFromAPI<{ data: { data: UserRecord[]; last_page: number } }>(
        queryUrl,
        'get',
        '',
        token
      );

      if (res?.data?.data) {
        setUsers(res.data.data);
        setTotalPages(res.data.last_page || 1);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users');
    }
  };

  // Re-fetch users when search or filters change
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      const timer = setTimeout(() => {
        loadUsers();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, statusFilter, roleFilter, page]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadUsers()]);
    setRefreshing(false);
    toast.success('Admin panel refreshed');
  };

  // Impersonate User ("Login As")
  const handleImpersonate = async (userToImpersonate: UserRecord) => {
    if (userToImpersonate.id === currentUser?.id) {
      toast.error('You are already logged into this account');
      return;
    }

    if (userToImpersonate.status === 'suspended') {
      toast.error('Cannot impersonate a suspended user account. Activate it first.');
      return;
    }

    const toastId = toast.loading(`Logging in as ${userToImpersonate.name}...`);
    try {
      const res = await fetchDataFromAPI<{
        data: {
          token: string;
          user: any;
          impersonated_by: any;
        };
      }>(`admin/users/${userToImpersonate.id}/impersonate`, 'post', {}, token);

      if (res?.data?.token) {
        // Save current admin token for easy return
        localStorage.setItem('admin_impersonator_token', JSON.stringify(token));
        localStorage.setItem('admin_impersonator_name', currentUser?.name || 'Admin');
        localStorage.setItem('admin_impersonated_user_name', userToImpersonate.name);
        localStorage.setItem('admin_impersonated_user_email', userToImpersonate.email);

        // Switch active session to target user
        saveUserLocally(JSON.stringify(res.data.token));

        toast.success(`Logged in as ${userToImpersonate.name}! Redirecting...`, { id: toastId });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 600);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to impersonate user', { id: toastId });
    }
  };

  // Open Edit User Modal
  const openEditModal = (u: UserRecord) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditBucketAllowed(u.bucketAllowed);
    setEditStatus(u.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingEdit(true);
    try {
      const payload = {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        bucketAllowed: Number(editBucketAllowed),
        status: editStatus,
      };

      const res = await fetchDataFromAPI<{ message: string; data: UserRecord }>(
        `admin/users/${editingUser.id}/update`,
        'post',
        payload,
        token
      );

      toast.success(res?.message || 'User updated successfully');
      setEditingUser(null);
      loadUsers();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Change Password Modal
  const openPasswordModal = (u: UserRecord) => {
    setPasswordUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetchDataFromAPI<{ message: string }>(
        `admin/users/${passwordUser.id}/password`,
        'post',
        { password: newPassword },
        token
      );

      toast.success(res?.message || `Password for ${passwordUser.name} updated!`);
      setPasswordUser(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  // Toggle Suspend / Active status
  const handleToggleStatus = async (u: UserRecord) => {
    if (u.id === currentUser?.id) {
      toast.error('You cannot suspend your own admin account');
      return;
    }

    const actionText = u.status === 'active' ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionText} ${u.name}'s account?`)) {
      return;
    }

    try {
      const res = await fetchDataFromAPI<{ message: string }>(
        `admin/users/${u.id}/toggle-status`,
        'post',
        {},
        token
      );

      toast.success(res?.message || `User status changed`);
      loadUsers();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to toggle status');
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    try {
      const res = await fetchDataFromAPI<{ message: string }>(
        `admin/users/${deletingUser.id}`,
        'delete',
        {},
        token
      );

      toast.success(res?.message || `User deleted`);
      setDeletingUser(null);
      loadUsers();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Never' : d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  CloudVault Admin
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 uppercase tracking-wider font-semibold">
                    Super Control
                  </span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{currentUser?.name || 'Administrator'}</p>
              <p className="text-[11px] text-purple-400">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {stats ? stats.total_users : '...'}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              {stats?.active_users || 0} active &bull; {stats?.suspended_users || 0} suspended
            </p>
          </div>

          {/* Active Users */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Users</p>
                <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                  {stats ? stats.active_users : '...'}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-emerald-500/80 mt-3">&check; Permitted to create & upload</p>
          </div>

          {/* Suspended Users */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suspended Users</p>
                <h3 className="text-2xl font-bold text-rose-400 mt-1">
                  {stats ? stats.suspended_users : '...'}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <UserX className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-rose-400/80 mt-3">Blocked from logging in</p>
          </div>

          {/* Total Buckets */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Buckets</p>
                <h3 className="text-2xl font-bold text-indigo-400 mt-1">
                  {stats ? stats.total_buckets : '...'}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Database className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Active cloud storage channels</p>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Section Toolbar */}
          <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>User Accounts & Quotas</span>
                <span className="text-xs font-normal text-slate-400">({users.length} shown)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage accounts, bucket limits, passwords, or log in as any user.
              </p>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 bg-slate-950/80 border-slate-800 text-xs h-9 text-white placeholder:text-slate-500 focus:border-purple-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                className="bg-slate-950/80 border border-slate-800 text-xs text-slate-300 rounded-lg h-9 px-3 focus:outline-none focus:border-purple-500">
                <option value="all">Status: All</option>
                <option value="active">Active only</option>
                <option value="suspended">Suspended only</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as any);
                  setPage(1);
                }}
                className="bg-slate-950/80 border border-slate-800 text-xs text-slate-300 rounded-lg h-9 px-3 focus:outline-none focus:border-purple-500">
                <option value="all">Role: All</option>
                <option value="user">Users only</option>
                <option value="admin">Admins only</option>
              </select>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Bucket Quota</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      {loading ? 'Loading user records...' : 'No users match the search criteria.'}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const initial = u.name ? u.name.charAt(0).toUpperCase() : 'U';

                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* User Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-800 to-slate-800 flex items-center justify-center font-bold text-white border border-purple-500/20 shadow-sm flex-shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-100 flex items-center gap-1.5">
                                <span className="truncate">{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-normal">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium text-[11px]">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                              User
                            </span>
                          )}
                        </td>

                        {/* Bucket Limit & Created Count */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-medium text-slate-200">
                              <Folder className="w-3.5 h-3.5 text-purple-400" />
                              <span>
                                {u.bucketAllowed} allowed
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {u.buckets_count || 0} currently created
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {u.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Suspended
                            </span>
                          )}
                        </td>

                        {/* Last Login */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {formatDate(u.last_login_at)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Impersonate ("Login As") */}
                            <button
                              type="button"
                              onClick={() => handleImpersonate(u)}
                              disabled={isSelf || u.status === 'suspended'}
                              className={`p-1.5 rounded-lg border transition-all text-xs font-medium flex items-center gap-1 ${
                                isSelf || u.status === 'suspended'
                                  ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
                                  : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white'
                              }`}
                              title={isSelf ? 'Cannot impersonate yourself' : `Login as ${u.name}`}>
                              <Key className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Login As</span>
                            </button>

                            {/* Edit Quotas & Info */}
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                              title="Edit user details and bucket limit">
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              onClick={() => openPasswordModal(u)}
                              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-purple-400 hover:text-white hover:bg-purple-600 transition-colors"
                              title="Reset user password">
                              <Lock className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Suspend */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed border-slate-800 text-slate-600'
                                  : u.status === 'active'
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                              }`}
                              title={u.status === 'active' ? 'Suspend account' : 'Activate account'}>
                              {u.status === 'active' ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete User */}
                            <button
                              type="button"
                              onClick={() => setDeletingUser(u)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isSelf
                                  ? 'opacity-30 cursor-not-allowed border-slate-800 text-slate-600'
                                  : 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white'
                              }`}
                              title="Delete user account">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="border-slate-800 text-xs">
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="border-slate-800 text-xs">
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit User & Bucket Limit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Edit className="w-4 h-4 text-purple-400" />
                Edit User & Quotas
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Bucket Limit Control */}
              <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-purple-300 font-semibold flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-purple-400" />
                    Bucket Creation Limit
                  </label>
                  <span className="text-[11px] text-purple-400 font-bold">
                    {editBucketAllowed} buckets allowed
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  required
                  value={editBucketAllowed}
                  onChange={(e) => setEditBucketAllowed(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-purple-500/40 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-400"
                />
                <p className="text-[10px] text-slate-400">
                  Controls how many total buckets this user is allowed to create in cloud storage.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Account Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(null)}
                  className="border-slate-800 text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingEdit}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                Change Password for {passwordUser.name}
              </h3>
              <button
                onClick={() => setPasswordUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
              <p className="text-[11px] text-slate-400">
                As administrator, you can directly set a new password for this user without knowing their current password.
              </p>

              <div>
                <label className="block text-slate-400 font-medium mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white pr-9 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPasswordUser(null)}
                  className="border-slate-800 text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingPassword}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4">
                  {savingPassword ? 'Updating...' : 'Set Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-white">Delete User Account?</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">{deletingUser.name}</strong> ({deletingUser.email})?
              All user tokens will be revoked immediately.
            </p>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingUser(null)}
                className="border-slate-800 text-xs">
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 font-semibold">
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
