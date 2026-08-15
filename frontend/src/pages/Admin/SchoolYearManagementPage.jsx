import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, AlertCircle, CheckCircle, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import MonthlySchoolDaysManager from '../../components/MonthlySchoolDaysManager';

export default function SchoolYearManagementPage() {
  const navigate = useNavigate();
  const { years, current, fetchYears, createYear, activateYear, endYear, updateYear, loading, error } = useSchoolYearStore();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lastAutoName, setLastAutoName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingStart, setEditingStart] = useState('');
  const [editingEnd, setEditingEnd] = useState('');

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!/^\d{4}-\d{4}$/.test(name)) {
      alert('Name must be in the format YYYY-YYYY');
      return;
    }
    if (!startDate || !endDate) {
      alert('Start Date and End Date are required');
      return;
    }
    // Validate order
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start Date must be before End Date');
      return;
    }
    await createYear({ name, start_date: startDate, end_date: endDate, is_active: false });
    setName('');
    setStartDate('');
    setEndDate('');
  };

  // Helpers: compute academic span from a given date string
  const spanFromStart = (d) => {
    if (!d) return '';
    const y = new Date(d).getFullYear();
    if (!y || isNaN(y)) return '';
    return `${y}-${y + 1}`;
  };
  const spanFromEnd = (d) => {
    if (!d) return '';
    const y = new Date(d).getFullYear();
    if (!y || isNaN(y)) return '';
    return `${y - 1}-${y}`;
  };

  // Auto-fill name when dates are chosen. Only override if the current
  // name is empty or equal to the previously auto-generated value.
  useEffect(() => {
    const auto = startDate ? spanFromStart(startDate) : spanFromEnd(endDate);
    if (auto) {
      if (!name || name === lastAutoName) {
        setName(auto);
      }
      setLastAutoName(auto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <Calendar className="h-32 w-32" />
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">School Year Management</h1>
            <p className="text-indigo-100">Manage academic years and active periods</p>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* School Years List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">School Years</h2>
                {current?.name && (
                  <p className="text-sm text-gray-500 mt-1">
                    Active: <span className="font-medium text-indigo-600">{current.name}</span>
                  </p>
                )}
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader className="h-4 w-4 animate-spin" />
                  Updating...
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-6 font-semibold text-gray-700">Name</th>
                  <th className="py-3 px-6 font-semibold text-gray-700">Start Date</th>
                  <th className="py-3 px-6 font-semibold text-gray-700">End Date</th>
                  <th className="py-3 px-6 font-semibold text-gray-700">Status</th>
                  <th className="py-3 px-6 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {(years || []).map((y, index) => {
                    const today = new Date().toISOString().slice(0,10);
                    const hasEnd = !!y.end_date;
                    const ended = hasEnd && y.end_date <= today;
                    const isActive = y.is_active && !ended;
                    const isInactive = !isActive && !ended;
                    return (
                      <motion.tr
                        key={y.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b last:border-0 hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="py-4 px-6 font-medium text-gray-800">{y.name}</td>
                        <td className="py-4 px-6 text-gray-600">
                          {editingId === y.id ? (
                            <input
                              type="date"
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              value={editingStart}
                              onChange={(e) => setEditingStart(e.target.value)}
                            />
                          ) : (y.start_date || '—')}
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {editingId === y.id ? (
                            <input
                              type="date"
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              value={editingEnd}
                              onChange={(e) => setEditingEnd(e.target.value)}
                            />
                          ) : (y.end_date || '—')}
                        </td>
                        <td className="py-4 px-6">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : ended ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                              Ended
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            {isInactive && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={loading}
                                onClick={() => activateYear(y.id)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-white text-xs font-medium shadow-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Set Active
                              </motion.button>
                            )}
                            {isActive && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={loading}
                                onClick={() => endYear(y.id)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-white text-xs font-medium shadow-sm bg-gray-800 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                End Now
                              </motion.button>
                            )}
                            {editingId !== y.id ? (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                disabled={loading}
                                onClick={() => {
                                  setEditingId(y.id);
                                  setEditingStart(y.start_date || '');
                                  setEditingEnd(y.end_date || '');
                                }}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-indigo-700 text-xs font-medium shadow-sm bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Edit Dates
                              </motion.button>
                            ) : (
                              <div className="flex gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  disabled={loading}
                                  onClick={async () => {
                                    if (!editingStart || !editingEnd) {
                                      alert('Start and End dates are required');
                                      return;
                                    }
                                    if (new Date(editingStart) > new Date(editingEnd)) {
                                      alert('Start date must be before End date');
                                      return;
                                    }
                                    try {
                                      await updateYear(y.id, { start_date: editingStart, end_date: editingEnd });
                                      setEditingId(null);
                                    } catch (_) {}
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-white text-xs font-medium shadow-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Save
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  disabled={loading}
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingStart('');
                                    setEditingEnd('');
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-gray-700 text-xs font-medium shadow-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Cancel
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {(!years || years.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No school years yet</p>
                      <p className="text-sm mt-1">Create your first school year to get started</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 h-fit"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Plus className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Create School Year</h2>
          </div>
          
          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name (YYYY-YYYY) <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="2025-2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create School Year
                </>
              )}
            </motion.button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              💡 Tip: Create future years in advance, then set active when ready
            </p>
          </form>
        </motion.div>
      </div>
      {/* Monthly School Days Manager */}
      <MonthlySchoolDaysManager />
    </motion.div>
  );
}
