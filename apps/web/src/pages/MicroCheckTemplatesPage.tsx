import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Plus,
  Edit,
  Copy,
  Archive,
  Trash2,
  Search,
  Filter,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Star,
  Shield,
  ShieldCheck,
  Utensils,
  Wrench,
  Users,
  Package,
  FileText,
  Building2,
  Bug,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { microCheckAPI } from '@/services/api';
import type { MicroCheckTemplate, MicroCheckCategory, MicroCheckSeverity } from '@/types/microCheck';
import AITemplateWizard from '@/components/AITemplateWizard';

const MicroCheckTemplatesPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'starters' | 'my-templates'>('my-templates');
  const [templates, setTemplates] = useState<MicroCheckTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Set<MicroCheckCategory>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTemplate, setSelectedTemplate] = useState<MicroCheckTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<MicroCheckTemplate>>({});
  const [submitting, setSubmitting] = useState(false);
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [showAIWizard, setShowAIWizard] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isOperator = user?.role === 'GM' || user?.role === 'OWNER' || user?.role === 'TRIAL_ADMIN';
  const canManage = isAdmin || isOperator;

  const fetchCategories = useCallback(async () => {
    try {
      const params: any = {};

      // Filter by source and brand based on active tab
      if (activeTab === 'starters') {
        params.is_local = 'false';
      } else {
        if (user?.brand_id) {
          params.brand = user.brand_id;
        }
      }

      const categories = await microCheckAPI.getTemplateCategories(params);
      setAvailableCategories(new Set(categories as MicroCheckCategory[]));
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, [activeTab, user?.brand_id]);

  const fetchTemplates = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      // Use isSearching for subsequent fetches if templates already loaded
      if (templates.length > 0 && !append) {
        setIsSearching(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const params: any = { page };

      // Filter by source and brand based on active tab
      if (activeTab === 'starters') {
        // Starters: show global templates (brand__isnull=True)
        params.is_local = 'false';
      } else {
        // My Templates: show only templates for user's brand
        if (user?.brand_id) {
          params.brand = user.brand_id;
        }
      }

      // Backend filtering
      if (categoryFilter) params.category = categoryFilter;
      if (severityFilter) params.severity = severityFilter;
      if (searchTerm) params.search = searchTerm;

      console.log('[MicroCheckTemplatesPage] Fetching with params:', params);

      const response = await microCheckAPI.getTemplates(params);

      // API returns paginated response: { count, next, previous, results }
      const data = response.results || response;
      const hasNextPage = !!response.next;

      console.log(`[MicroCheckTemplatesPage] Fetched ${data.length} templates (page ${page}), hasMore: ${hasNextPage}, total count: ${response.count}`);

      if (append) {
        setTemplates(prev => [...prev, ...data]);
      } else {
        setTemplates(data);
      }

      setHasMore(hasNextPage);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError('Unable to load templates');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [activeTab, categoryFilter, severityFilter, searchTerm, user?.brand_id, templates.length]);

  // Fetch categories when tab or user changes
  useEffect(() => {
    if (canManage) {
      fetchCategories();
    }
  }, [canManage, fetchCategories]);

  // Debounce search and trigger fetch on filter changes
  useEffect(() => {
    if (!canManage) return;

    // Only debounce search, not category/severity filters
    if (searchTerm) {
      const timer = setTimeout(() => {
        fetchTemplates(1, false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Immediately fetch for filter changes
      fetchTemplates(1, false);
    }
  }, [canManage, searchTerm, categoryFilter, severityFilter, activeTab, user?.brand_id, fetchTemplates]);

  const handleCreateTemplate = () => {
    setModalMode('create');
    setSelectedTemplate(null);
    setFormData({
      category: 'CLEANLINESS',
      severity: 'MEDIUM',
      title: '',
      description: '',
      success_criteria: '',
      default_photo_required: false,
      expected_completion_seconds: 30,
      is_active: true,
      rotation_priority: 50,
    });
    setReferenceImageFile(null);
    setReferenceImagePreview(null);
    setShowModal(true);
  };

  const handleEditTemplate = (template: MicroCheckTemplate) => {
    setModalMode('edit');
    setSelectedTemplate(template);
    setFormData({
      category: template.category,
      severity: template.severity,
      title: template.title,
      description: template.description,
      success_criteria: template.success_criteria,
      default_photo_required: template.default_photo_required,
      expected_completion_seconds: template.expected_completion_seconds,
      is_active: template.is_active,
      rotation_priority: template.rotation_priority,
    });
    setReferenceImageFile(null);
    setReferenceImagePreview(template.visual_reference_image || null);
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setReferenceImageFile(null);
    setReferenceImagePreview(null);
  };

  const handleDuplicateTemplate = async (template: MicroCheckTemplate) => {
    try {
      await microCheckAPI.duplicateTemplate(template.id, `${template.title} (My Copy)`);
      // Switch to "My Templates" tab and refresh
      setActiveTab('my-templates');
      fetchTemplates();
    } catch (err) {
      console.error('Error duplicating template:', err);
      alert('Unable to duplicate template');
    }
  };

  const handleArchiveTemplate = async (template: MicroCheckTemplate) => {
    if (!confirm(`Archive "${template.title}"? This will mark it as inactive.`)) return;
    try {
      await microCheckAPI.archiveTemplate(template.id);
      fetchTemplates();
    } catch (err) {
      console.error('Error archiving template:', err);
      alert('Unable to archive template');
    }
  };

  const handleDeleteTemplate = async (template: MicroCheckTemplate) => {
    if (!confirm(`Delete "${template.title}"? This action cannot be undone.`)) return;
    try {
      await microCheckAPI.deleteTemplate(template.id);
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Unable to delete template');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Create FormData for file upload
      const submitData = new FormData();

      // Only include editable fields (not read-only fields like version, created_by, etc.)
      const editableFields = [
        'category', 'severity', 'title', 'description', 'success_criteria',
        'default_photo_required', 'expected_completion_seconds', 'is_active', 'rotation_priority'
      ];

      // Append editable form fields
      editableFields.forEach(key => {
        const value = formData[key as keyof typeof formData];
        if (value !== undefined && value !== null) {
          submitData.append(key, String(value));
        }
      });

      // Append image if selected
      if (referenceImageFile) {
        submitData.append('visual_reference_image', referenceImageFile);
      }

      if (modalMode === 'create') {
        await microCheckAPI.createTemplate(submitData);
      } else if (modalMode === 'edit' && selectedTemplate) {
        await microCheckAPI.updateTemplate(selectedTemplate.id, submitData);
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err: any) {
      console.error('Error submitting template:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.detail ||
                       err.response?.data?.message ||
                       JSON.stringify(err.response?.data) ||
                       'Unable to save template';
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Search and filtering now handled by backend
  const filteredTemplates = templates;

  const handleLoadMore = () => {
    fetchTemplates(currentPage + 1, true);
  };

  // Category display names
  const categoryDisplayNames: Record<MicroCheckCategory, string> = {
    PPE: 'PPE',
    SAFETY: 'Safety',
    CLEANLINESS: 'Cleanliness',
    FOOD_HANDLING: 'Food Handling',
    FOOD_SAFETY: 'Food Safety',
    EQUIPMENT: 'Equipment',
    OPERATIONAL: 'Operational',
    UNIFORM: 'Uniform',
    STAFF_BEHAVIOR: 'Staff Behavior',
    FOOD_QUALITY: 'Food Quality',
    MENU_BOARD: 'Menu Board',
    WASTE_MANAGEMENT: 'Waste Management',
    PEST_CONTROL: 'Pest Control',
    STORAGE: 'Storage',
    DOCUMENTATION: 'Documentation',
    FACILITY: 'Facility',
  };

  const getCategoryBadgeColor = (category: MicroCheckCategory) => {
    const colors: Record<MicroCheckCategory, string> = {
      PPE: 'bg-purple-100 text-purple-700',
      SAFETY: 'bg-red-100 text-red-700',
      CLEANLINESS: 'bg-blue-100 text-blue-700',
      FOOD_HANDLING: 'bg-green-100 text-green-700',
      FOOD_SAFETY: 'bg-green-100 text-green-700',
      EQUIPMENT: 'bg-gray-100 text-gray-700',
      OPERATIONAL: 'bg-indigo-100 text-indigo-700',
      UNIFORM: 'bg-purple-100 text-purple-700',
      STAFF_BEHAVIOR: 'bg-pink-100 text-pink-700',
      FOOD_QUALITY: 'bg-emerald-100 text-emerald-700',
      MENU_BOARD: 'bg-cyan-100 text-cyan-700',
      WASTE_MANAGEMENT: 'bg-orange-100 text-orange-700',
      PEST_CONTROL: 'bg-yellow-100 text-yellow-700',
      STORAGE: 'bg-indigo-100 text-indigo-700',
      DOCUMENTATION: 'bg-pink-100 text-pink-700',
      FACILITY: 'bg-teal-100 text-teal-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getSeverityBadgeColor = (severity: MicroCheckSeverity) => {
    const colors: Record<MicroCheckSeverity, string> = {
      CRITICAL: 'bg-red-100 text-red-700 border-red-300',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      LOW: 'bg-green-100 text-green-700 border-green-300',
    };
    return colors[severity] || 'bg-gray-100 text-gray-700';
  };

  const getCategoryIcon = (category: MicroCheckCategory) => {
    const iconProps = { className: "w-3.5 h-3.5" };
    const icons: Record<MicroCheckCategory, React.ReactElement> = {
      PPE: <Shield {...iconProps} />,
      SAFETY: <ShieldCheck {...iconProps} />,
      CLEANLINESS: <Sparkles {...iconProps} />,
      FOOD_HANDLING: <Utensils {...iconProps} />,
      FOOD_SAFETY: <ShieldCheck {...iconProps} />,
      EQUIPMENT: <Wrench {...iconProps} />,
      OPERATIONAL: <Settings {...iconProps} />,
      UNIFORM: <Users {...iconProps} />,
      STAFF_BEHAVIOR: <Users {...iconProps} />,
      FOOD_QUALITY: <Star {...iconProps} />,
      MENU_BOARD: <FileText {...iconProps} />,
      WASTE_MANAGEMENT: <Trash2 {...iconProps} />,
      PEST_CONTROL: <Bug {...iconProps} />,
      STORAGE: <Package {...iconProps} />,
      DOCUMENTATION: <FileText {...iconProps} />,
      FACILITY: <Building2 {...iconProps} />,
    };
    return icons[category] || <Settings {...iconProps} />;
  };

  if (!canManage) {
    return (
      <div className="p-4 lg:p-8">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to manage templates.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-teal-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Templates</h1>
                <p className="text-gray-600">Manage your Micro Check templates</p>
              </div>
            </div>
          </div>

          {/* Info Banner for Coaching Users */}
          {isOperator && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                <Sparkles className="w-4 h-4 inline mr-2" />
                You can customize our starter templates or create your own micro-checks for your team
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('my-templates')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'my-templates'
                ? 'border-b-2 border-teal-600 text-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Templates
          </button>
          <button
            onClick={() => setActiveTab('starters')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'starters'
                ? 'border-b-2 border-teal-600 text-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            PeakOps Starters
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                {isSearching && (
                  <Loader2 className="w-5 h-5 text-teal-600 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2" />
                )}
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center"
              >
                <Filter className="w-5 h-5 mr-2" />
                Filters
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              {activeTab === 'my-templates' && (
                <>
                  <button
                    onClick={() => setShowAIWizard(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium flex items-center"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate with AI
                  </button>
                  <button
                    onClick={handleCreateTemplate}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    New Template
                  </button>
                </>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">All Categories</option>
                  {Array.from(availableCategories).sort().map((category) => (
                    <option key={category} value={category}>
                      {categoryDisplayNames[category]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'starters' ? 'No Starter Templates Found' : 'No Custom Templates Yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || categoryFilter || severityFilter
                ? 'Try adjusting your filters'
                : activeTab === 'starters'
                ? 'Starter templates will appear here'
                : 'Create your first template or duplicate a starter template'}
            </p>
            {activeTab === 'my-templates' && !searchTerm && !categoryFilter && !severityFilter && (
              <button
                onClick={handleCreateTemplate}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                Create Template
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Stats
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                    {/* Reference Image */}
                    <td className="px-4 py-3">
                      {template.visual_reference_image ? (
                        <img
                          src={template.visual_reference_image}
                          alt={`Reference for ${template.title}`}
                          className="w-12 h-12 object-cover rounded border border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200" />
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 w-fit ${getCategoryBadgeColor(template.category)}`}>
                        {getCategoryIcon(template.category)}
                        {template.category_display}
                      </span>
                    </td>

                    {/* Template Info (2 lines) */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{template.title}</span>
                        {!template.is_active && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">Inactive</span>
                        )}
                        {template.source === 'google_reviews' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded flex items-center">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Reviews
                          </span>
                        )}
                        {template.source === 'PEAKOPS' && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Starter
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">{template.description}</p>
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityBadgeColor(template.severity)}`}>
                        {template.severity_display}
                      </span>
                    </td>

                    {/* Stats */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs text-gray-600">
                        {template.default_photo_required && (
                          <span className="text-xs text-blue-600">📷 Photo Required</span>
                        )}
                        {template.usage_stats && activeTab === 'my-templates' && (
                          <>
                            <span className="flex items-center">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {template.usage_stats.times_used} uses
                            </span>
                            {template.usage_stats.pass_rate !== null && (
                              <span>
                                {Math.round(template.usage_stats.pass_rate)}% pass
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {activeTab === 'starters' ? (
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded hover:bg-teal-100 transition-colors text-sm font-medium flex items-center"
                            title="Duplicate to My Templates"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Duplicate
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                              title="Edit Template"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleArchiveTemplate(template)}
                              className="p-1.5 bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors"
                              title="Archive Template"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteTemplate(template)}
                                className="p-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                                title="Delete Template"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Button */}
        {!loading && hasMore && filteredTemplates.length > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Templates'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'create' ? 'Create Template' : 'Edit Template'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Success Criteria *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.success_criteria || ''}
                  onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Describe what a PASS looks like"
                />
              </div>

              {/* Reference Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Image <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Upload an example image showing what "good" looks like
                </p>

                {referenceImagePreview ? (
                  <div className="relative">
                    <img
                      src={referenceImagePreview}
                      alt="Reference preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-10 h-10 mb-3 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    required
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as MicroCheckCategory })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="PPE">PPE</option>
                    <option value="SAFETY">Safety</option>
                    <option value="CLEANLINESS">Cleanliness</option>
                    <option value="FOOD_HANDLING">Food Handling</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="WASTE_MANAGEMENT">Waste Management</option>
                    <option value="PEST_CONTROL">Pest Control</option>
                    <option value="STORAGE">Storage</option>
                    <option value="DOCUMENTATION">Documentation</option>
                    <option value="FACILITY">Facility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity *</label>
                  <select
                    required
                    value={formData.severity || ''}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as MicroCheckSeverity })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Completion (seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={formData.expected_completion_seconds || 30}
                  onChange={(e) => setFormData({ ...formData, expected_completion_seconds: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.default_photo_required || false}
                    onChange={(e) => setFormData({ ...formData, default_photo_required: e.target.checked })}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Photo Required</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    modalMode === 'create' ? 'Create Template' : 'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Template Wizard */}
      {showAIWizard && (
        <AITemplateWizard
          onClose={() => setShowAIWizard(false)}
          onComplete={() => {
            console.log('[MicroCheckTemplatesPage] AI wizard completed, switching to My Templates tab');
            setActiveTab('my-templates');  // Switch to My Templates tab to see new templates
            fetchTemplates();
          }}
          initialBrandName={user?.brand_name || ''}
        />
      )}
    </div>
  );
};

export default MicroCheckTemplatesPage;
