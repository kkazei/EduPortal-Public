import { useEffect, useMemo, useState } from 'react';
import { useSuperadminStore } from '../../store/superadminStore';
import { Archive, Search, Filter, RotateCcw, Clock, AlertTriangle, Mail, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuperAdminArchivedUsers() {
  const { users, loading, error, fetchUsers, restoreUser, requestActionCode } = useSuperadminStore();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState('created_desc');
  
  // Restore modal state
  const [restoreModal, setRestoreModal] = useState({ show: false, user: null });
  const [restoreActionCodeId, setRestoreActionCodeId] = useState(null);
  const [restoreCode, setRestoreCode] = useState('');

  useEffect(() => {
    fetchUsers(q, role, sort, true, true); // includeDeleted=true, onlyDeleted=true
  }, [q, role, sort, fetchUsers]);

  const handleRestore = async () => {
    if (!restoreCode || !restoreActionCodeId) {
      toast.error('Enter the email code first');
      return;
    }
    try {
      // Pass refetchArgs to keep archived-only filter after restore
      await restoreUser(restoreModal.user.id, restoreActionCodeId, restoreCode, [q, role, sort, true, true]);
      toast.success('User restored successfully');
      setRestoreModal({ show: false, user: null });
      setRestoreCode('');
      setRestoreActionCodeId(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to restore user');
    }
  };

  const daysLeft = (deletedAt) => {
    if (!deletedAt) return null;
    const del = new Date(deletedAt);
    const now = new Date();
    const diff = Math.ceil((del.getTime() + 7*24*60*60*1000 - now.getTime()) / (24*60*60*1000));
    return Math.max(diff, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pt-20 sm:pt-24 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 sm:p-8 rounded-2xl shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
            <Archive className="w-32 h-32 sm:w-40 sm:h-40" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center mb-2">
              <Archive className="w-7 h-7 mr-3" />
              <h1 className="text-2xl sm:text-3xl font-bold">Archived Users</h1>
            </div>
            <p className="text-orange-100">Deleted users - Can be restored within 7 days</p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-yellow-900 mb-1">Important Notice</h3>
            <p className="text-sm text-yellow-800">
              Deleted users are permanently removed after 7 days. Restore users before the deadline to reinstate their access.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                value={q} 
                onChange={(e)=>setQ(e.target.value)} 
                placeholder="Search name, email, or ID (e.g. 42 or id:42)" 
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-sm"
              />
            </div>

            {/* Role Filter */}
            <select 
              value={role} 
              onChange={(e)=>setRole(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-sm"
            >
              <option value="">All roles</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>

            {/* Sort */}
            <select 
              value={sort} 
              onChange={(e)=>setSort(e.target.value)} 
              className="w-full sm:col-span-2 lg:col-span-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none text-sm"
            >
              <option value="created_desc">Sort: Deleted recently</option>
              <option value="created_asc">Sort: Deleted oldest</option>
              <option value="name_asc">Sort: Name (A→Z)</option>
              <option value="name_desc">Sort: Name (Z→A)</option>
              <option value="role_asc">Sort: Role (A→Z)</option>
              <option value="role_desc">Sort: Role (Z→A)</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Total Archived</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
            <p className="text-2xl font-bold text-orange-600">
              {users.filter(u => daysLeft(u.deleted_at) <= 2).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <p className="text-lg font-semibold text-green-600 flex items-center">
              {loading ? 'Loading...' : 'Ready'}
            </p>
          </div>
        </div>

        {/* Archived Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-[110px]">User ID</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Full Name</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Deleted</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Days Left</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => {
                  const days = daysLeft(u.deleted_at);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors bg-red-50/30">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1 font-medium">{u.id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{u.user_fullname}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{u.user_email}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {u.user_role}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-600">
                        {u.deleted_at ? new Date(u.deleted_at).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                          <span className={`text-sm font-medium ${
                            days <= 2 ? 'text-red-600' : days <= 4 ? 'text-orange-600' : 'text-gray-900'
                          }`}>
                            {days} {days === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          className="text-green-700 hover:text-green-800 flex items-center text-sm font-medium disabled:opacity-50 transition-colors"
                          disabled={loading}
                          onClick={() => {
                            setRestoreModal({ show: true, user: u });
                            // Auto-request code
                            requestActionCode('restore_user', u.id)
                              .then(d => {
                                setRestoreActionCodeId(d.action_code_id);
                                toast.success('Email code sent');
                              })
                              .catch(err => toast.error(err?.response?.data?.message || 'Failed to send code'));
                          }}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Restore
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Archive className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">
                          {loading ? 'Loading archived users...' : 'No archived users found.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modern Restore Confirmation Modal */}
        {restoreModal.show && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div 
                className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm" 
                onClick={() => {
                  setRestoreModal({ show: false, user: null });
                  setRestoreCode('');
                  setRestoreActionCodeId(null);
                }}
              />

              {/* Modal panel */}
              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full animate-dropdown">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <RotateCcw className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Restore User</h3>
                    </div>
                    <button
                      onClick={() => {
                        setRestoreModal({ show: false, user: null });
                        setRestoreCode('');
                        setRestoreActionCodeId(null);
                      }}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                  <div className="mb-5">
                    <p className="text-gray-700 mb-2">
                      You are about to restore:
                    </p>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="font-bold text-gray-900">{restoreModal.user?.user_fullname}</p>
                      <p className="text-sm text-gray-600">{restoreModal.user?.user_email}</p>
                      <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        {restoreModal.user?.user_role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Email code input */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-green-600" /> Email Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={restoreCode}
                          onChange={(e) => setRestoreCode(e.target.value)}
                          placeholder="6-digit code"
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none tracking-widest font-mono"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!restoreModal.user) return;
                            requestActionCode('restore_user', restoreModal.user.id)
                              .then(d => { setRestoreActionCodeId(d.action_code_id); toast.success('Email code sent'); })
                              .catch(err => toast.error(err?.response?.data?.message || 'Failed to send code'));
                          }}
                          className="px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                        >
                          Send Code
                        </button>
                      </div>
                      {restoreActionCodeId && <p className="mt-2 text-xs text-gray-500">Code sent. Expires in ~5 minutes.</p>}
                    </div>
                  </div>

                  <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> This will restore the user's account and they will be able to sign in again.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                  <button
                    onClick={() => {
                      setRestoreModal({ show: false, user: null });
                      setRestoreCode('');
                      setRestoreActionCodeId(null);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRestore}
                    disabled={loading || !restoreCode || !restoreActionCodeId}
                    className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                  >
                    {loading ? 'Restoring...' : 'Restore User'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

