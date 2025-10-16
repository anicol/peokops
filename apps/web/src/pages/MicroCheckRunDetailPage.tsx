import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { microCheckAPI } from '@/services/api';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';
import type { MicroCheckRun, MicroCheckResponse } from '@/types/microCheck';

export default function MicroCheckRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const { data: run, isLoading: runLoading } = useQuery<MicroCheckRun>(
    ['micro-check-run', runId],
    () => microCheckAPI.getRunById(runId!),
    { enabled: !!runId }
  );

  const { data: responses, isLoading: responsesLoading } = useQuery<MicroCheckResponse[]>(
    ['micro-check-responses', runId],
    () => microCheckAPI.getRunResponses(runId!),
    { enabled: !!runId }
  );

  if (runLoading || responsesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Not Found</h2>
        <button
          onClick={() => navigate('/micro-check-history')}
          className="text-teal-600 hover:text-teal-700"
        >
          ← Back to History
        </button>
      </div>
    );
  }

  const isCompleted = run.status === 'COMPLETED';
  const completedCount = run.completed_count || 0;
  const totalItems = run.items?.length || 0;
  const passedCount = responses?.filter(r => r.status === 'PASS').length || 0;
  const failedCount = responses?.filter(r => r.status === 'FAIL').length || 0;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/micro-check-history')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to History
        </button>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center mb-2">
                <div className={`w-3 h-3 rounded-full mr-2 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {new Date(run.scheduled_for).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })} Checks
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(run.scheduled_for).toLocaleDateString()}
                </div>
                {run.completed_at && (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Completed {new Date(run.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
                {run.completed_by_name && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {run.completed_by_name}
                  </div>
                )}
              </div>
            </div>

            <div className={`inline-flex px-4 py-2 rounded-lg font-semibold ${
              isCompleted ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {isCompleted ? 'Completed' : 'Pending'}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{completedCount}/{totalItems}</div>
              <div className="text-xs text-gray-600">Items Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{passedCount}</div>
              <div className="text-xs text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Check Items */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Check Items</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {run.items.map((item, index) => {
            const response = responses?.find(r => r.run_item === item.id);
            const hasResponse = !!response;
            const isPassed = response?.status === 'PASS';
            const isFailed = response?.status === 'FAIL';

            return (
              <Link
                key={item.id}
                to={`/micro-check/run/${runId}/item/${item.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Order Number */}
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600">{item.order}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{item.title_snapshot}</h3>
                          <p className="text-sm text-gray-600 mb-2">{item.success_criteria_snapshot}</p>

                          {/* Category & Severity */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                              {item.category_snapshot}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                              item.severity_snapshot === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              item.severity_snapshot === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              item.severity_snapshot === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.severity_snapshot}
                            </span>
                            {item.photo_required && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                <ImageIcon className="w-3 h-3 mr-1" />
                                Photo Required
                              </span>
                            )}
                          </div>

                          {/* Response Info */}
                          {hasResponse && (
                            <div className="mt-3 p-4 rounded-lg bg-gray-50 border-2 border-gray-200">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center">
                                  {isPassed ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                                  )}
                                  <span className={`font-bold text-base ${isPassed ? 'text-green-700' : 'text-red-700'}`}>
                                    {isPassed ? 'Passed' : 'Failed'}
                                  </span>
                                </div>
                                {isFailed && (
                                  <div>
                                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                                  </div>
                                )}
                              </div>

                              {/* Notes */}
                              {response.notes && (
                                <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</div>
                                  <p className="text-sm text-gray-900">{response.notes}</p>
                                </div>
                              )}

                              {/* Photo */}
                              {response.media_url && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Photo</div>
                                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white">
                                    <img
                                      src={response.media_url}
                                      alt="Check response"
                                      className="w-full h-auto max-h-96 object-contain"
                                      onError={(e) => {
                                        // Hide image if it fails to load
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) {
                                          parent.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">Image not available</div>';
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Metadata */}
                              <div className="mt-3 pt-3 border-t border-gray-300 flex items-center justify-between text-xs text-gray-500">
                                <div>
                                  Completed by {response.completed_by_name || 'Unknown'}
                                </div>
                                <div>
                                  {new Date(response.completed_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {hasResponse ? (
                        isPassed ? (
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-600" />
                          </div>
                        )
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-400 font-semibold">—</span>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
