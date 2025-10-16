import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { actionItemsAPI, microCheckAPI } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import {
  CheckSquare,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Filter,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  FileText,
  ChevronDown,
  Target,
  MoreVertical,
} from 'lucide-react';
import type { ActionItem } from '@/types';
import type { CorrectiveAction } from '@/types/microCheck';

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

const statusColors = {
  OPEN: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  DISMISSED: 'bg-gray-100 text-gray-800',
};

const statusIcons = {
  OPEN: AlertCircle,
  IN_PROGRESS: PlayCircle,
  COMPLETED: CheckCircle,
  DISMISSED: XCircle,
  RESOLVED: CheckCircle,
  VERIFIED: CheckCircle,
};

// Unified action interface for display
interface UnifiedAction {
  id: string;
  type: 'inspection' | 'micro_check';
  title: string;
  description: string;
  category?: string;
  priority: string;
  status: string;
  assigned_to?: string | number;
  due_date?: string;
  created_at: string;
  notes?: string;
  sourceData: ActionItem | CorrectiveAction;
}

interface UnifiedActionCardProps {
  action: UnifiedAction;
  onStatusUpdate: (action: UnifiedAction, status: string, additionalData?: { after_media?: string; resolution_notes?: string }) => void;
  isUpdating: boolean;
}

function UnifiedActionCard({ action, onStatusUpdate, isUpdating }: UnifiedActionCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showDismissConfirm, setShowDismissConfirm] = React.useState(false);
  const [showMarkFixedModal, setShowMarkFixedModal] = React.useState(false);
  const [resolutionNotes, setResolutionNotes] = React.useState('');
  const [afterPhoto, setAfterPhoto] = React.useState<File | null>(null);
  const [afterPhotoPreview, setAfterPhotoPreview] = React.useState<string | null>(null);
  const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status !== 'COMPLETED' && action.status !== 'RESOLVED' && action.status !== 'VERIFIED';
  const StatusIcon = statusIcons[action.status as keyof typeof statusIcons];
  const isInspectionType = action.type === 'inspection';
  const isMicroCheckType = action.type === 'micro_check';

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAfterPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAfterPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMarkFixed = async () => {
    try {
      let mediaId: string | undefined;

      // Upload photo if provided
      if (afterPhoto) {
        mediaId = await microCheckAPI.uploadPhoto(afterPhoto);
      }

      // Update with status, photo, and notes
      onStatusUpdate(action, 'RESOLVED', {
        after_media: mediaId,
        resolution_notes: resolutionNotes,
      });

      setShowMarkFixedModal(false);
      setResolutionNotes('');
      setAfterPhoto(null);
      setAfterPhotoPreview(null);
    } catch (error) {
      console.error('Error marking as fixed:', error);
      alert('Failed to upload photo. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900 flex-1">{action.title}</h3>
            <div className="relative ml-2">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded-md"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDismissConfirm(true);
                      }}
                      disabled={isUpdating}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-3">{action.description}</p>

          {/* Dismiss Confirmation Modal */}
          {showDismissConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Dismiss Action Item?</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Are you sure you want to dismiss this action item? This will close it without marking it as fixed.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowDismissConfirm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onStatusUpdate(action, 'DISMISSED');
                        setShowDismissConfirm(false);
                      }}
                      disabled={isUpdating}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {/* Type badge for micro checks */}
            {action.type === 'micro_check' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                Micro Check
              </span>
            )}
            {/* Category badge for micro checks */}
            {action.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {action.category}
              </span>
            )}
            {/* Priority badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[action.priority as keyof typeof priorityColors]}`}>
              {action.priority}
            </span>
            {/* Status badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[action.status as keyof typeof statusColors]}`}>
              {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
              {action.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {action.assigned_to && (
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {action.assigned_to}
              </div>
            )}
            {action.due_date && (
              <div className={`flex items-center ${isOverdue ? 'text-red-600' : ''}`}>
                <Calendar className="w-4 h-4 mr-1" />
                Due {format(new Date(action.due_date), 'MMM d, yyyy')}
                {isOverdue && <span className="ml-1 text-red-600 font-medium">(Overdue)</span>}
              </div>
            )}
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Created {format(new Date(action.created_at), 'MMM d, yyyy')}
            </div>
          </div>

          {action.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">{action.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons for inspection type items */}
      {isInspectionType && action.status !== 'COMPLETED' && action.status !== 'DISMISSED' && (
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          {action.status === 'OPEN' && (
            <button
              onClick={() => onStatusUpdate(action, 'IN_PROGRESS')}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              Start
            </button>
          )}
          {(action.status === 'OPEN' || action.status === 'IN_PROGRESS') && (
            <button
              onClick={() => onStatusUpdate(action, 'COMPLETED')}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Complete
            </button>
          )}
        </div>
      )}

      {/* Action buttons for micro-check corrective actions */}
      {isMicroCheckType && action.status !== 'RESOLVED' && action.status !== 'VERIFIED' && action.status !== 'DISMISSED' && (
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          {action.status === 'OPEN' && (
            <button
              onClick={() => onStatusUpdate(action, 'IN_PROGRESS')}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              Start
            </button>
          )}
          {(action.status === 'OPEN' || action.status === 'IN_PROGRESS') && (
            <button
              onClick={() => setShowMarkFixedModal(true)}
              disabled={isUpdating}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Mark Fixed
            </button>
          )}
        </div>
      )}

      {/* Mark Fixed Modal */}
      {showMarkFixedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark as Fixed</h3>

              {/* After Photo Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  After Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-teal-50 file:text-teal-700
                    hover:file:bg-teal-100"
                />
                {afterPhotoPreview && (
                  <div className="mt-3">
                    <img
                      src={afterPhotoPreview}
                      alt="After photo preview"
                      className="max-h-48 rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>

              {/* Resolution Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes (Optional)
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe what was done to fix this issue..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowMarkFixedModal(false);
                    setResolutionNotes('');
                    setAfterPhoto(null);
                    setAfterPhotoPreview(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkFixed}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Mark as Fixed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActionItemsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    search: '',
  });

  const [ordering, setOrdering] = useState('-priority');

  // Fetch inspection action items
  const { data: actionItems, isLoading: loadingActionItems } = useQuery(
    ['action-items', filters, ordering],
    () => actionItemsAPI.getActionItems({
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      ordering
    }),
    {
      keepPreviousData: true,
    }
  );

  // Fetch micro check corrective actions
  const { data: correctiveActions, isLoading: loadingCorrectiveActions } = useQuery(
    ['corrective-actions', user?.store],
    () => user?.store ? microCheckAPI.getCorrectiveActions(user.store) : Promise.resolve([]),
    {
      enabled: !!user?.store,
      keepPreviousData: true,
    }
  );

  const isLoading = loadingActionItems || loadingCorrectiveActions;

  const updateActionItemMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActionItem['status'] }) =>
      actionItemsAPI.updateActionItem(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['action-items']);
    },
    onError: (error) => {
      console.error('Failed to update action item:', error);
      alert('Failed to update action item. Please try again.');
    },
  });

  const updateCorrectiveActionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      microCheckAPI.updateCorrectiveAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['corrective-actions']);
    },
    onError: (error) => {
      console.error('Failed to update corrective action:', error);
      alert('Failed to update corrective action. Please try again.');
    },
  });

  const handleStatusUpdate = (action: UnifiedAction, status: string, additionalData?: { after_media?: string; resolution_notes?: string }) => {
    if (action.type === 'inspection') {
      const actionItem = action.sourceData as ActionItem;
      updateActionItemMutation.mutate({ id: actionItem.id, status: status as ActionItem['status'] });
    } else {
      const correctiveAction = action.sourceData as CorrectiveAction;
      const updateData = {
        status,
        ...additionalData,
      };
      updateCorrectiveActionMutation.mutate({ id: correctiveAction.id, data: updateData });
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      assigned_to: '',
      search: '',
    });
  };

  // Transform corrective actions to unified format
  const transformedCorrectiveActions: UnifiedAction[] = (correctiveActions || [])
    .filter((ca: CorrectiveAction) => ca.status === 'OPEN' || ca.status === 'IN_PROGRESS')
    .map((ca: CorrectiveAction) => ({
      id: `ca-${ca.id}`,
      type: 'micro_check' as const,
      title: ca.response_details?.run_item_details?.template_title || ca.category_display || 'Micro Check Issue',
      description: ca.response_details?.run_item_details?.template_description ||
                   ca.response_details?.notes ||
                   `Failed check in ${ca.category_display}`,
      category: ca.category_display,
      priority: ca.category === 'SAFETY' || ca.category === 'FOOD_HANDLING' ? 'HIGH' : 'MEDIUM',
      status: ca.status,
      assigned_to: ca.assigned_to_name,
      due_date: ca.due_at,
      created_at: ca.created_at,
      notes: ca.resolution_notes,
      sourceData: ca,
    }));

  // Combine and filter all items
  const allUnifiedActions: UnifiedAction[] = [
    ...(actionItems || []).map((item: ActionItem) => ({
      id: `ai-${item.id}`,
      type: 'inspection' as const,
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: item.status,
      assigned_to: item.assigned_to,
      due_date: item.due_date,
      created_at: item.created_at,
      notes: item.notes,
      sourceData: item,
    })),
    ...transformedCorrectiveActions,
  ];

  const filteredItems = allUnifiedActions.filter(item => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        (item.notes && item.notes.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Action Items</h1>
          <p className="text-gray-600">Manage and track action items from inspections</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search action items..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="DISMISSED">Dismissed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Ordering */}
          <select
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="-priority">Priority (High to Low)</option>
            <option value="priority">Priority (Low to High)</option>
            <option value="due_date">Due Date (Earliest First)</option>
            <option value="-due_date">Due Date (Latest First)</option>
            <option value="-created_at">Created (Newest First)</option>
            <option value="created_at">Created (Oldest First)</option>
          </select>

          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {isLoading ? 'Loading...' : `${filteredItems.length} action item${filteredItems.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Action Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="flex gap-2 mb-3">
                <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((action) => (
            <UnifiedActionCard
              key={action.id}
              action={action}
              onStatusUpdate={handleStatusUpdate}
              isUpdating={updateActionItemMutation.isLoading || updateCorrectiveActionMutation.isLoading}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No action items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeFiltersCount > 0 
              ? 'Try adjusting your filters to see more results.'
              : 'Action items will appear here when inspections are completed.'
            }
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
