import React, { useState } from 'react';
import { X, Sparkles, Loader2, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { microCheckAPI } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { MicroCheckTemplate, MicroCheckCategory } from '@/types/microCheck';

interface AITemplateWizardProps {
  onClose: () => void;
  onComplete: () => void;
  initialBrandName?: string;
  initialIndustry?: string;
}

type WizardStep = 'brandInfo' | 'analyzing' | 'category' | 'generating' | 'review';

interface BrandAnalysis {
  business_type: string;
  typical_operations: string;
  compliance_focus_areas: string[];
}

const AITemplateWizard: React.FC<AITemplateWizardProps> = ({
  onClose,
  onComplete,
  initialBrandName = '',
  initialIndustry = ''
}) => {
  const { user, refetchUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('brandInfo');
  const [brandName, setBrandName] = useState(initialBrandName);
  const [industry, setIndustry] = useState<string>(initialIndustry);
  const [brandAnalysis, setBrandAnalysis] = useState<BrandAnalysis | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MicroCheckCategory | null>(null);
  const [generatedTemplates, setGeneratedTemplates] = useState<MicroCheckTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [generationStatus, setGenerationStatus] = useState<string>('');

  const handleBrandInfoSubmit = () => {
    if (!brandName.trim()) {
      setError('Please enter a brand name');
      return;
    }
    setError(null);
    setCurrentStep('analyzing');
    analyzeBrand();
  };

  const analyzeBrand = async () => {
    setIsLoading(true);
    setError(null);

    const statusMessages = [
      `Researching ${brandName}...`,
      'Analyzing business type and operations...',
      'Identifying compliance requirements...',
      'Understanding industry standards...',
      'Preparing AI for template generation...'
    ];

    let currentMessageIndex = 0;
    setAnalysisStatus(statusMessages[0]);

    // Update status message every 400ms
    const statusInterval = setInterval(() => {
      currentMessageIndex++;
      if (currentMessageIndex < statusMessages.length) {
        setAnalysisStatus(statusMessages[currentMessageIndex]);
      }
    }, 400);

    try {
      // Simulate analysis time
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(statusInterval);
      setCurrentStep('category');
      setIsLoading(false);
    } catch (err: any) {
      clearInterval(statusInterval);
      console.error('Brand analysis failed:', err);
      setError('Failed to analyze brand. Please try again.');
      setCurrentStep('brandInfo');
      setIsLoading(false);
    }
  };

  const handleCategorySelect = (category: MicroCheckCategory) => {
    setSelectedCategory(category);
  };

  const handleGenerateTemplates = async () => {
    if (!selectedCategory) return;

    setCurrentStep('generating');
    setIsLoading(true);
    setError(null);

    const categoryName = categories.find(c => c.value === selectedCategory)?.label || selectedCategory;
    const statusMessages = [
      `Analyzing ${categoryName} requirements for ${brandName}...`,
      'Consulting AI knowledge base...',
      'Identifying industry-specific checks...',
      'Crafting custom template recommendations...',
      'Finalizing templates...'
    ];

    let currentMessageIndex = 0;
    setGenerationStatus(statusMessages[0]);

    // Update status message every 500ms
    const statusInterval = setInterval(() => {
      currentMessageIndex++;
      if (currentMessageIndex < statusMessages.length) {
        setGenerationStatus(statusMessages[currentMessageIndex]);
      }
    }, 500);

    try {
      const result = await microCheckAPI.generateTemplatesWithAI(
        selectedCategory,
        5,
        brandName,
        industry || undefined,
        user?.brand_id
      );

      clearInterval(statusInterval);

      setBrandAnalysis(result.brand_analysis);
      setGeneratedTemplates(result.templates);

      // Select all templates by default
      const allIds = new Set(result.templates.map(t => t.id));
      setSelectedTemplates(allIds);

      setCurrentStep('review');
    } catch (err: any) {
      clearInterval(statusInterval);
      console.error('Template generation failed:', err);
      setError(err.response?.data?.error || 'Failed to generate templates. Please try again.');
      setCurrentStep('category');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTemplateSelection = (templateId: string) => {
    const newSelection = new Set(selectedTemplates);
    if (newSelection.has(templateId)) {
      newSelection.delete(templateId);
    } else {
      newSelection.add(templateId);
    }
    setSelectedTemplates(newSelection);
  };

  const handleComplete = async () => {
    // Delete unselected templates
    const unselectedTemplates = generatedTemplates.filter(t => !selectedTemplates.has(t.id));

    if (unselectedTemplates.length > 0) {
      try {
        // Delete unselected templates in parallel
        await Promise.all(
          unselectedTemplates.map(template =>
            microCheckAPI.deleteTemplate(template.id)
          )
        );
      } catch (err) {
        console.error('Error deleting unselected templates:', err);
        // Continue anyway - user can delete them manually later
      }
    }

    // Refetch user profile to update brand name on Account page
    await refetchUser();
    onComplete();
    onClose();
  };

  const categories: Array<{value: MicroCheckCategory, label: string, description: string}> = [
    { value: 'PPE', label: 'Personal Protective Equipment', description: 'Safety gear and protective equipment checks' },
    { value: 'SAFETY', label: 'Safety', description: 'General safety hazards and compliance' },
    { value: 'CLEANLINESS', label: 'Cleanliness', description: 'Facility cleanliness and hygiene' },
    { value: 'FOOD_SAFETY', label: 'Food Safety & Hygiene', description: 'Food handling and storage safety' },
    { value: 'EQUIPMENT', label: 'Equipment & Maintenance', description: 'Equipment condition and functionality' },
    { value: 'OPERATIONAL', label: 'Operational Compliance', description: 'Standard operating procedures' },
    { value: 'UNIFORM', label: 'Uniform Compliance', description: 'Staff uniform standards' },
    { value: 'STAFF_BEHAVIOR', label: 'Staff Behavior', description: 'Professional conduct and service' },
    { value: 'FOOD_QUALITY', label: 'Food Quality & Presentation', description: 'Food quality and presentation standards' },
    { value: 'MENU_BOARD', label: 'Menu Board', description: 'Menu accuracy and compliance' },
  ];

  const getSeverityColor = (severity: string) => {
    const colors = {
      CRITICAL: 'bg-red-100 text-red-700 border-red-300',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      LOW: 'bg-green-100 text-green-700 border-green-300',
    };
    return colors[severity as keyof typeof colors] || colors.MEDIUM;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Template Generator</h2>
              <p className="text-sm text-gray-600">Create custom templates powered by AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'brandInfo' ? 'bg-purple-600 text-white' : 'bg-green-600 text-white'
              }`}>
                {currentStep === 'brandInfo' ? '1' : <Check className="w-5 h-5" />}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">Brand Info</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'analyzing' ? 'bg-purple-600 text-white' :
                (currentStep === 'category' || currentStep === 'generating' || currentStep === 'review') ? 'bg-green-600 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {(currentStep === 'category' || currentStep === 'generating' || currentStep === 'review') ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">Analyze</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'category' || currentStep === 'generating' || currentStep === 'review'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}>
                {currentStep === 'review' ? <Check className="w-5 h-5" /> : '3'}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">Category</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'review' ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                4
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">Review</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Brand Information */}
          {currentStep === 'brandInfo' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tell Us About Your Brand</h3>
              <p className="text-gray-600 mb-6">Provide information about your business to help our AI generate relevant templates.</p>

              <div className="space-y-6 max-w-2xl">
                <div>
                  <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-2">
                    Brand/Business Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="brandName"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g., Five Guys, Starbucks, Target"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                    Industry Type (Optional)
                  </label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select an industry...</option>
                    <option value="RESTAURANT">Restaurant/Food Service</option>
                    <option value="RETAIL">Retail Store</option>
                    <option value="HOSPITALITY">Hospitality/Hotel</option>
                    <option value="HEALTHCARE">Healthcare Facility</option>
                    <option value="MANUFACTURING">Manufacturing</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Why do we need this?</h4>
                  <p className="text-sm text-blue-800">
                    Our AI will research your brand to understand your business type, typical operations,
                    and compliance requirements. This helps generate templates that are specifically
                    tailored to your business needs.
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleBrandInfoSubmit}
                  disabled={!brandName.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Continue to Analysis
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Analyzing Brand */}
          {currentStep === 'analyzing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyzing Your Business</h3>

              {/* Dynamic status message */}
              <div className="mb-4 min-h-[60px] flex items-center justify-center">
                <p className="text-purple-600 font-medium text-base animate-pulse">
                  {analysisStatus}
                </p>
              </div>

              <div className="max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>Brand:</strong> {brandName}
                </p>
                {industry && (
                  <p className="text-sm text-blue-900">
                    <strong>Industry:</strong> {industry}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Category Selection */}
          {currentStep === 'category' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a Category</h3>
              <p className="text-gray-600 mb-6">Choose which area you'd like to generate templates for:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => handleCategorySelect(category.value)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectedCategory === category.value
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <h4 className="font-semibold text-gray-900 mb-1">{category.label}</h4>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleGenerateTemplates}
                  disabled={!selectedCategory}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Generate Templates
                  <Sparkles className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Generating */}
          {currentStep === 'generating' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generating Custom Templates</h3>

              {/* Dynamic status message */}
              <div className="mb-4 min-h-[80px] flex items-center justify-center">
                <p className="text-purple-600 font-medium text-base animate-pulse">
                  {generationStatus}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-900">
                    <strong>Brand:</strong> {brandName}
                  </p>
                  <p className="text-sm text-purple-900 mt-1">
                    <strong>Category:</strong> {categories.find(c => c.value === selectedCategory)?.label}
                  </p>
                </div>

                <p className="text-xs text-gray-500">This may take 10-30 seconds</p>
              </div>
            </div>
          )}

          {/* Step 5: Review Generated Templates */}
          {currentStep === 'review' && (
            <div>
              {brandAnalysis && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Business Analysis</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Type:</strong> {brandAnalysis.business_type}
                  </p>
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Operations:</strong> {brandAnalysis.typical_operations}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Focus Areas:</strong> {brandAnalysis.compliance_focus_areas.join(', ')}
                  </p>
                </div>
              )}

              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Generated Templates ({selectedTemplates.size} of {generatedTemplates.length} selected)
              </h3>
              <p className="text-gray-600 mb-6">Review and select the templates you want to save:</p>

              <div className="space-y-4">
                {generatedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      selectedTemplates.has(template.id)
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.has(template.id)}
                        onChange={() => toggleTemplateSelection(template.id)}
                        className="mt-1 mr-3 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{template.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(template.severity)}`}>
                            {template.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{template.description}</p>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <p className="text-xs text-green-800">
                            <strong>Success Criteria:</strong> {template.success_criteria}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Expected completion: ~{Math.round(template.expected_completion_seconds / 60)} minute(s)
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-6 pt-6 border-gray-200">
                <button
                  onClick={() => setCurrentStep('brandInfo')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Start Over
                </button>
                <button
                  onClick={handleComplete}
                  disabled={selectedTemplates.size === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save {selectedTemplates.size} Template{selectedTemplates.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AITemplateWizard;
