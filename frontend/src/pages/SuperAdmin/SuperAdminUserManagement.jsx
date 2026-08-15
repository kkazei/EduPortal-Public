import { useEffect, useState } from 'react';
import { useSuperadminStore } from '../../store/superadminStore';
import { Users, Plus, Search, Filter, Trash2, RotateCcw, Copy, UserPlus, Shield, AlertTriangle, X, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuperAdminUserManagement() {
  const { users, loading, error, fetchUsers, updateRole, createUser, deleteUser, restoreUser, requestActionCode } = useSuperadminStore();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState('role_asc');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ user_fullname: '', user_email: '', user_role: 'teacher', teacher_title: 'Teacher I', password: '' });
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ show: false, user: null });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteActionCodeId, setDeleteActionCodeId] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  
  // Restore modal state
  const [restoreModal, setRestoreModal] = useState({ show: false, user: null });
  const [restoreActionCodeId, setRestoreActionCodeId] = useState(null);
  const [restoreCode, setRestoreCode] = useState('');
  
  // Role change modal state
  const [roleChangeModal, setRoleChangeModal] = useState({ show: false, user: null, newRole: '' });
  const [roleChangeActionCodeId, setRoleChangeActionCodeId] = useState(null);
  const [roleChangeCode, setRoleChangeCode] = useState('');

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    if (!deleteCode || !deleteActionCodeId) {
      toast.error('Enter the email code first');
      return;
    }
    try {
      await deleteUser(deleteModal.user.id, deleteActionCodeId, deleteCode, deleteConfirmText);
      toast.success('User deleted successfully');
      setDeleteModal({ show: false, user: null });
      setDeleteConfirmText('');
      setDeleteCode('');
      setDeleteActionCodeId(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete user');
    }
  };
  
  const handleRoleChange = async () => {
    if (!roleChangeCode || !roleChangeActionCodeId) {
      toast.error('Enter the email code first');
      return;
    }
    try {
      await updateRole(roleChangeModal.user.id, roleChangeModal.newRole, roleChangeActionCodeId, roleChangeCode);
      toast.success('User role updated successfully');
      setRoleChangeModal({ show: false, user: null, newRole: '' });
      setRoleChangeCode('');
      setRoleChangeActionCodeId(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update role');
    }
  };
  
  const handleRestore = async () => {
    if (!restoreCode || !restoreActionCodeId) {
      toast.error('Enter the email code first');
      return;
    }
    try {
      await restoreUser(restoreModal.user.id, restoreActionCodeId, restoreCode);
      toast.success('User restored successfully');
      setRestoreModal({ show: false, user: null });
      setRestoreCode('');
      setRestoreActionCodeId(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to restore user');
    }
  };

  useEffect(() => { fetchUsers(q, role, sort, showDeleted); }, [q, role, sort, showDeleted, fetchUsers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pt-20 sm:pt-24 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-600 text-white p-6 sm:p-8 rounded-2xl shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
            <Users className="w-32 h-32 sm:w-40 sm:h-40" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold">User Management</h1>
                <p className="text-primary-100 mt-1">Manage all system users and permissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="card-modern p-4 sm:p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filters & Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                value={q} 
                onChange={(e)=>setQ(e.target.value)} 
                placeholder="Search name, email, or ID (e.g. 42 or id:42)" 
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm"
              />
            </div>

            {/* Role Filter */}
            <select 
              value={role} 
              onChange={(e)=>setRole(e.target.value)} 
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm"
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm"
            >
              <option value="role_asc">Sort: Role (A→Z)</option>
              <option value="role_desc">Sort: Role (Z→A)</option>
              <option value="name_asc">Sort: Name (A→Z)</option>
              <option value="name_desc">Sort: Name (Z→A)</option>
              <option value="created_desc">Sort: Recently created</option>
              <option value="created_asc">Sort: Oldest first</option>
            </select>

            {/* Show Deleted Checkbox */}
            <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={showDeleted} onChange={(e)=>setShowDeleted(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500" />
              <span className="text-sm text-gray-700">Show deleted</span>
            </label>

            {/* Create Button */}
            <button 
              onClick={()=>setShowCreate(v=>!v)} 
              className="lg:col-start-3 bg-gradient-to-br from-success-500 to-success-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:from-success-600 hover:to-success-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center"
            >
              {showCreate ? (
                <>
                  <span>Close</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  <span>Create User</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Create User Form */}
        {showCreate && (
          <div className="card-modern p-4 sm:p-6 mb-6 animate-slide-down">
            <div className="flex items-center mb-4">
              <UserPlus className="w-5 h-5 text-success-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Create New User</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input 
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm" 
                placeholder="Full name" 
                value={form.user_fullname} 
                onChange={(e)=>setForm(f=>({...f, user_fullname:e.target.value}))} 
              />
              <input 
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm" 
                placeholder="Email" 
                value={form.user_email} 
                onChange={(e)=>setForm(f=>({...f, user_email:e.target.value}))} 
              />
              <select 
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm" 
                value={form.user_role} 
                onChange={(e)=>setForm(f=>({...f, user_role:e.target.value}))}
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
              {form.user_role === 'teacher' ? (
                <select 
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm" 
                  value={form.teacher_title} 
                  onChange={(e)=>setForm(f=>({...f, teacher_title:e.target.value}))}
                >
                  {['Teacher I','Teacher II','Teacher III','Master Teacher I','Master Teacher II','Master Teacher III','Master Teacher IV'].map(t=> (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              ) : (
                <input 
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm" 
                  placeholder="Temporary password (optional)" 
                  value={form.password} 
                  onChange={(e)=>setForm(f=>({...f, password:e.target.value}))} 
                />
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                className="bg-gradient-to-br from-success-500 to-success-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:from-success-600 hover:to-success-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center"
                disabled={loading}
                onClick={async ()=>{
                  try {
                    const payload = { ...form };
                    if (form.user_role !== 'teacher') delete payload.teacher_title;
                    const res = await createUser(payload);
                    setShowCreate(false);
                    setForm({ user_fullname: '', user_email: '', user_role: 'teacher', teacher_title: 'Teacher I', password: '' });
                    const temp = res?.tempPassword;
                    if (temp) {
                      alert(`User created successfully!\nTemporary password: ${temp}`);
                    } else {
                      alert('User created successfully!');
                    }
                  } catch (e) {
                    alert(e?.response?.data?.message || 'Failed to create user');
                  }
                }}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create User
              </button>
              <span className="text-xs text-gray-500">💡 If password is left blank, a strong temp password is generated and shown once.</span>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="card-modern overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-primary-50 to-secondary-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider w-[120px]">User ID</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">Full Name</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">Role</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-primary-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.is_deleted ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1 font-medium">{u.id}</span>
                        <button
                          type="button"
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center"
                          onClick={() => {
                            navigator.clipboard?.writeText?.(String(u.id));
                            // Optional: Show a toast notification
                          }}
                          title="Copy ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{u.user_fullname}</span>
                        {u.is_deleted && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Deleted</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{u.user_email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                        {u.user_role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <select 
                            disabled={loading || u.is_deleted || u.user_role === 'student'} 
                            value={u.user_role} 
                            onChange={(e) => {
                              if (u.user_role === 'student') {
                                toast.error('Cannot change role for student accounts');
                                return;
                              }
                              const newRole = e.target.value;
                              setRoleChangeModal({ show: true, user: u, newRole });
                              // Request action code email immediately
                              requestActionCode('update_role', u.id)
                                .then(d => {
                                  setRoleChangeActionCodeId(d.action_code_id);
                                  toast.success('Email code sent');
                                })
                                .catch(err => toast.error(err?.response?.data?.message || 'Failed to send code'));
                              e.target.value = u.user_role; // Reset select to current value
                            }} 
                            className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            title={u.user_role === 'student' ? 'Cannot change role for student accounts' : 'Change user role'}
                          >
                            {u.user_role === 'teacher' ? (
                              <>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Superadmin</option>
                              </>
                            ) : (
                              <>
                                <option value="teacher">Teacher</option>
                                <option value="student">Student</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Superadmin</option>
                              </>
                            )}
                          </select>
                        {!u.is_deleted ? (
                          <button
                            className="group relative px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                            disabled={loading}
                            onClick={() => setDeleteModal({ show: true, user: u })}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <button
                            className="group relative px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                            disabled={loading}
                            onClick={() => setRestoreModal({ show: true, user: u })}
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">
                          {loading ? 'Loading users...' : 'No users found.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modern Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm" 
              onClick={() => {
                setDeleteModal({ show: false, user: null });
                setDeleteConfirmText('');
                setDeleteCode('');
                setDeleteActionCodeId(null);
              }}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full animate-dropdown">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Delete User</h3>
                  </div>
                  <button
                    onClick={() => {
                      setDeleteModal({ show: false, user: null });
                      setDeleteConfirmText('');
                      setDeleteCode('');
                      setDeleteActionCodeId(null);
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
                    You are about to delete:
                  </p>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="font-bold text-gray-900">{deleteModal.user?.user_fullname}</p>
                    <p className="text-sm text-gray-600">{deleteModal.user?.user_email}</p>
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      {deleteModal.user?.user_role}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Confirmation text input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type <span className="text-red-600 font-bold">DELETE</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Email code input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-red-600"/> Email Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={deleteCode}
                        onChange={(e) => setDeleteCode(e.target.value)}
                        placeholder="6-digit code"
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none tracking-widest font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!deleteModal.user) return;
                          requestActionCode('delete_user', deleteModal.user.id)
                            .then(d => { setDeleteActionCodeId(d.action_code_id); toast.success('Email code sent'); })
                            .catch(err => toast.error(err?.response?.data?.message || 'Failed to send code'));
                        }}
                        className="px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                      >
                        Send Code
                      </button>
                    </div>
                    {deleteActionCodeId && <p className="mt-2 text-xs text-gray-500">Code sent. Expires in ~5 minutes.</p>}
                  </div>
                </div>

                <div className="mt-5 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This action will soft-delete the user. They will no longer be able to sign in.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteModal({ show: false, user: null });
                    setDeleteConfirmText('');
                    setDeleteCode('');
                    setDeleteActionCodeId(null);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading || deleteConfirmText !== 'DELETE' || !deleteCode || !deleteActionCodeId}
                  className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  {loading ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      <Mail className="h-4 w-4 text-green-600"/> Email Code
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

      {/* Modern Role Change Confirmation Modal */}
      {roleChangeModal.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm" 
              onClick={() => {
                setRoleChangeModal({ show: false, user: null, newRole: '' });
                setRoleChangeCode('');
                setRoleChangeActionCodeId(null);
              }}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full animate-dropdown">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Change User Role</h3>
                  </div>
                  <button
                    onClick={() => {
                      setRoleChangeModal({ show: false, user: null, newRole: '' });
                      setRoleChangeCode('');
                      setRoleChangeActionCodeId(null);
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
                    You are about to change the role for:
                  </p>
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="font-bold text-gray-900">{roleChangeModal.user?.user_fullname}</p>
                    <p className="text-sm text-gray-600">{roleChangeModal.user?.user_email}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        Current: {roleChangeModal.user?.user_role}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                        New: {roleChangeModal.newRole}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Email code input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-indigo-600"/> Email Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={roleChangeCode}
                        onChange={(e) => setRoleChangeCode(e.target.value)}
                        placeholder="6-digit code"
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none tracking-widest font-mono"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!roleChangeModal.user) return;
                          requestActionCode('update_role', roleChangeModal.user.id)
                            .then(d => { setRoleChangeActionCodeId(d.action_code_id); toast.success('Email code sent'); })
                            .catch(err => toast.error(err?.response?.data?.message || 'Failed to send code'));
                        }}
                        className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Send Code
                      </button>
                    </div>
                    {roleChangeActionCodeId && <p className="mt-2 text-xs text-gray-500">Code sent. Expires in ~5 minutes.</p>}
                  </div>
                </div>

                <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    <strong>Important:</strong> Changing roles will affect the user's permissions and access to different parts of the system.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  onClick={() => {
                    setRoleChangeModal({ show: false, user: null, newRole: '' });
                    setRoleChangeCode('');
                    setRoleChangeActionCodeId(null);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleChange}
                  disabled={loading || !roleChangeCode || !roleChangeActionCodeId}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  {loading ? 'Updating...' : 'Change Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
