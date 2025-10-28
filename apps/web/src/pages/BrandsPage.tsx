import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';
import {
  Plus,
  Building2,
  Edit2,
  Trash2,
  Store as StoreIcon,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
  Briefcase,
} from 'lucide-react';
import { brandsAPI } from '@/services/api';
import type { Brand } from '@/types';

const getSubtypeLabel = (subtype: string | undefined): string => {
  if (!subtype) return '-';

  const subtypeLabels: Record<string, string> = {
    'QSR': 'QSR',
    'FAST_CASUAL': 'Fast Casual',
    'CASUAL_DINING': 'Casual Dining',
    'FINE_DINING': 'Fine Dining',
    'CAFE': 'Cafe',
    'BAR_PUB': 'Bar/Pub',
    'FOOD_TRUCK': 'Food Truck',
    'CATERING': 'Catering',
    'BAKERY': 'Bakery',
    'GROCERY': 'Grocery',
    'CONVENIENCE': 'Convenience',
    'FASHION': 'Fashion',
    'HOTEL': 'Hotel',
    'OTHER_SUBTYPE': 'Other',
  };

  return subtypeLabels[subtype] || subtype;
};

export default function BrandsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const queryClient = useQueryClient();

  const { data: brands, isLoading, error } = useQuery<Brand[]>(
    'brands',
    brandsAPI.getBrands
  );

  const deleteMutation = useMutation(
    (id: number) => brandsAPI.deleteBrand(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('brands');
      },
    }
  );

  const handleDelete = async (brand: Brand) => {
    if (brand.stores_count > 0) {
      alert(`Cannot delete ${brand.name} - it has ${brand.stores_count} store(s). Please delete or reassign stores first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${brand.name}?`)) {
      try {
        await deleteMutation.mutateAsync(brand.id);
      } catch (error: any) {
        alert(error.response?.data?.detail || 'Failed to delete brand');
      }
    }
  };

  const filteredBrands = brands?.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading brands...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load brands</h2>
        <p className="text-gray-600">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-gray-600 mt-1">Manage restaurant brands and configurations</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Brand
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Brands</p>
              <p className="text-2xl font-bold text-gray-900">{brands?.length || 0}</p>
            </div>
            <Building2 className="h-8 w-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Brands</p>
              <p className="text-2xl font-bold text-green-600">
                {brands?.filter(b => b.is_active).length || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enterprise Brands</p>
              <p className="text-2xl font-bold text-blue-600">
                {brands?.filter(b => b.has_enterprise_access).length || 0}
              </p>
            </div>
            <Briefcase className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Stores</p>
              <p className="text-2xl font-bold text-gray-900">
                {brands?.reduce((sum, b) => sum + b.stores_count, 0) || 0}
              </p>
            </div>
            <StoreIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Brands List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredBrands.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchTerm ? 'No brands found matching your search' : 'No brands yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stores
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
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
                {filteredBrands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {brand.logo ? (
                          <img
                            src={brand.logo}
                            alt={brand.name}
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center mr-3">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{brand.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getSubtypeLabel(brand.subtype)}
                      </div>
                      {brand.industry && (
                        <div className="text-xs text-gray-500">
                          {brand.industry.charAt(0) + brand.industry.slice(1).toLowerCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <StoreIcon className="h-4 w-4 mr-1 text-gray-400" />
                        {brand.stores_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        brand.has_enterprise_access
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {brand.has_enterprise_access ? (
                          <>
                            <Briefcase className="h-3 w-3 mr-1" />
                            Enterprise
                          </>
                        ) : (
                          'Standard'
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        brand.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {brand.is_active ? (
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
                      {format(new Date(brand.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingBrand(brand)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(brand)}
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
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingBrand) && (
        <BrandFormModal
          brand={editingBrand}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingBrand(null);
          }}
        />
      )}
    </div>
  );
}

interface BrandFormModalProps {
  brand: Brand | null;
  onClose: () => void;
}

function BrandFormModal({ brand, onClose }: BrandFormModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: brand?.name || '',
    description: brand?.description || '',
    industry: brand?.industry || '',
    subtype: brand?.subtype || '',
    is_active: brand?.is_active ?? true,
    has_enterprise_access: brand?.has_enterprise_access ?? false,
  });

  const mutation = useMutation(
    (data: typeof formData) => {
      if (brand) {
        return brandsAPI.updateBrand(brand.id, data);
      }
      return brandsAPI.createBrand(data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('brands');
        onClose();
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {brand ? 'Edit Brand' : 'Create Brand'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g. FastBite"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value, subtype: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select an industry</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="RETAIL">Retail</option>
              <option value="HOSPITALITY">Hospitality</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {formData.industry && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <select
                value={formData.subtype}
                onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a business type</option>
                {formData.industry === 'RESTAURANT' && (
                  <>
                    <option value="QSR">Quick Service / Fast Food</option>
                    <option value="FAST_CASUAL">Fast Casual</option>
                    <option value="CASUAL_DINING">Casual Dining</option>
                    <option value="FINE_DINING">Fine Dining</option>
                    <option value="CAFE">Cafe / Coffee Shop</option>
                    <option value="BAR_PUB">Bar / Pub</option>
                    <option value="FOOD_TRUCK">Food Truck</option>
                    <option value="CATERING">Catering</option>
                    <option value="BAKERY">Bakery / Dessert Shop</option>
                  </>
                )}
                {formData.industry === 'RETAIL' && (
                  <>
                    <option value="GROCERY">Grocery Store</option>
                    <option value="CONVENIENCE">Convenience Store</option>
                    <option value="FASHION">Fashion Retail</option>
                    <option value="OTHER_SUBTYPE">Other Retail</option>
                  </>
                )}
                {formData.industry === 'HOSPITALITY' && (
                  <>
                    <option value="HOTEL">Hotel</option>
                    <option value="OTHER_SUBTYPE">Other Hospitality</option>
                  </>
                )}
                {formData.industry === 'OTHER' && (
                  <option value="OTHER_SUBTYPE">Other</option>
                )}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              placeholder="Brief description of the brand"
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

          <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <input
              type="checkbox"
              id="has_enterprise_access"
              checked={formData.has_enterprise_access}
              onChange={(e) => setFormData({ ...formData, has_enterprise_access: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="ml-3 flex-1">
              <label htmlFor="has_enterprise_access" className="block text-sm font-medium text-gray-900">
                <Briefcase className="h-4 w-4 inline mr-1 text-blue-600" />
                Enterprise Access
              </label>
              <p className="text-xs text-gray-600 mt-0.5">
                Enable inspector-led review workflow and enterprise features
              </p>
            </div>
          </div>

          {mutation.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">
                {String((mutation.error as any)?.response?.data?.detail || 'Failed to save brand')}
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
              {brand ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
