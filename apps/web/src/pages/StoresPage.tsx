import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import {
  Plus,
  Store as StoreIcon,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
  MapPin,
  Building2,
  Mail,
  Phone,
  Star,
  Link as LinkIcon,
} from 'lucide-react';
import { storesAPI, brandsAPI } from '@/services/api';
import type { Store, Brand } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';

export default function StoresPage() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: stores, isLoading, error } = useQuery<Store[]>(
    'stores',
    storesAPI.getStores
  );

  // Only fetch brands for admin users
  const { data: brands } = useQuery<Brand[]>(
    'brands',
    brandsAPI.getBrands,
    {
      enabled: currentUser?.role === 'ADMIN',
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

  const handleDelete = async (store: Store) => {
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
    if (currentUser?.role !== 'ADMIN' && currentUser?.brand_id && store.brand !== currentUser.brand_id) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading stores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load stores</h2>
        <p className="text-gray-600">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage store locations and information</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="whitespace-nowrap">Add Store</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search stores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        {currentUser?.role === 'ADMIN' && (
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All States</option>
          {uniqueStates.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-2 gap-3 md:gap-4 ${currentUser?.role === 'ADMIN' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-600">Total Stores</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stores?.length || 0}</p>
            </div>
            <StoreIcon className="h-6 w-6 md:h-8 md:w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 md:p-6">
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

        <div className="bg-white rounded-lg shadow p-4 md:p-6">
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

        {currentUser?.role === 'ADMIN' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
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
                      {currentUser?.role === 'ADMIN' && (
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
                        <a href={`tel:${store.phone}`} className="hover:text-indigo-600">{store.phone}</a>
                      </div>
                    )}

                    {store.manager_email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                        <a href={`mailto:${store.manager_email}`} className="hover:text-indigo-600 truncate">{store.manager_email}</a>
                      </div>
                    )}

                    {/* Google Reviews Status */}
                    {store.google_location_name && (
                      <div className="flex items-center text-sm">
                        {store.google_rating ? (
                          <>
                            <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900">{store.google_rating}</span>
                            <span className="text-gray-500 ml-1">/ 5.0</span>
                            <span className="text-gray-400 ml-2">({store.google_review_count || 0} reviews)</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 text-blue-600 animate-spin flex-shrink-0" />
                            <span className="text-blue-600 font-medium">Syncing Google reviews...</span>
                          </>
                        )}
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
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(store)}
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
                  {currentUser?.role === 'ADMIN' && (
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
                    Google Reviews
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
                    {currentUser?.role === 'ADMIN' && (
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {store.google_location_name ? (
                        store.google_rating ? (
                          <div className="text-sm">
                            <div className="flex items-center text-gray-900 mb-1">
                              <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{store.google_rating}</span>
                              <span className="text-gray-500 ml-1">/ 5.0</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {store.google_review_count || 0} reviews
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm">
                            <div className="flex items-center text-blue-600 mb-1">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              <span className="font-medium">Syncing...</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Linked to Google
                            </div>
                          </div>
                        )
                      ) : (
                        <span className="text-sm text-gray-400">Not linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {store.created_at && !isNaN(new Date(store.created_at).getTime())
                        ? format(new Date(store.created_at), 'MMM d, yyyy')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingStore(store)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(store)}
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

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingStore) && (
        <StoreFormModal
          store={editingStore}
          brands={brands || []}
          currentUser={currentUser}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingStore(null);
          }}
        />
      )}
    </div>
  );
}

interface StoreFormModalProps {
  store: Store | null;
  brands: Brand[];
  currentUser: any;
  onClose: () => void;
}

function StoreFormModal({ store, brands, currentUser, onClose }: StoreFormModalProps) {
  const queryClient = useQueryClient();

  // For non-admin users, get brand from their current user's brand_id
  // This should exist for all users since they're assigned to a store with a brand
  const defaultBrand = currentUser?.role === 'ADMIN'
    ? (store?.brand || '')
    : (store?.brand || currentUser?.brand_id);

  console.log('StoreFormModal - currentUser:', currentUser);
  console.log('StoreFormModal - defaultBrand:', defaultBrand);
  console.log('StoreFormModal - store:', store);

  // Creation mode: 'choose' (initial), 'google-search', 'manual', or null for editing
  const [creationMode, setCreationMode] = useState<'choose' | 'google-search' | 'manual' | null>(
    store ? null : 'choose'
  );

  const [formData, setFormData] = useState({
    name: store?.name || '',
    code: store?.code || '',
    brand: defaultBrand,  // Will be number (brand_id) or undefined
    address: store?.address || '',
    city: store?.city || '',
    state: store?.state || '',
    zip_code: store?.zip_code || '',
    phone: store?.phone || '',
    manager_email: store?.manager_email || '',
    timezone: store?.timezone || 'America/New_York',
    is_active: store?.is_active ?? true,
  });

  // Google location data (for creation)
  const [googleLocationData, setGoogleLocationData] = useState<any>(null);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  // Google location linking/search state (for edit mode)
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  const [googleSearchResults, setGoogleSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Form submission error state
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mutation = useMutation(
    (data: any) => {
      if (store) {
        return storesAPI.updateStore(store.id, data);
      }
      // For creation, include google_location_data if available
      return storesAPI.createStore(data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('stores');
        onClose();
      },
      onError: (error: any) => {
        // Clear previous errors
        setFormError('');
        setFieldErrors({});

        // Handle validation errors from backend
        if (error.response?.data) {
          const errorData = error.response.data;

          // Check if it's a field-level validation error
          if (typeof errorData === 'object' && !errorData.detail && !errorData.error) {
            const errors: Record<string, string> = {};

            // Convert backend validation errors to user-friendly messages
            Object.keys(errorData).forEach(field => {
              const errorMessages = errorData[field];
              if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                const message = errorMessages[0];

                // Custom error messages for common validation issues
                if (field === 'code' && message.includes('already exists')) {
                  errors[field] = 'This store code is already in use. Please use a unique code.';
                } else if (field === 'name' && message.includes('already exists')) {
                  errors[field] = 'A store with this name already exists. Please use a different name.';
                } else {
                  // Use the backend message as-is
                  errors[field] = typeof message === 'string' ? message : message.toString();
                }
              }
            });

            setFieldErrors(errors);
            setFormError('Please fix the validation errors below.');
          } else {
            // Generic error message
            setFormError(errorData.detail || errorData.error || 'Failed to save store. Please try again.');
          }
        } else {
          setFormError('Failed to save store. Please check your connection and try again.');
        }
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormError('');
    setFieldErrors({});

    // Prepare submission data
    const submissionData: any = { ...formData };

    // Include Google location data if creating from Google
    if (!store && googleLocationData) {
      submissionData.google_location_data = googleLocationData;
    }

    console.log('Submitting store data:', submissionData);
    mutation.mutate(submissionData);
  };

  // Handle place selected from Google Places Autocomplete (for creation mode)
  const handlePlaceSelected = (place: any) => {
    console.log('Place selected:', place);
    setSelectedPlace(place);

    // Parse address components
    let streetAddress = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let phone = '';

    if (place.address_components && Array.isArray(place.address_components)) {
      place.address_components.forEach((component: any) => {
        const types = component.types || [];

        // Street number + route = street address
        if (types.includes('street_number')) {
          streetAddress = component.long_name;
        }
        if (types.includes('route')) {
          streetAddress = streetAddress ? `${streetAddress} ${component.long_name}` : component.long_name;
        }

        // City (locality or sublocality)
        if (types.includes('locality')) {
          city = component.long_name;
        } else if (!city && types.includes('sublocality')) {
          city = component.long_name;
        }

        // State (administrative_area_level_1)
        if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        }

        // ZIP code (postal_code)
        if (types.includes('postal_code')) {
          zipCode = component.long_name;
        }
      });
    }

    // Pre-fill form with Google data
    setFormData({
      ...formData,
      name: place.name || '',
      address: streetAddress || place.formatted_address || '',
      city,
      state,
      zip_code: zipCode,
      phone: phone || formData.phone,
    });

    // Store Google location data for backend
    // Construct place_url from place_id
    const placeUrl = place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : '';

    setGoogleLocationData({
      business_name: place.name,
      place_url: placeUrl,
      place_id: place.place_id,
      google_location_id: place.place_id, // Use place_id as location_id
      address: place.formatted_address,
      average_rating: null, // Will be fetched by backend
      total_reviews: null, // Will be fetched by backend
    });

    // Move to manual mode to show form
    setCreationMode('manual');
  };

  // Google search handler for edit mode (backend-based search for existing stores)
  const handleGoogleSearch = async () => {
    if (!googleSearchQuery.trim() || !store) return;

    setIsSearching(true);
    setLinkError('');

    try {
      const response = await axios.post('/api/integrations/google-reviews/search-business', {
        business_name: googleSearchQuery,
        location: `${store.city}, ${store.state}`.trim()
      });

      // API returns single result or multiple results
      const results = Array.isArray(response.data) ? response.data : [response.data];
      setGoogleSearchResults(results);
    } catch (error: any) {
      setLinkError(error.response?.data?.error || 'Failed to search for business');
      setGoogleSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Link Google location to store (for edit mode)
  const handleLinkGoogleLocation = async (result: any) => {
    if (!store) return;

    setIsLinking(true);
    setLinkError('');

    try {
      await axios.post('/api/integrations/google-reviews/link-location', {
        store_id: store.id,
        business_name: result.business_name,
        place_url: result.place_url,
        place_id: result.place_id
      });

      // Refresh stores list to show new Google location data
      queryClient.invalidateQueries('stores');
      setGoogleSearchResults([]);
      setGoogleSearchQuery('');

      alert('Google location linked successfully! Review scraping started in background.');
    } catch (error: any) {
      setLinkError(error.response?.data?.error || 'Failed to link Google location');
    } finally {
      setIsLinking(false);
    }
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

        {/* Step 1: Choose creation method (only for new stores) */}
        {creationMode === 'choose' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-6">
              How would you like to create your store?
            </p>

            <button
              type="button"
              onClick={() => setCreationMode('google-search')}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Search className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-semibold text-gray-900">Search Google Business</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Find your business on Google and automatically link reviews
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCreationMode('manual')}
              className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <StoreIcon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-semibold text-gray-900">Create Manually</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Enter store details manually (you can link Google later)
                  </p>
                </div>
              </div>
            </button>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Google search (for creation mode) */}
        {creationMode === 'google-search' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setCreationMode('choose')}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back to options
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for your business on Google Maps
              </label>
              <GooglePlacesAutocomplete
                value={googleSearchQuery}
                onChange={setGoogleSearchQuery}
                onPlaceSelected={handlePlaceSelected}
                placeholder="Start typing your business name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-2 text-sm text-gray-500">
                Search for your business using Google Places. Details will be automatically filled in.
              </p>
            </div>

            {/* Show selected place */}
            {selectedPlace && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Selected Business</h4>
                    <p className="text-sm font-medium text-gray-800">{selectedPlace.name}</p>
                    {selectedPlace.formatted_address && (
                      <p className="text-sm text-gray-600 mt-1">{selectedPlace.formatted_address}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreationMode('manual')}
                  className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Continue to Store Details →
                </button>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <button
                type="button"
                onClick={() => setCreationMode('manual')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Skip and create manually →
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 3 & Edit Mode: Form */}
        {(creationMode === 'manual' || creationMode === null) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {googleLocationData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <LinkIcon className="h-4 w-4 text-blue-600 mr-2" />
                <p className="text-sm text-blue-900">
                  This store will be linked to <strong>{googleLocationData.business_name}</strong> on Google
                </p>
              </div>
            </div>
          )}

          {/* General form error message */}
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                <p className="text-sm text-red-900">{formError}</p>
              </div>
            </div>
          )}

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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="e.g. Downtown Location"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
              )}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  fieldErrors.code ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="e.g. NYC-001"
              />
              {fieldErrors.code && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.code}</p>
              )}
            </div>
          </div>

          {currentUser?.role === 'ADMIN' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand *
              </label>
              <select
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: Number(e.target.value) })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  fieldErrors.brand ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select Brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              {fieldErrors.brand && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.brand}</p>
              )}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

          {/* Google Location Linking - Only show for existing stores */}
          {store && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <LinkIcon className="h-4 w-4 mr-2" />
                Link Google Location
              </h3>

              {/* Show current Google location if linked */}
              {store.google_location_name && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        {store.google_location_name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {store.google_rating && (
                          <div className="flex items-center text-sm text-green-700">
                            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                            {store.google_rating} / 5.0
                          </div>
                        )}
                        {store.google_review_count !== null && (
                          <span className="text-sm text-green-700">
                            {store.google_review_count} reviews
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Search for Google location */}
              {!store.google_location_name && (
                <>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={googleSearchQuery}
                      onChange={(e) => setGoogleSearchQuery(e.target.value)}
                      placeholder="Search for business on Google Maps..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleGoogleSearch())}
                    />
                    <button
                      type="button"
                      onClick={handleGoogleSearch}
                      disabled={isSearching || !googleSearchQuery.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search
                        </>
                      )}
                    </button>
                  </div>

                  {/* Search results */}
                  {googleSearchResults.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        Found {googleSearchResults.length} result{googleSearchResults.length !== 1 ? 's' : ''}:
                      </p>
                      {googleSearchResults.map((result, index) => (
                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-900">
                                {result.business_name}
                              </p>
                              <p className="text-xs text-blue-700 mt-1">
                                {result.address}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                {result.average_rating && (
                                  <div className="flex items-center text-sm text-blue-700">
                                    <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                    {result.average_rating} / 5.0
                                  </div>
                                )}
                                {result.total_reviews !== null && (
                                  <span className="text-sm text-blue-700">
                                    {result.total_reviews} reviews
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLinkGoogleLocation(result)}
                            disabled={isLinking}
                            className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                          >
                            {isLinking ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Linking...
                              </>
                            ) : (
                              <>
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Link This Location
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link error */}
                  {linkError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                      <p className="text-red-700 text-sm">{linkError}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

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
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {mutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {store ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
