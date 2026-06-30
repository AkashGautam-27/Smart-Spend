import React, { useState, useEffect } from 'react';
import { useAuth, authFetch } from '../context/AuthContext';
import {
  Users,
  Shield,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  User as UserIcon,
  X,
  Loader2,
  Plus,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManageableUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  avatar?: string;
  mobile?: string;
  isOnline?: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function Admin() {
  const { authState } = useAuth();
  const [users, setUsers] = useState<ManageableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'online' | 'offline'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManageableUser | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'user' | 'admin'>('user');
  const [formIsVerified, setFormIsVerified] = useState(true);
  const [formMobile, setFormMobile] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Fetch users list
  const fetchUsers = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await authFetch('/api/admin/users');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch users list.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      if (!isBackground) setError(err.message || 'An error occurred while loading users.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Auto-refresh dynamic updates for user verification status every 4 seconds
    const interval = setInterval(() => {
      fetchUsers(true);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Handle auto-clear alerts
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Open Edit user modal
  const handleOpenEdit = (user: ManageableUser) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormIsVerified(user.isVerified);
    setFormMobile(user.mobile || '');
    setFormPassword(''); // Don't show password or allow modification here unless desired
    setIsEditModalOpen(true);
  };

  // Open Delete user confirmation
  const handleOpenDelete = (user: ManageableUser) => {
    if (user.id === authState.user?.id) {
      setError('You cannot delete your own administrative account.');
      return;
    }
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Open Add user modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('user');
    setFormIsVerified(true);
    setFormMobile('');
    setIsAddModalOpen(true);
  };

  // Submit create user form
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      const response = await authFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          isVerified: formIsVerified,
          mobile: formMobile
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user account.');
      }

      setSuccess('User account registered successfully.');
      setIsAddModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to register new user.');
    } finally {
      setFormLoading(false);
    }
  };

  // Submit edit user form
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          role: formRole,
          isVerified: formIsVerified,
          mobile: formMobile
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user details.');
      }

      setSuccess('User details updated successfully.');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user.');
    } finally {
      setFormLoading(false);
    }
  };

  // Submit delete user action
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user.');
      }

      setSuccess('User and all associated data deleted successfully.');
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user account.');
    } finally {
      setFormLoading(false);
    }
  };

  // Filtering users logic
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.mobile && user.mobile.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'verified' && user.isVerified) ||
      (statusFilter === 'unverified' && !user.isVerified) ||
      (statusFilter === 'online' && user.isOnline) ||
      (statusFilter === 'offline' && !user.isOnline);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Analytics stats for admin
  const totalUsersCount = users.length;
  const adminUsersCount = users.filter(u => u.role === 'admin').length;
  const verifiedUsersCount = users.filter(u => u.isVerified).length;
  const onlineUsersCount = users.filter(u => u.isOnline).length;

  const renderUserAvatar = (user: ManageableUser) => {
    const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    const avatar = user.avatar;

    let avatarElement;
    if (!avatar) {
      avatarElement = (
        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
          {initials}
        </div>
      );
    } else if (avatar.startsWith('bg-gradient-')) {
      avatarElement = (
        <div className={`h-8 w-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${avatar}`}>
          {initials}
        </div>
      );
    } else {
      avatarElement = (
        <img
          src={avatar}
          alt={user.name}
          referrerPolicy="no-referrer"
          className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-neutral-800 shrink-0 shadow-xs"
        />
      );
    }

    return (
      <div className="relative shrink-0">
        {avatarElement}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-neutral-900 ${
          user.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-neutral-600'
        }`}>
          {user.isOnline && (
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div id="admin_panel" className="space-y-6 font-sans">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-neutral-100 flex flex-wrap items-center gap-2.5">
            <Users className="h-6 w-6 text-indigo-600" />
            User Administration Panel
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider ml-1.5 select-none">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Live Sync
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Securely oversee system registration, customize user privileges, verify emails, or safely delete accounts.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all self-start md:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Add User Account
        </button>
      </div>

      {/* Alert Overlays */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-xs font-semibold"
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-900 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-neutral-500 font-bold block">
              Total Registrations
            </span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-neutral-100">
              {loading ? '...' : totalUsersCount}
            </span>
          </div>
        </div>

        {/* Administrators */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-900 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 rounded-xl">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-neutral-500 font-bold block">
              Administrators
            </span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-neutral-100">
              {loading ? '...' : adminUsersCount}
            </span>
          </div>
        </div>

        {/* Verified Accounts */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-900 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-neutral-500 font-bold block">
              Verified Users
            </span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-neutral-100">
              {loading ? '...' : verifiedUsersCount}
            </span>
          </div>
        </div>

        {/* Online Right Now */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-900 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl relative">
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-neutral-500 font-bold block">
              Online Right Now
            </span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-neutral-100">
              {loading ? '...' : onlineUsersCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-900 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100 dark:placeholder-neutral-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 py-1.5 px-3 rounded-xl">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Role:</span>
            <select
              value={roleFilter}
              onChange={(e: any) => setRoleFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 dark:text-neutral-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="user">Regular User</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 py-1.5 px-3 rounded-xl">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Status:</span>
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 dark:text-neutral-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="online">Online Now</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Data Grid / Table */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-900 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-xs">Fetching registered profiles...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold">No registered users matched your criteria.</p>
            <p className="text-[11px] text-slate-450 mt-1">Try relaxing or modifying your filter categories.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-neutral-950/20 border-b border-slate-100 dark:border-neutral-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">User Details</th>
                  <th className="py-3 px-5">Role</th>
                  <th className="py-3 px-5">Verified Status</th>
                  <th className="py-3 px-5">Access & Activity Log</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="text-xs hover:bg-slate-50/40 dark:hover:bg-neutral-950/10 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {renderUserAvatar(user)}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 dark:text-neutral-200">{user.name}</span>
                            {user.id === authState.user?.id && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-sm">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
                          {user.mobile && (
                            <p className="text-[9px] text-slate-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1">
                              <span className="font-semibold text-[8px] bg-slate-100 dark:bg-neutral-850 text-slate-500 dark:text-neutral-400 px-1 py-0.2 rounded-xs">TEL:</span>
                              {user.mobile}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-100 dark:border-violet-900/30">
                          <Shield className="h-3 w-3" />
                          Administrator
                        </span>
                      ) : (
                        <span className="inline-flex items-center py-1 px-2.5 rounded-full bg-slate-50 dark:bg-neutral-950 text-slate-500 dark:text-neutral-400 text-[10px] font-bold border border-slate-100 dark:border-neutral-850">
                          Regular User
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      {user.isVerified ? (
                        <span className="inline-flex items-center gap-1 py-1 px-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 py-1 px-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg">
                          <XCircle className="h-3.5 w-3.5" />
                          Pending OTP
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <div className="text-[10px] leading-relaxed space-y-0.5">
                        <p className="text-slate-500 dark:text-neutral-400">
                          <span className="font-bold text-slate-400">Joined:</span> {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {user.lastLoginAt ? (
                          <p className="text-emerald-600 dark:text-emerald-450 font-medium">
                            <span className="font-bold text-slate-400">Active:</span> {new Date(user.lastLoginAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic">
                            <span className="font-bold text-slate-400">Active:</span> Never logged in
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit user details or permissions"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-neutral-950 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={() => handleOpenDelete(user)}
                          disabled={user.id === authState.user?.id}
                          title={user.id === authState.user?.id ? "You cannot delete yourself" : "Delete user and purge all associated data"}
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            user.id === authState.user?.id
                              ? 'text-slate-200 dark:text-neutral-800 cursor-not-allowed'
                              : 'text-slate-500 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-neutral-950'
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD USER */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            ></motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative z-10"
            >
              <div className="h-14 border-b border-slate-100 dark:border-neutral-850 px-6 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-neutral-200 uppercase tracking-wider">
                  Create New User Profile
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-850 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100 dark:placeholder-neutral-600"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100 dark:placeholder-neutral-600"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                    Account Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="•••••••• (Min 6 characters)"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100 dark:placeholder-neutral-600"
                  />
                </div>

                {/* Mobile Phone Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="+1 (555) 019-2834"
                      value={formMobile}
                      onChange={(e) => setFormMobile(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100 dark:placeholder-neutral-600"
                    />
                  </div>
                </div>

                {/* Role and Verified */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Role */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                      System Role
                    </label>
                    <select
                      value={formRole}
                      onChange={(e: any) => setFormRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100"
                    >
                      <option value="user">Regular User</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  {/* Verification Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                      Verification Status
                    </label>
                    <select
                      value={formIsVerified ? 'true' : 'false'}
                      onChange={(e) => setFormIsVerified(e.target.value === 'true')}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100"
                    >
                      <option value="true">Verified (Active)</option>
                      <option value="false">Unverified (Pending OTP)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="py-2 px-4 border border-slate-100 dark:border-neutral-800 dark:text-neutral-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-950"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {formLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Create Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT USER */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            ></motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative z-10"
            >
              <div className="h-14 border-b border-slate-100 dark:border-neutral-850 px-6 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-neutral-200 uppercase tracking-wider">
                  Modify User Profile
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-850 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditUser} className="p-6 space-y-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100"
                    />
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="+1 (555) 019-2834"
                      value={formMobile}
                      onChange={(e) => setFormMobile(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100"
                    />
                  </div>
                </div>

                {/* Role and Verified */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Role */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                      System Role
                    </label>
                    <select
                      value={formRole}
                      disabled={selectedUser.id === authState.user?.id}
                      onChange={(e: any) => setFormRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100 disabled:opacity-60"
                    >
                      <option value="user">Regular User</option>
                      <option value="admin">Administrator</option>
                    </select>
                    {selectedUser.id === authState.user?.id && (
                      <span className="text-[9px] text-amber-500 block">You cannot revoke your own admin rights here.</span>
                    )}
                  </div>

                  {/* Verification Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">
                      Verification Status
                    </label>
                    <select
                      value={formIsVerified ? 'true' : 'false'}
                      onChange={(e) => setFormIsVerified(e.target.value === 'true')}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-850 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-neutral-100"
                    >
                      <option value="true">Verified (Active)</option>
                      <option value="false">Unverified (Pending OTP)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="py-2 px-4 border border-slate-100 dark:border-neutral-800 dark:text-neutral-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-950"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {formLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRM DELETE */}
      <AnimatePresence>
        {isDeleteModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            ></motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-850 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-neutral-200">
                    Purge User & Financial Records?
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    You are about to delete user <strong className="text-slate-700 dark:text-neutral-300 font-bold">{selectedUser.name}</strong> ({selectedUser.email}).
                  </p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-950/30 mt-3">
                    <strong>CRITICAL WARNING:</strong> This action is irreversible. All associated <strong>budgets, categories, and transaction history</strong> will be permanently deleted from the database.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-center gap-3 border-t border-slate-100 dark:border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="py-2 px-4 border border-slate-100 dark:border-neutral-800 dark:text-neutral-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-950"
                  >
                    Cancel and Keep
                  </button>
                  <button
                    type="button"
                    disabled={formLoading}
                    onClick={handleDeleteUser}
                    className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {formLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Delete & Purge Data
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
