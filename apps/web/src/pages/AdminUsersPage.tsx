import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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
  Building2,
  Shield,
  UserCheck,
  Crown,
  Key,
  UserCog,
} from 'lucide-react';
import { API_CONFIG } from '@/config/api';
import { brandsAPI, storesAPI } from '@/services/api';
import type { User, Brand, Store } from '@/types';

// Admin-specific API endpoint
const adminUsersAPI = {
  getUsers: async (): Promise<User[]> => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/admin/users/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        ...API_CONFIG.headers,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    const data = await response.json();
    // Handle both paginated and non-paginated responses
    return data.results || data;
  },
  
  createUser: async (userData: Partial<User>): Promise<User> => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/admin/users/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        ...API_CONFIG.headers,
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },
  
  updateUser: async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/admin/users/${id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        ...API_CONFIG.headers,
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },
  
  deleteUser: async (id: number): Promise<void> => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/admin/users/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        ...API_CONFIG.headers,
      },
    });
    if (!response.ok) throw new Error('Failed to delete user');
  },

  resetPassword: async (id: number, newPassword: string): Promise<{ status: string; message: string }> => {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/admin/users/${id}/reset_password/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        ...API_CONFIG.headers,
      },
      body: JSON.stringify({ new_password: newPassword }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }
    return response.json();
  },
};

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { user: currentUser, startImpersonation } = useAuth();
  const navigate = useNavigate();

  const { data: users, isLoading, error } = useQuery<User[]>(
    'admin-users',
    adminUsersAPI.getUsers
  );

  const { data: brands } = useQuery<Brand[]>('brands', brandsAPI.getBrands);
  const { data: stores } = useQuery<Store[]>('stores', storesAPI.getStores);

  const deleteMutation = useMutation(
    (id: number) => adminUsersAPI.deleteUser(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
      },
    }
  );

  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.username}?`)) {
      try {
        await deleteMutation.mutateAsync(user.id);
      } catch (error: any) {
        alert(error.message || 'Failed to delete user');
      }
    }
  };

  const handleImpersonate = async (user: User) => {
    if (window.confirm(`Impersonate ${user.full_name} (${user.email})?\n\nYou will be logged in as this user and all actions will be performed as them.`)) {
      try {
        await startImpersonation(user.id);
        navigate('/'); // Redirect to home page after impersonation starts
      } catch (error: any) {
        alert(error.message || 'Failed to start impersonation');
      }
    }
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.brand_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesBrand = brandFilter === 'all' || user.brand_id?.toString() === brandFilter;

    return matchesSearch && matchesRole && matchesBrand;
  }) || [];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-red-100 text-red-800 font-bold';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'OWNER':
        return 'bg-blue-100 text-blue-800';
      case 'GM':
        return 'bg-green-100 text-green-800';
      case 'INSPECTOR':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Users (Admin)</h1>
          <p className="text-gray-600 mt-1">Manage users across all tenants</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

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
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Brands</option>
          {brands?.map(brand => (
            <option key={brand.id} value={brand.id}>{brand.name}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="OWNER">Owner</option>
          <option value="GM">General Manager</option>
          <option value="INSPECTOR">Inspector</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <p className="text-sm text-gray-600">Active</p>
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
              <p className="text-sm text-gray-600">Trial Users</p>
              <p className="text-2xl font-bold text-yellow-600">
                {users?.filter(u => u.is_trial_user).length || 0}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Owners</p>
              <p className="text-2xl font-bold text-blue-600">
                {users?.filter(u => u.role === 'OWNER').length || 0}
              </p>
            </div>
            <Crown className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-purple-600">
                {users?.filter(u => u.role === 'ADMIN').length || 0}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm ? 'No users found matching your search' : 'No users yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
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
                      <div className="flex items-center text-sm text-gray-900">
                        <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                        {user.brand_name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                      {user.is_trial_user && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Trial
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.store_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                      {currentUser?.role === 'SUPER_ADMIN' &&
                       user.role !== 'SUPER_ADMIN' &&
                       user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleImpersonate(user)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                          title="Impersonate user"
                        >
                          <UserCog className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                        title="Edit user"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setResettingPasswordUser(user)}
                        className="text-yellow-600 hover:text-yellow-900 mr-4"
                        title="Reset password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-900"
                        disabled={deleteMutation.isLoading}
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(isCreateModalOpen || editingUser) && (
        <AdminUserFormModal
          user={editingUser}
          brands={brands || []}
          stores={stores || []}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingUser(null);
          }}
        />
      )}

      {resettingPasswordUser && (
        <PasswordResetModal
          user={resettingPasswordUser}
          onClose={() => setResettingPasswordUser(null)}
        />
      )}
    </div>
  );
}

interface AdminUserFormModalProps {
  user: User | null;
  brands: Brand[];
  stores: Store[];
  onClose: () => void;
}

function AdminUserFormModal({ user, brands, stores, onClose }: AdminUserFormModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    password: '',
    password_confirm: '',
    role: user?.role || 'INSPECTOR',
    store: user?.store || null,
    phone: user?.phone || '',
    is_active: user?.is_active ?? true,
  });

  const mutation = useMutation(
    (data: any) => {
      if (user) {
        const { password, password_confirm, ...updateData } = data;
        return adminUsersAPI.updateUser(user.id, updateData);
      }
      return adminUsersAPI.createUser(data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        onClose();
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && formData.password !== formData.password_confirm) {
      alert('Passwords do not match');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {user ? 'Edit User' : 'Create User'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {!user && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password_confirm}
                  onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'OWNER' | 'GM' | 'INSPECTOR' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
                <option value="GM">General Manager</option>
                <option value="INSPECTOR">Inspector</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Store *</label>
              <select
                required
                value={formData.store || ''}
                onChange={(e) => setFormData({ ...formData, store: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Store</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.brand_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>

          {mutation.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">
                {String((mutation.error as any)?.message || 'Failed to save user')}
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

interface PasswordResetModalProps {
  user: User;
  onClose: () => void;
}

function PasswordResetModal({ user, onClose }: PasswordResetModalProps) {
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation(
    () => adminUsersAPI.resetPassword(user.id, newPassword),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-users');
        onClose();
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    if (window.confirm(`Reset password for ${user.email}?\n\nMake sure to securely share the new password with the user.`)) {
      mutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center mb-4">
          <Key className="h-6 w-6 text-yellow-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-900">
            Reset Password
          </h2>
        </div>

        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>User:</strong> {user.full_name} ({user.email})
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Make sure to securely share the new password with the user.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter new password (min 8 characters)"
                minLength={8}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Re-enter new password"
              minLength={8}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="show_password"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="show_password" className="ml-2 block text-sm text-gray-900">
              Show password
            </label>
          </div>

          {mutation.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">
                {String((mutation.error as any)?.message || 'Failed to reset password')}
              </p>
            </div>
          ) : null}

          {mutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-sm">
                Password reset successfully!
              </p>
            </div>
          )}

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
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center"
            >
              {mutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
