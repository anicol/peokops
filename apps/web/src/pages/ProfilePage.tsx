import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '@/hooks/useAuth';
import { authAPI, storesAPI, brandsAPI } from '@/services/api';
import type { Store, Brand } from '@/types';
import { format } from 'date-fns';
import {
  User,
  Save,
  Key,
  CheckCircle,
  AlertCircle,
  MapPin,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  Crown,
  Store as StoreIcon,
  Plus,
  Edit2,
  Trash2,
  XCircle,
  Search,
  Building2,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react';

const ProfilePage = () => {
  const { user, refetchUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'store' | 'stores' | 'privacy' | 'notifications' | 'help'>('profile');

  // Profile form state
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Stores management state
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const { data: stores, isLoading: storesLoading, error: storesError } = useQuery<Store[]>(
    'stores',
    storesAPI.getStores
  );

  // Only fetch brands for admin users
  const { data: brands } = useQuery<Brand[]>(
    'brands',
    brandsAPI.getBrands,
    {
      enabled: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    }
  );

  const deleteMutation = useMutation(
    (id: number) => storesAPI.deleteStore(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stores');
      },
    }
  );

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Key },
    { id: 'store', label: 'Store Info', icon: MapPin },
    { id: 'stores', label: 'Stores', icon: StoreIcon },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'help', label: 'Help & Support', icon: HelpCircle }
  ];

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileSaving(true);

    try {
      await authAPI.updateProfile(profileData);
      await refetchUser();
      setProfileSuccess('Profile updated successfully');
    } catch (err: any) {
      setProfileError(err.response?.data?.email?.[0] || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordSaving(true);

    try {
      await authAPI.changePassword(passwordData);
      setPasswordSuccess('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        new_password_confirm: '',
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.current_password?.[0] ||
                       err.response?.data?.new_password?.[0] ||
                       'Failed to change password';
      setPasswordError(errorMsg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteStore = async (store: Store) => {
    if (window.confirm(`Are you sure you want to delete ${store.name}?`)) {
      try {
        await deleteMutation.mutateAsync(store.id);
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to delete store');
      }
    }
  };

  const filteredStores = stores?.filter(store => {
    // Non-admin users can only see stores for their brand
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.brand_id && store.brand !== user.brand_id) {
      return false;
    }

    const matchesSearch =
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBrand = brandFilter === 'all' || store.brand.toString() === brandFilter;
    const matchesState = stateFilter === 'all' || store.state === stateFilter;

    return matchesSearch && matchesBrand && matchesState;
  }) || [];

  const uniqueStates = [...new Set(stores?.map(s => s.state) || [])].sort();

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile & Settings</h1>
          <p className="text-gray-600">Manage your account and preferences.</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center justify-center lg:justify-start px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </div>

      <div className="max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="space-y-6 lg:order-1 order-2">
            {/* User Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 truncate px-2" title={user?.full_name || user?.email}>{user?.full_name || user?.email}</h3>
                <p className="text-gray-600 text-sm mb-2">{user?.role}</p>
                {user?.store_name && <p className="text-gray-500 text-xs truncate px-2" title={user?.store_name}>{user?.store_name}</p>}
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <nav className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:space-y-2 lg:block">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-teal-50 border border-teal-200 text-teal-900'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 lg:order-2 order-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>

                  {profileError && (
                    <div className="rounded-md bg-red-50 p-4 flex items-center mb-6">
                      <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                      <p className="text-sm text-red-700">{profileError}</p>
                    </div>
                  )}

                  {profileSuccess && (
                    <div className="rounded-md bg-green-50 p-4 flex items-center mb-6">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                      <p className="text-sm text-green-700">{profileSuccess}</p>
                    </div>
                  )}

                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profileData.first_name}
                          onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileData.last_name}
                          onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>

                    {/* Read-only fields */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                          </label>
                          <div className="text-gray-900">{user?.role}</div>
                        </div>
                        {user?.store_name && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Store
                            </label>
                            <div className="text-gray-900">{user?.store_name}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="inline-flex items-center px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>

                  {passwordError && (
                    <div className="rounded-md bg-red-50 p-4 flex items-center mb-6">
                      <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                      <p className="text-sm text-red-700">{passwordError}</p>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="rounded-md bg-green-50 p-4 flex items-center mb-6">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                      <p className="text-sm text-green-700">{passwordSuccess}</p>
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        required
                        minLength={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters long</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.new_password_confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={passwordSaving}
                        className="inline-flex items-center px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        {passwordSaving ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Store Info Tab */}
              {activeTab === 'store' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Store Information</h2>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Store Name
                          </label>
                          <div className="text-gray-900">{user?.store_name || 'N/A'}</div>
                        </div>
                        {user?.brand_name && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Brand
                            </label>
                            <div className="text-gray-900">{user?.brand_name}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <p className="text-teal-800 text-sm">
                        <strong>Note:</strong> To update store information, please contact your administrator or visit the Settings page.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Privacy Settings</h2>

                  <div className="space-y-6">
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                      <div className="flex items-start space-x-3">
                        <Shield className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-teal-900 mb-2">Data Privacy</h3>
                          <p className="text-teal-800 text-sm mb-4">
                            Your data is protected with industry-standard security practices.
                          </p>
                          <ul className="text-teal-800 text-sm space-y-1">
                            <li>✅ End-to-end encryption for all data</li>
                            <li>✅ Secure cloud storage with AWS</li>
                            <li>✅ Regular security audits</li>
                            <li>✅ GDPR and SOC 2 compliant</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Data Preferences</h4>

                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                          <span className="ml-3 text-sm text-gray-700">
                            Allow anonymous usage analytics to improve the service
                          </span>
                        </label>

                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                          <span className="ml-3 text-sm text-gray-700">
                            Receive product updates and feature announcements
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Email Notifications</h4>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                          <span className="ml-3 text-sm text-gray-700">
                            Check completion notifications
                          </span>
                        </label>

                        <label className="flex items-center">
                          <input type="checkbox" defaultChecked className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                          <span className="ml-3 text-sm text-gray-700">
                            High-priority issue alerts
                          </span>
                        </label>

                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                          <span className="ml-3 text-sm text-gray-700">
                            Weekly summary reports
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <p className="text-teal-800 text-sm">
                        <strong>Tip:</strong> Daily check reminders can help you build a consistent routine
                        and catch issues before they become problems.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stores Tab */}
              {activeTab === 'stores' && (
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Stores</h2>
                      <p className="text-gray-600 text-sm mt-1">Manage store locations and information</p>
                    </div>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="whitespace-nowrap">Add Store</span>
                    </button>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search stores..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                      <select
                        value={brandFilter}
                        onChange={(e) => setBrandFilter(e.target.value)}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="all">All Brands</option>
                        {brands?.map(brand => (
                          <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                      </select>
                    )}
                    <select
                      value={stateFilter}
                      onChange={(e) => setStateFilter(e.target.value)}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="all">All States</option>
                      {uniqueStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stats */}
                  <div className={`grid grid-cols-2 gap-3 md:gap-4 mb-6 ${(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                    <div className="bg-gradient-to-br from-teal-50 to-white rounded-lg shadow-sm border border-teal-100 p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm text-gray-600">Total Stores</p>
                          <p className="text-xl md:text-2xl font-bold text-gray-900">{stores?.length || 0}</p>
                        </div>
                        <StoreIcon className="h-6 w-6 md:h-8 md:w-8 text-teal-600" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-white rounded-lg shadow-sm border border-green-100 p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm text-gray-600">Active Stores</p>
                          <p className="text-xl md:text-2xl font-bold text-green-600">
                            {stores?.filter(s => s.is_active).length || 0}
                          </p>
                        </div>
                        <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm border border-blue-100 p-4 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs md:text-sm text-gray-600">States</p>
                          <p className="text-xl md:text-2xl font-bold text-gray-900">
                            {uniqueStates.length}
                          </p>
                        </div>
                        <MapPin className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                      </div>
                    </div>

                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                      <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-sm border border-purple-100 p-4 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs md:text-sm text-gray-600">Brands</p>
                            <p className="text-xl md:text-2xl font-bold text-gray-900">
                              {brands?.length || 0}
                            </p>
                          </div>
                          <Building2 className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stores List */}
                  {storesLoading ? (
                    <div className="flex items-center justify-center min-h-96 bg-white rounded-lg shadow">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
                        <p className="text-gray-600">Loading stores...</p>
                      </div>
                    </div>
                  ) : storesError ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to load stores</h3>
                      <p className="text-gray-600">{(storesError as Error).message}</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      {filteredStores.length === 0 ? (
                        <div className="text-center py-12">
                          <StoreIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">
                            {searchTerm ? 'No stores found matching your search' : 'No stores yet'}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Mobile Card View */}
                          <div className="block lg:hidden divide-y divide-gray-200">
                            {filteredStores.map((store) => (
                              <div key={store.id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h3 className="text-base font-semibold text-gray-900">{store.name}</h3>
                                    <p className="text-sm text-gray-500">Code: {store.code}</p>
                                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                                      <div className="flex items-center text-sm text-gray-600 mt-1">
                                        <Building2 className="h-3 w-3 mr-1 text-gray-400" />
                                        {store.brand_name}
                                      </div>
                                    )}
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                    store.is_active
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {store.is_active ? (
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
                                </div>

                                <div className="space-y-2 mb-3">
                                  <div className="flex items-start text-sm text-gray-600">
                                    <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <div>{store.city}, {store.state} {store.zip_code}</div>
                                    </div>
                                  </div>

                                  {store.phone && (
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                      <a href={`tel:${store.phone}`} className="hover:text-teal-600">{store.phone}</a>
                                    </div>
                                  )}

                                  {store.manager_email && (
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Mail className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                      <a href={`mailto:${store.manager_email}`} className="hover:text-teal-600 truncate">{store.manager_email}</a>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                  <span className="text-xs text-gray-500">
                                    Created {store.created_at && !isNaN(new Date(store.created_at).getTime())
                                      ? format(new Date(store.created_at), 'MMM d, yyyy')
                                      : 'N/A'}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => setEditingStore(store)}
                                      className="text-teal-600 hover:text-teal-900"
                                    >
                                      <Edit2 className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteStore(store)}
                                      className="text-red-600 hover:text-red-900"
                                      disabled={deleteMutation.isLoading}
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop Table View */}
                          <div className="hidden lg:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Store
                                  </th>
                                  {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Brand
                                    </th>
                                  )}
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Location
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact
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
                                {filteredStores.map((store) => (
                                  <tr key={store.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{store.name}</div>
                                        <div className="text-sm text-gray-500">Code: {store.code}</div>
                                      </div>
                                    </td>
                                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-900">
                                          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                                          {store.brand_name}
                                        </div>
                                      </td>
                                    )}
                                    <td className="px-6 py-4">
                                      <div className="text-sm text-gray-900">{store.city}, {store.state}</div>
                                      <div className="text-sm text-gray-500">{store.zip_code}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">
                                        {store.phone && (
                                          <div className="flex items-center mb-1">
                                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                            {store.phone}
                                          </div>
                                        )}
                                        {store.manager_email && (
                                          <div className="flex items-center">
                                            <Mail className="h-3 w-3 mr-1 text-gray-400" />
                                            <span className="truncate max-w-xs">{store.manager_email}</span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        store.is_active
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {store.is_active ? (
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
                                      {store.created_at && !isNaN(new Date(store.created_at).getTime())
                                        ? format(new Date(store.created_at), 'MMM d, yyyy')
                                        : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <button
                                        onClick={() => setEditingStore(store)}
                                        className="text-teal-600 hover:text-teal-900 mr-4"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteStore(store)}
                                        className="text-red-600 hover:text-red-900"
                                        disabled={deleteMutation.isLoading}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Help & Support Tab */}
              {activeTab === 'help' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Help & Support</h2>

                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Contact Support</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Email Support</h4>
                          <p className="text-gray-600 text-sm mb-3">
                            Send us a detailed message
                          </p>
                          <a
                            href="mailto:support@peakops.com"
                            className="inline-block px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                          >
                            Send Email
                          </a>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Documentation</h4>
                          <p className="text-gray-600 text-sm mb-3">
                            Browse our help articles
                          </p>
                          <a
                            href="https://docs.peakops.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
                          >
                            View Docs
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                      <h3 className="font-semibold text-teal-900 mb-2">Need More Help?</h3>
                      <p className="text-teal-800 text-sm mb-4">
                        Our team is here to help you get the most out of PeakOps.
                        Don't hesitate to reach out with any questions!
                      </p>
                      <div className="text-teal-800 text-sm space-y-1">
                        <div>📧 Email: support@peakops.com</div>
                        <div>🕒 Hours: Mon-Fri 9AM-5PM PST</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Store Modal */}
      {(isCreateModalOpen || editingStore) && (
        <StoreFormModal
          store={editingStore}
          brands={brands || []}
          currentUser={user}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingStore(null);
          }}
        />
      )}
    </div>
  );
};

interface StoreFormModalProps {
  store: Store | null;
  brands: Brand[];
  currentUser: any;
  onClose: () => void;
}

function StoreFormModal({ store, brands, currentUser, onClose }: StoreFormModalProps) {
  const queryClient = useQueryClient();

  // For non-admin users, default to their brand
  const defaultBrand = (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN')
    ? (store?.brand || '')
    : (store?.brand || currentUser?.brand || '');

  const [formData, setFormData] = useState({
    name: store?.name || '',
    code: store?.code || '',
    brand: defaultBrand,
    address: store?.address || '',
    city: store?.city || '',
    state: store?.state || '',
    zip_code: store?.zip_code || '',
    phone: store?.phone || '',
    manager_email: store?.manager_email || '',
    timezone: store?.timezone || 'America/New_York',
    is_active: store?.is_active ?? true,
  });

  const mutation = useMutation(
    (data: typeof formData) => {
      if (store) {
        return storesAPI.updateStore(store.id, data);
      }
      return storesAPI.createStore(data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stores');
        onClose();
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {store ? 'Edit Store' : 'Create Store'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g. Downtown Location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g. NYC-001"
              />
            </div>
          </div>

          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand *
              </label>
              <select
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select Brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address *
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              rows={2}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <select
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select State</option>
                {usStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code *
              </label>
              <input
                type="text"
                required
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Manager Email
              </label>
              <input
                type="email"
                value={formData.manager_email}
                onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="manager@store.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="America/Anchorage">Alaska (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii (HST)</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>

          {mutation.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">
                {String((mutation.error as any)?.response?.data?.detail || 'Failed to save store')}
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
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center"
            >
              {mutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {store ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
