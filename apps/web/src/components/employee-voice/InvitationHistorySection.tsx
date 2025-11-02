import { useState } from 'react';
import { useQuery } from 'react-query';
import { employeeVoiceAPI, type EmployeeVoiceInvitation } from '@/services/api';
import { Send, CheckCircle, Eye, Clock, Loader2 } from 'lucide-react';

interface InvitationHistorySectionProps {
  storeId: number;
}

export default function InvitationHistorySection({ storeId }: InvitationHistorySectionProps) {
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'SENT' | 'OPENED' | 'COMPLETED'>('all');

  const { data: invitations, isLoading } = useQuery(
    ['employee-voice-invitations', storeId],
    () => employeeVoiceAPI.getInvitations(),
    {
      enabled: !!storeId,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'SENT':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'OPENED':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-700',
      SENT: 'bg-blue-100 text-blue-700',
      OPENED: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-green-100 text-green-700',
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          colors[status] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </span>
    );
  };

  const filteredInvitations =
    filter === 'all'
      ? invitations
      : invitations?.filter((inv) => inv.status === filter);

  const statusCounts = invitations?.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Sent</p>
          <p className="text-2xl font-bold text-gray-900">{invitations?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Opened</p>
          <p className="text-2xl font-bold text-yellow-600">{statusCounts?.OPENED || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{statusCounts?.COMPLETED || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Response Rate</p>
          <p className="text-2xl font-bold text-blue-600">
            {invitations && invitations.length > 0
              ? Math.round(
                  ((statusCounts?.COMPLETED || 0) / invitations.length) * 100
                )
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-sm rounded-md ${
            filter === 'all'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('SENT')}
          className={`px-3 py-1 text-sm rounded-md ${
            filter === 'SENT'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Sent ({statusCounts?.SENT || 0})
        </button>
        <button
          onClick={() => setFilter('OPENED')}
          className={`px-3 py-1 text-sm rounded-md ${
            filter === 'OPENED'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Opened ({statusCounts?.OPENED || 0})
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={`px-3 py-1 text-sm rounded-md ${
            filter === 'COMPLETED'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Completed ({statusCounts?.COMPLETED || 0})
        </button>
      </div>

      {/* Invitation List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!filteredInvitations || filteredInvitations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Send className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No invitations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opened At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.recipient_phone?.slice(0, 7) || 'N/A'}***
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invitation.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invitation.sent_at
                        ? new Date(invitation.sent_at).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invitation.opened_at
                        ? new Date(invitation.opened_at).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invitation.completed_at
                        ? new Date(invitation.completed_at).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
