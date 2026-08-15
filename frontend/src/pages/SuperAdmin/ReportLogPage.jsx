import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuditLogStore } from '../../store/auditLogStore';
import { formatAuditAction } from '../../utils/formatAuditAction';
import { FileText, Download, Calendar, Filter, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SuperAdminReportLogPage() {
  const { logs, total, loading, error, fetchLogs, connectStream, disconnectStream } = useAuditLogStore();
  const [filters, setFilters] = useState({ page: 1, limit: '25', action: '', user_id: '', from: '', to: '', role: '' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Action code modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'export_audit_logs' | 'delete_audit_logs'
  const [codeId, setCodeId] = useState(null);
  const [codeValue, setCodeValue] = useState('');
  const [deleteAll, setDeleteAll] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => { fetchLogs(filters); }, [fetchLogs, filters]);

  // Start live stream when page mounts; stop on unmount
  useEffect(() => {
    connectStream();
    return () => disconnectStream();
  }, [connectStream, disconnectStream]);

  const onChange = (e) => setFilters(f => ({ ...f, [e.target.name]: e.target.value, page: 1 }));

  const limitNumber = useMemo(() => (filters.limit === 'all' ? null : parseInt(filters.limit || '25', 10)), [filters.limit]);
  const totalPages = useMemo(() => {
    if (!limitNumber) return 1;
    return Math.max(1, Math.ceil((total || 0) / limitNumber));
  }, [limitNumber, total]);

  const canPrev = filters.page > 1 && filters.limit !== 'all';
  const canNext = filters.page < totalPages && filters.limit !== 'all';

  const goToPage = (p) => {
    if (filters.limit === 'all') return; // no pagination when viewing all
    const page = Math.min(Math.max(1, p), totalPages);
    setFilters(f => ({ ...f, page }));
  };

  const showingStart = useMemo(() => {
    if (filters.limit === 'all') return logs.length ? 1 : 0;
    const base = (filters.page - 1) * (limitNumber || 0);
    return logs.length ? base + 1 : base;
  }, [filters.limit, filters.page, limitNumber, logs.length]);

  const showingEnd = useMemo(() => {
    if (filters.limit === 'all') return logs.length;
    return showingStart + logs.length - 1;
  }, [filters.limit, logs.length, showingStart]);

  const clearFilters = () => {
    setFilters({ page: 1, limit: '25', action: '', user_id: '', from: '', to: '', role: '' });
  };

  const hasActiveFilters = filters.action || filters.user_id || filters.from || filters.to || filters.role;

  const requestActionCode = async (type) => {
    try {
      setBusy(true);
      setCodeId(null); setCodeValue(''); setExpiresAt(null);
      const url = `${import.meta.env.MODE === 'development' ? 'http://localhost:5000' : ''}/api/superadmin/users/action-code`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action_type: type })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed requesting code');
      setCodeId(data.data.action_code_id);
      setExpiresAt(data.data.expires_at);
    } catch (e) {
      alert(e.message || 'Could not request code');
    } finally { setBusy(false); }
  };

  const performExport = async () => {
    try {
      setBusy(true);
      const params = new URLSearchParams();
      if (filters.action) params.set('action', filters.action);
      if (filters.user_id) params.set('user_id', filters.user_id);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      const url = `${import.meta.env.MODE === 'development' ? 'http://localhost:5000' : ''}/api/audit-logs/export?${params.toString()}`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'x-action-code-id': codeId,
          'x-action-code': codeValue
        }
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>null);
        throw new Error(j?.message || 'Export failed');
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setModalOpen(false);
    } catch (e) {
      alert(e.message || 'Failed to export logs');
    } finally { setBusy(false); }
  };

  const performDelete = async () => {
    if (!confirm(deleteAll ? 'Delete ALL audit logs? This cannot be undone.' : 'Delete filtered audit logs? This cannot be undone.')) return;
    try {
      setBusy(true);
      const params = new URLSearchParams();
      if (!deleteAll) {
        if (filters.action) params.set('action', filters.action);
        if (filters.user_id) params.set('user_id', filters.user_id);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
      } else {
        params.set('all', 'true');
      }
      const url = `${import.meta.env.MODE === 'development' ? 'http://localhost:5000' : ''}/api/audit-logs?${params.toString()}`;
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'x-action-code-id': codeId,
          'x-action-code': codeValue
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Deletion failed');
      alert(`Deleted ${data.deleted} logs.`);
      setModalOpen(false);
      // refresh list
      setFilters(f => ({ ...f }));
    } catch (e) {
      alert(e.message || 'Failed to delete logs');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 pt-20 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Audit Logs
              </h1>
              <p className="text-gray-600 text-sm">Super Admin - Comprehensive audit trail with advanced controls</p>
            </div>
          </div>
        </motion.div>

        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <h2 className="font-semibold text-gray-800">Filters & Actions</h2>
              {hasActiveFilters && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {isFilterOpen ? 'Hide' : 'Show'} Filters
              </button>
            </div>
          </div>

          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search Action */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Search className="h-4 w-4 inline mr-1" />
                    Search Action
                  </label>
                  <input
                    name="action"
                    value={filters.action}
                    onChange={onChange}
                    placeholder="Search action..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* User ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User ID
                  </label>
                  <input
                    name="user_id"
                    value={filters.user_id}
                    onChange={onChange}
                    placeholder="Enter user ID..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Role Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={filters.role}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  >
                    <option value="">All Roles</option>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    From Date
                  </label>
                  <input
                    type="date"
                    name="from"
                    value={filters.from}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    To Date
                  </label>
                  <input
                    type="date"
                    name="to"
                    value={filters.to}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Items per page */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Items per Page
                  </label>
                  <select
                    name="limit"
                    value={filters.limit}
                    onChange={onChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
                <button 
                  onClick={() => { setModalType('export_audit_logs'); setModalOpen(true); codeId && setCodeId(null); setCodeValue(''); }} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center shadow-sm hover:shadow-md ml-auto"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Export CSV
                </button>
                <button 
                  onClick={() => { setModalType('delete_audit_logs'); setModalOpen(true); codeId && setCodeId(null); setCodeValue(''); }} 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center shadow-sm hover:shadow-md"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete Logs
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-500">Loading logs...</p>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No logs found</p>
                      <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((l, idx) => (
                    <motion.tr
                      key={l.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-800 font-medium">
                            {l.user_fullname || l.user_email || '—'} 
                            {l.user_id ? <span className="text-xs text-gray-500 ml-1">(ID: {l.user_id})</span> : null}
                          </span>
                          <span className="text-xs text-gray-500">{l.user_email || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          l.user_role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                          l.user_role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          l.user_role === 'teacher' ? 'bg-orange-100 text-orange-800' :
                          l.user_role === 'student' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {l.user_role || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatAuditAction(l)}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                {filters.limit === 'all' ? (
                  <>Showing <span className="font-semibold text-gray-900">{logs.length}</span> of <span className="font-semibold text-gray-900">{total}</span> logs</>
                ) : (
                  <>Showing <span className="font-semibold text-gray-900">{showingStart}</span> to <span className="font-semibold text-gray-900">{showingEnd}</span> of <span className="font-semibold text-gray-900">{total}</span> logs</>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(1)}
                  disabled={!canPrev}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => goToPage(filters.page - 1)}
                  disabled={!canPrev}
                  className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">
                  <span className="font-semibold">{filters.limit === 'all' ? 1 : filters.page}</span> / <span className="font-semibold">{totalPages}</span>
                </span>
                <button
                  onClick={() => goToPage(filters.page + 1)}
                  disabled={!canNext}
                  className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={!canNext}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 relative">
            <h2 className="text-lg font-semibold mb-1">
              {modalType === 'export_audit_logs' ? 'Export Audit Logs' : 'Delete Audit Logs'}
            </h2>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              {modalType === 'export_audit_logs' ? 'Request a verification code then enter it to export logs to CSV.' : 'Request a verification code then enter it to delete logs. This cannot be undone.'}
            </p>
            {modalType === 'delete_audit_logs' && (
              <label className="flex items-center gap-2 text-xs mb-4">
                <input type="checkbox" checked={deleteAll} onChange={e => setDeleteAll(e.target.checked)} /> Delete ALL logs (unchecked = only filtered subset)
              </label>
            )}
            {!codeId && (
              <button disabled={busy} onClick={() => requestActionCode(modalType)} className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">
                {busy ? 'Requesting…' : 'Request Security Code'}
              </button>
            )}
            {codeId && (
              <div className="space-y-3">
                <div className="text-xs text-gray-500">Code requested. Expires at {expiresAt ? new Date(expiresAt).toLocaleTimeString() : '—'}.</div>
                <input
                  autoFocus
                  placeholder="Enter 6-digit code"
                  value={codeValue}
                  onChange={e => setCodeValue(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm tracking-widest font-mono" />
                <button disabled={busy || codeValue.length < 6} onClick={modalType === 'export_audit_logs' ? performExport : performDelete} className="w-full px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium disabled:opacity-50">
                  {busy ? 'Processing…' : modalType === 'export_audit_logs' ? 'Confirm Export' : 'Confirm Deletion'}
                </button>
                <button disabled={busy} onClick={() => { setCodeId(null); setCodeValue(''); }} className="w-full px-4 py-2 rounded-md bg-gray-200 text-gray-700 text-sm font-medium disabled:opacity-50">Request New Code</button>
              </div>
            )}
            <button onClick={() => { setModalOpen(false); setCodeId(null); setCodeValue(''); }} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
