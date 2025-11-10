import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import {
  Plus,
  Users as UsersIcon,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
  Mail,
  Phone,
  Building2,
  Shield,
  UserCheck,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usersAPI, storesAPI } from '@/services/api';
import type { User, Store } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { formatPhoneNumber, formatPhoneInput } from '@/utils/phone';

// Paginated response type
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter]);

  const { data: paginatedData, isLoading, error } = useQuery<PaginatedResponse<User>>(
    ['users', currentPage, debouncedSearchTerm, roleFilter],
    () => usersAPI.getUsers({
      page: currentPage,
      search: debouncedSearchTerm,
      role: roleFilter,
    }),
    {
      keepPreviousData: true,
    }
  );

  const users = paginatedData?.results || [];
  const totalCount = paginatedData?.count || 0;
  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  const { data: stores } = useQuery<Store[]>(
    'stores',
    storesAPI.getStores
  );

  const deleteMutation = useMutation(
    (id: number) => usersAPI.deleteUser(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
      },
    }
  );

  const reinviteMutation = useMutation(
    (id: number) => usersAPI.reinviteUser(id),
    {
      onSuccess: () => {
        alert('Invitation email sent successfully!');
      },
      onError: (error: any) => {
        alert(error.response?.data?.detail || 'Failed to send invitation');
      },
    }
  );

  const handleDelete = async (user: User) => {
    if (user.role === 'ADMIN') {
      alert('Cannot delete admin users');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${user.username}?`)) {
      try {
        await deleteMutation.mutateAsync(user.id);
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to delete user');
      }
    }
  };

  const handleReinvite = async (user: User) => {
    if (window.confirm(`Send invitation email to ${user.email}?`)) {
      try {
        await reinviteMutation.mutateAsync(user.id);
      } catch (error: any) {
        // Error handled by mutation
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'OWNER':
        return 'bg-blue-100 text-blue-800';
      case 'GM':
        return 'bg-green-100 text-green-800';
      case 'INSPECTOR':
        return 'bg-gray-100 text-gray-800';
      case 'EMPLOYEE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'OWNER':
        return 'Owner';
      case 'GM':
        return 'Manager';
      case 'INSPECTOR':
        return 'Inspector';
      case 'EMPLOYEE':
        return 'Employee';
      default:
        return role;
    }
  };

  const canManageRole = (role: string) => {
    // TRIAL_ADMIN can manage GM, INSPECTOR, EMPLOYEE (same as OWNER)
    // OWNER can manage OWNER, GM, INSPECTOR, EMPLOYEE
    // GM can manage GM, INSPECTOR, EMPLOYEE
    if (currentUser?.role === 'TRIAL_ADMIN' || currentUser?.role === 'OWNER') {
      return ['OWNER', 'GM', 'INSPECTOR', 'EMPLOYEE', 'TRIAL_ADMIN'].includes(role);
    }
    if (currentUser?.role === 'GM') {
      return ['GM', 'INSPECTOR', 'EMPLOYEE'].includes(role);
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load users</h2>
        <p className="text-gray-600">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage team members and permissions</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Roles</option>
          {currentUser?.role === 'OWNER' && <option value="OWNER">Owner</option>}
          <option value="GM">Manager</option>
          <option value="INSPECTOR">Inspector</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600">
                {users?.filter(u => u.is_active).length || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inspectors</p>
              <p className="text-2xl font-bold text-gray-900">
                {users?.filter(u => u.role === 'INSPECTOR').length || 0}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Managers</p>
              <p className="text-2xl font-bold text-gray-900">
                {users?.filter(u => u.role === 'GM' || u.role === 'OWNER').length || 0}
              </p>
            </div>
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm || roleFilter !== 'all' ? 'No users found matching your filters' : 'No users yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Store
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 font-medium text-sm">
                            {user.first_name?.[0] || user.username[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name || user.username}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.has_account_wide_access ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Building2 className="h-3 w-3 mr-1" />
                          Account-wide Access
                        </span>
                      ) : (
                        <div className="flex items-center text-sm text-gray-900">
                          <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                          {user.store_name || '-'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.phone ? (
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {formatPhoneNumber(user.phone)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canManageRole(user.role) && user.role !== 'ADMIN' && (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleReinvite(user)}
                            className="text-teal-600 hover:text-teal-900"
                            disabled={reinviteMutation.isLoading}
                            title="Resend invitation email"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit user"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-900"
                            disabled={deleteMutation.isLoading}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                      {' '} to{' '}
                      <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span>
                      {' '} of{' '}
                      <span className="font-medium">{totalCount}</span>
                      {' '} results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingUser) && (
        <UserFormModal
          user={editingUser}
          stores={stores || []}
          currentUserRole={currentUser?.role || 'INSPECTOR'}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

interface UserFormModalProps {
  user: User | null;
  stores: Store[];
  currentUserRole: string;
  onClose: () => void;
}

function UserFormModal({ user, stores, currentUserRole, onClose }: UserFormModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<{
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    password_confirm: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | 'GM' | 'INSPECTOR' | 'TRIAL_ADMIN' | 'EMPLOYEE';
    store: number | null;
    phone: string;
    is_active: boolean;
  }>({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    password: '',
    password_confirm: '',
    role: user?.role || 'GM',
    store: user?.store || (stores.length === 1 ? stores[0].id : null),
    phone: formatPhoneInput(user?.phone || ''),
    is_active: user?.is_active ?? true,
  });

  const mutation = useMutation(
    (data: any) => {
      if (user) {
        const { password, password_confirm, ...updateData } = data;
        return usersAPI.updateUser(user.id, updateData);
      }
      return usersAPI.createUser(data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        onClose();
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare data with proper store handling
    const submitData = {
      ...formData,
      // Ensure store is null for OWNER role
      store: formData.role === 'OWNER' ? null : formData.store
    };

    // For new users, generate a random password on backend and send magic link
    if (user) {
      mutation.mutate(submitData);
    } else {
      const randomPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
      mutation.mutate({
        ...submitData,
        password: randomPassword,
        password_confirm: randomPassword
      });
    }
  };

  const availableRoles = currentUserRole === 'OWNER'
    ? [
        { value: 'OWNER', label: 'Owner' },
        { value: 'GM', label: 'Manager' },
        { value: 'INSPECTOR', label: 'Inspector' },
        { value: 'EMPLOYEE', label: 'Employee' }
      ]
    : [
        { value: 'GM', label: 'Manager' },
        { value: 'INSPECTOR', label: 'Inspector' },
        { value: 'EMPLOYEE', label: 'Employee' }
      ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {user ? 'Edit User' : 'Create User'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value, username: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {!user && (
              <p className="mt-2 text-sm text-gray-500">
                A magic link will be sent to this email for login
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value as typeof formData.role;
                  setFormData({
                    ...formData,
                    role: newRole,
                    // Clear store if switching to OWNER (TRIAL_ADMIN can have null store too)
                    store: newRole === 'OWNER' ? null : formData.store
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {availableRoles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            {formData.role === 'OWNER' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Access
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-blue-50 flex items-center">
                  <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="text-sm text-blue-800 font-medium">Account-wide Access</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Owners can access all stores in the account
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store {formData.role !== 'TRIAL_ADMIN' && '*'}
                </label>
                <select
                  required={formData.role !== 'TRIAL_ADMIN'}
                  value={formData.store || ''}
                  onChange={(e) => setFormData({ ...formData, store: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">
                    {formData.role === 'TRIAL_ADMIN' ? 'No store (account-wide access)' : 'Select Store'}
                  </option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
                {formData.role === 'TRIAL_ADMIN' && (
                  <p className="mt-1 text-xs text-gray-500">
                    Trial users can optionally be assigned to a specific store
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const formatted = formatPhoneInput(e.target.value);
                  setFormData({ ...formData, phone: formatted });
                }}
                placeholder="(555) 123-4567"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {user && formData.phone ? 'Synced from 7shifts - formats automatically' : 'Formats automatically as you type'}
            </p>
          </div>

          {mutation.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">
                {String((mutation.error as any)?.response?.data?.detail || 'Failed to save user')}
              </p>
            </div>
          ) : null}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {mutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
