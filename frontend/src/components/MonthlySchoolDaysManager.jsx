import { useEffect, useState } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { useSchoolYearStore } from '../store/schoolYearStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, RefreshCcw, Calendar, Loader, AlertCircle, CheckCircle } from 'lucide-react';

const MONTH_ORDER = ['June','July','August','September','October','November','December','January','February','March'];

export default function MonthlySchoolDaysManager() {
  const { selected } = useSchoolYearStore();
  const { monthlySchoolDays, monthlySchoolDaysLoading, getMonthlySchoolDays, updateMonthlySchoolDays, message, error, clearMessages } = useAttendanceStore();
  const [editing, setEditing] = useState({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (selected) {
      getMonthlySchoolDays(selected).then(data => {
        if (data?.months) setEditing(data.months);
      }).catch(()=>{});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const onChange = (m, val) => {
    const num = val === '' ? '' : Number(val);
    if (num !== '' && (isNaN(num) || num < 0 || num > 31)) return; // basic guard
    setEditing(prev => ({ ...prev, [m]: num === '' ? '' : num }));
    setDirty(true);
  };

  const onResetDefaults = () => {
    if (!monthlySchoolDays?.months) return;
    setEditing(monthlySchoolDays.months);
    setDirty(false);
    clearMessages();
  };

  const onSave = async () => {
    clearMessages();
    const payload = {}; // only include valid numeric entries
    for (const m of MONTH_ORDER) {
      const v = editing[m];
      if (typeof v === 'number' && v >= 0) payload[m] = v;
    }
    try {
      await updateMonthlySchoolDays(payload, selected);
      setDirty(false);
    } catch (_) {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mt-8"
    >
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <Calendar className="h-24 w-24" />
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Monthly School Days</h2>
            <p className="text-purple-100 text-sm">
              School Year: <span className="font-semibold">{selected || '—'}</span>
            </p>
          </div>
          {monthlySchoolDaysLoading && (
            <div className="flex items-center gap-2 text-sm">
              <Loader className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Updating...</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Status Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3"
            >
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">{message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onResetDefaults}
            disabled={monthlySchoolDaysLoading || !dirty}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset Changes
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSave}
            disabled={monthlySchoolDaysLoading || !dirty}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {monthlySchoolDaysLoading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </motion.button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 font-semibold text-gray-700">Month</th>
                <th className="py-3 px-6 font-semibold text-gray-700">School Days</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {MONTH_ORDER.map((m, index) => (
                  <motion.tr
                    key={m}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b last:border-0 hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="py-4 px-6 text-gray-800 font-medium">{m}</td>
                    <td className="py-4 px-6">
                      <input
                        type="number"
                        min={0}
                        max={31}
                        value={editing[m] ?? ''}
                        onChange={e => onChange(m, e.target.value)}
                        className="w-32 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={monthlySchoolDaysLoading}
                        placeholder="0"
                      />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}