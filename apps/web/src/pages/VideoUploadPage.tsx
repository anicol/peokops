import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';
import { uploadsAPI, storesAPI, brandsAPI } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Upload, X, CheckCircle, Target, Users } from 'lucide-react';
import TrialStatusBanner from '@/components/TrialStatusBanner';
import UploadLimitGuard from '@/components/UploadLimitGuard';

export default function VideoUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storeId, setStoreId] = useState<number | ''>('');
  const [mode, setMode] = useState<'coaching' | 'enterprise'>('coaching');
  const [dragActive, setDragActive] = useState(false);

  const { data: stores } = useQuery('stores', storesAPI.getStores);
  const { data: brands } = useQuery('brands', brandsAPI.getBrands);

  // Auto-select store if user only has access to one store
  const availableStores = user?.role === 'ADMIN'
    ? stores
    : stores?.filter(s => s.id === user?.store);

  // Auto-select the store if there's only one
  if (availableStores?.length === 1 && storeId === '' && availableStores[0]) {
    setStoreId(availableStores[0].id);
  }

  // Check if user's brand has enterprise access
  const selectedStore = availableStores?.find(s => s.id === storeId);
  const userBrand = brands?.find(b => b.id === selectedStore?.brand);
  const hasEnterpriseAccess = userBrand?.has_enterprise_access || false;

  const uploadMutation = useMutation(
    ({ file, storeId, mode }: { file: File; storeId: number; mode: 'coaching' | 'enterprise' }) =>
      uploadsAPI.uploadVideo(file, storeId, mode),
    {
      onSuccess: (upload) => {
        console.log('Upload successful:', upload);
        // Navigate to processing page with upload ID
        if (upload && upload.id) {
          navigate(`/processing/${upload.id}`);
        } else {
          console.error('Upload response missing ID:', upload);
          navigate('/videos');
        }
      },
      onError: (error) => {
        console.error('Upload error:', error);
      }
    }
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        setFile(file);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      setFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !title || typeof storeId !== 'number') {
      return;
    }

    // Note: Title and description are not yet supported in Upload model
    // They can be added later or stored in Video metadata
    uploadMutation.mutate({ file, storeId, mode });
  };

  const removeFile = () => {
    setFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Video</h1>
        <p className="text-gray-600">Upload a video for AI inspection analysis</p>
      </div>

      {/* Trial Status Banner */}
      <TrialStatusBanner
        onUpgradeClick={() => navigate('/checkout')}
      />

      <UploadLimitGuard
        onUpgradeClick={() => navigate('/checkout')}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video File
            </label>
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                >
                  Choose file
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <p className="mt-2 text-sm text-gray-500">
                  or drag and drop a video file here
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Supported formats: MP4, MOV, AVI (max 100MB)
              </p>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Video Details */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter video title"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (Optional)
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter video description"
          />
        </div>

        {/* Only show store selector if there are multiple stores */}
        {availableStores && availableStores.length > 1 && (
          <div>
            <label htmlFor="store" className="block text-sm font-medium text-gray-700">
              Store
            </label>
            <select
              id="store"
              required
              value={storeId}
              onChange={(e) => setStoreId(Number(e.target.value) || '')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Select a store</option>
              {availableStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.brand_name} - {store.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Show selected store as read-only if only one store */}
        {availableStores && availableStores.length === 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Store
            </label>
            <div className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900">
              {availableStores[0].brand_name} - {availableStores[0].name}
            </div>
          </div>
        )}

        {/* Mode Selector - Show only if enterprise access is available */}
        {storeId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Review Type
            </label>
            {hasEnterpriseAccess ? (
              <div className="space-y-3">
                <label
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    mode === 'coaching'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="coaching"
                    checked={mode === 'coaching'}
                    onChange={(e) => setMode(e.target.value as 'coaching')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Target className="w-5 h-5 mr-2 text-green-600" />
                      <span className="font-medium text-gray-900">Self-Review (Coaching)</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Review your own video, approve AI findings, and track your improvement over time
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    mode === 'enterprise'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="enterprise"
                    checked={mode === 'enterprise'}
                    onChange={(e) => setMode(e.target.value as 'enterprise')}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      <span className="font-medium text-gray-900">Inspector Review (Enterprise)</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Professional inspector analyzes video and provides detailed report
                    </p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-600" />
                  <span className="font-medium text-gray-900">Self-Review (Coaching)</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Review your own video and track your improvement over time
                </p>
              </div>
            )}
          </div>
        )}

        {uploadMutation.error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {uploadMutation.error instanceof Error 
              ? uploadMutation.error.message 
              : String(uploadMutation.error) || 'Upload failed. Please try again.'}
          </div>
        ) : null}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/videos')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || !title || !storeId || uploadMutation.isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isLoading ? 'Uploading...' : 'Upload Video'}
          </button>
        </div>
        </form>
      </UploadLimitGuard>
    </div>
  );
}