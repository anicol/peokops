import { useQuery } from 'react-query';
import api from '@/services/api';
import { Shield, AlertTriangle, CheckCircle, Users, FileText, Lock, Activity } from 'lucide-react';

interface SecurityMetrics {
  total_users: number;
  active_users_30d: number;
  inactive_users: number;
  failed_login_attempts_24h: number;
  data_retention_status: 'compliant' | 'warning' | 'critical';
  last_audit_date: string | null;
  pending_reviews: number;
  critical_findings_open: number;
  compliance_score: number;
}

interface AuditLog {
  id: number;
  timestamp: string;
  user_email: string;
  action: string;
  resource: string;
  ip_address: string;
  status: 'success' | 'failed';
}

export default function SecurityCompliancePage() {
  // Fetch security metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<SecurityMetrics>(
    'security-metrics',
    async () => {
      const response = await api.get('/api/admin/security-metrics/');
      return response.data;
    }
  );

  // Fetch recent audit logs
  const { data: auditLogs, isLoading: logsLoading } = useQuery<AuditLog[]>(
    'audit-logs',
    async () => {
      const response = await api.get('/api/admin/audit-logs/?limit=10');
      return response.data;
    }
  );

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading security metrics...</div>
      </div>
    );
  }

  const complianceScore = metrics?.compliance_score || 0;
  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRetentionStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security & Compliance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor security posture and compliance status
        </p>
      </div>

      {/* Compliance Score */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${complianceScore >= 90 ? 'bg-green-100' : complianceScore >= 70 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <Shield className={`w-12 h-12 ${getComplianceColor(complianceScore)}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Compliance Score</h2>
              <div className={`text-4xl font-bold ${getComplianceColor(complianceScore)}`}>
                {complianceScore}%
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {complianceScore >= 90 && 'Excellent - Fully compliant'}
                {complianceScore >= 70 && complianceScore < 90 && 'Good - Minor issues to address'}
                {complianceScore < 70 && 'Needs attention - Action required'}
              </p>
            </div>
          </div>

          {metrics?.last_audit_date && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Last Audit</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date(metrics.last_audit_date).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">Active Users</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics?.active_users_30d || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            of {metrics?.total_users || 0} total users (30 days)
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-600">Failed Logins</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics?.failed_login_attempts_24h || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Last 24 hours
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600">Data Retention</span>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRetentionStatusBadge(metrics?.data_retention_status || 'compliant')}`}>
              {metrics?.data_retention_status === 'compliant' && 'Compliant'}
              {metrics?.data_retention_status === 'warning' && 'Review Needed'}
              {metrics?.data_retention_status === 'critical' && 'Action Required'}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">Open Issues</h2>
          </div>

          <div className="space-y-3">
            {metrics?.inactive_users && metrics.inactive_users > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">Inactive Users</div>
                  <div className="text-xs text-gray-500">{metrics.inactive_users} users haven't logged in for 90+ days</div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  Review
                </button>
              </div>
            )}

            {metrics?.critical_findings_open && metrics.critical_findings_open > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">Critical Findings</div>
                  <div className="text-xs text-gray-500">{metrics.critical_findings_open} critical issues need attention</div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  View
                </button>
              </div>
            )}

            {metrics?.pending_reviews && metrics.pending_reviews > 0 && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">Pending Reviews</div>
                  <div className="text-xs text-gray-500">{metrics.pending_reviews} inspections awaiting review</div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  Review
                </button>
              </div>
            )}

            {(!metrics?.inactive_users && !metrics?.critical_findings_open && !metrics?.pending_reviews) && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-700">No open issues</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Lock className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Security Policies</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-900">Password Policy</span>
              </div>
              <span className="text-xs text-gray-500">Active</span>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-900">Two-Factor Auth</span>
              </div>
              <span className="text-xs text-gray-500">Recommended</span>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-900">Session Timeout</span>
              </div>
              <span className="text-xs text-gray-500">30 min</span>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-900">Audit Logging</span>
              </div>
              <span className="text-xs text-gray-500">Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
        </div>

        {logsLoading ? (
          <div className="p-6 text-center text-gray-500">Loading audit logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.user_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No recent activity
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
