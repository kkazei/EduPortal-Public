import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown } from 'lucide-react';
import { useSchoolYearStore } from '../store/schoolYearStore';

export default function SchoolYearSwitcher({ onChange, variant = 'default', className = '' }) {
  const { years, current, selected, fetchYears, selectYear, loading } = useSchoolYearStore();

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  useEffect(() => {
    if (onChange && selected) onChange(selected);
  }, [selected, onChange]);

  const isCompact = variant === 'compact' || variant === 'compactInverted';
  const isInverted = variant === 'inverted' || variant === 'compactInverted';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative ${className}`}
    >
      <div className="flex items-center gap-2">
        {/* Icon and Label */}
        <div className={`${isCompact ? 'hidden' : 'flex'} items-center gap-2 ${isInverted ? 'text-white/90' : 'text-gray-700'}`}>
          <Calendar className={`w-4 h-4 ${isInverted ? 'text-white/70' : 'text-primary-600'}`} />
          <span className={`text-sm font-medium ${isInverted ? 'text-white/80' : 'text-gray-600'}`}>
            School Year
          </span>
        </div>

        {/* Modern Select Dropdown */}
        <div className="relative">
          <select
            className={`
              appearance-none cursor-pointer font-semibold
              ${isCompact ? 'max-w-[46vw] rounded-lg py-1.5 pl-2 pr-7 text-xs' : 'rounded-xl py-2 pl-3 pr-8 text-sm'}
              transition-all duration-200
              ${isInverted 
                ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15 focus:bg-white/15 focus:border-white/40 backdrop-blur-sm shadow-lg' 
                : 'bg-white text-gray-800 border border-gray-200 hover:border-primary-300 focus:border-primary-500 shadow-sm hover:shadow-md'
              }
              focus:outline-none focus:ring-2 ${isInverted ? 'focus:ring-white/30' : 'focus:ring-primary-500/20'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            disabled={loading}
            value={selected || current?.name || ''}
            onChange={(e) => selectYear(e.target.value)}
          >
            {current?.name && !years?.some(y => y.name === current.name) && (
              <option key={current.name} value={current.name}>
                {current.name} (active)
              </option>
            )}
            {years?.map((y) => (
              <option key={y.id} value={y.name}>
                {y.name}{y.is_active ? ' (active)' : ''}
              </option>
            ))}
          </select>

          {/* Custom Chevron Icon */}
          <ChevronDown 
            className={`
              absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none
              ${isInverted ? 'text-white/70' : 'text-gray-500'}
            `} 
          />

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${
                isInverted ? 'border-white/50' : 'border-primary-500'
              }`}></div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
