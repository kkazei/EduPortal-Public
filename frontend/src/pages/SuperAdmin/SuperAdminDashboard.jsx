import { useEffect } from 'react';
import { useAuditLogStore } from '../../store/auditLogStore';
import { useAuthStore } from '../../store/authStore';
import { Activity, Users, BarChart3, FileText, Shield, Clock } from 'lucide-react';
import { formatAuditAction } from '../../utils/formatAuditAction';
import { useSiteMetricsStore } from '../../store/siteMetricsStore';
import { Link } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const { logs, loading, fetchLogs } = useAuditLogStore();
    const { totalUnique, fetchTotal } = useSiteMetricsStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchLogs({ limit: 10 });
    fetchTotal().catch(()=>{});
  }, [fetchLogs]);

  const quickLinks = [
    {
      title: 'Report Logs',
      description: 'View audit trail',
      icon: FileText,
      href: '/superadmin/audit-logs',
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      title: 'User Management',
      description: 'Manage all users',
      icon: Users,
      href: '/superadmin/users',
      color: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Analytics',
      description: 'System insights',
      icon: BarChart3,
      href: '/superadmin/analytics',
      color: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pt-20 sm:pt-24 sm:p-8 w-full">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white p-6 sm:p-8 rounded-2xl shadow-xl mb-6 sm:mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
            <Shield className="w-32 h-32 sm:w-40 sm:h-40" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center mb-2">
              <Shield className="w-8 h-8 mr-3" />
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            </div>
            <p className="text-indigo-100 text-sm sm:text-base">Welcome, {user?.user_fullname || user?.user_email || 'Super Admin'}!</p>
          </div>
        </div>

        {/* Quick Stats - 3 column responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Visits */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Visits</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{(totalUnique || 0).toLocaleString()}</h3>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Logs</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{logs.length}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                <h3 className="text-sm font-medium text-gray-900">{new Date().toLocaleString()}</h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-600" />
                Recent Activity
              </h2>
              <Link 
                to="/superadmin/audit-logs"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b bg-gray-50/50">
                    <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700">Time</th>
                    <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700">User</th>
                    <th className="py-3 px-2 sm:px-4 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0,10).map(l => (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2 sm:px-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                        {new Date(l.created_at).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{l.user_email || '—'}</span>
                          <span className="text-xs text-gray-500 capitalize">({l.user_role || '—'})</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-sm text-gray-700 truncate max-w-xs">{formatAuditAction(l)}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                            <span className="ml-2">Loading...</span>
                          </div>
                        ) : (
                          'No recent activity.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">Quick Access</h2>
            <div className="space-y-3">
              {quickLinks.map((link, index) => (
                <Link
                  key={index}
                  to={link.href}
                  className="block p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center">
                    <div className={`${link.iconBg} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                      <link.icon className={`w-5 h-5 ${link.iconColor}`} />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-xs text-gray-500">{link.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
