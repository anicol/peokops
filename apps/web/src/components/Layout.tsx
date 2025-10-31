import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProgressiveNavigation } from '@/hooks/useProgressiveNavigation';
import { useFeatureGates } from '@/hooks/useFeatureGates';
import { ImpersonationBanner } from './ImpersonationBanner';
import { TrialFooter, MultiStoreFooter, EnterpriseFooter, SuperAdminFooter } from './footers';
import {
  Home,
  CheckSquare,
  Sparkles,
  FileSearch,
  ListTodo,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  User,
  Building2,
  Users,
  Activity,
  Lock,
  Store,
  FileText,
  Plug,
  Calendar,
} from 'lucide-react';

const navigationSections = [
  {
    title: null, // Workflows
    items: [
      { name: 'Home', href: '/', icon: Home, key: 'home' },
      { name: 'Micro Checks', href: '/micro-check-history', icon: CheckSquare, key: 'microChecks' },
      { name: 'AI Coach', href: '/videos', icon: Sparkles, key: 'aiCoach' },
      { name: 'Inspections', href: '/inspections', icon: FileSearch, key: 'inspections' },
      { name: 'Actions', href: '/actions', icon: ListTodo, key: 'actions' },
      { name: 'Insights', href: '/insights', icon: BarChart3, key: 'insights' },
    ]
  },
  {
    title: 'Settings', // Settings section
    items: [
      { name: 'Profile', href: '/profile', icon: User, key: 'profile', roles: ['ADMIN', 'OWNER', 'TRIAL_ADMIN'] },
      { name: 'Templates', href: '/micro-check-templates', icon: FileText, key: 'templates', roles: ['ADMIN', 'OWNER', 'TRIAL_ADMIN'] },
      { name: 'Schedule', href: '/schedule', icon: Calendar, key: 'schedule', roles: ['ADMIN', 'OWNER', 'TRIAL_ADMIN', 'GM'] },
      { name: 'Stores', href: '/stores', icon: Store, key: 'stores', roles: ['ADMIN', 'OWNER', 'TRIAL_ADMIN'] },
      { name: 'Users', href: '/users', icon: Users, key: 'users', roles: ['ADMIN', 'OWNER', 'TRIAL_ADMIN'] },
      { name: 'Integrations', href: '/integrations', icon: Plug, key: 'integrations', roles: ['ADMIN', 'OWNER', 'TRIAL_ADMIN'] },
      { name: 'Account', href: '/account', icon: Building2, key: 'account', roles: ['ADMIN', 'OWNER', 'TRIAL_ADMIN'] },
    ]
  },
  {
    title: 'System Administration',
    items: [
      { name: 'Brands', href: '/brands', icon: Building2, key: 'systemBrands' },
      { name: 'Users', href: '/admin/users', icon: Users, key: 'systemUsers' },
      { name: 'System Queue', href: '/admin/queue', icon: Activity, key: 'systemQueue' },
      { name: 'Engagement', href: '/admin/engagement', icon: BarChart3, key: 'systemEngagement', roles: ['SUPER_ADMIN'] },
    ]
  }
] as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = useProgressiveNavigation();
  const { getProgress, registry } = useFeatureGates();

  const filteredSections = navigationSections
    .map(section => {
      const filteredItems = section.items.filter(item => {
        const state = navState[item.key as keyof typeof navState];
        if (state === 'hidden') return false;

        // Check role-based visibility
        const itemWithRoles = item as any;
        if (itemWithRoles.roles && user?.role) {
          return itemWithRoles.roles.includes(user.role);
        }

        return true;
      });

      if (filteredItems.length === 0) return null;

      return {
        ...section,
        items: filteredItems
      };
    })
    .filter((section): section is NonNullable<typeof section> => section !== null);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900 lg:hidden mr-2"
            >
              <Menu className="w-6 h-6" />
            </button>
            {navState.showLogo && (
              <div className="flex items-center space-x-2">
                <img src="/logo.png" alt="PeakOps" className="w-8 h-8" />
                <h1 className="text-xl font-semibold text-gray-900">PeakOps</h1>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {navState.showUserEmail && (
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email}
                  </p>
                  {!user?.is_trial_user && (
                    <p className="text-xs text-gray-500">{user?.role}</p>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={logout}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Impersonation Banner */}
      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex flex-col w-64 max-w-xs bg-white shadow-xl h-full">
              <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
                {filteredSections.map((section, sectionIdx) => (
                  <div key={sectionIdx}>
                    {section.title && (
                      <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {section.title}
                      </h3>
                    )}
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const state = navState[item.key as keyof typeof navState];
                        const isDisabled = state === 'visible-disabled';
                        const isTeaser = state === 'teaser';
                        const isActive = location.pathname === item.href;

                        const baseClasses = 'group flex items-center px-3 py-2 text-sm font-medium rounded-md';
                        const stateClasses = isDisabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : isTeaser
                            ? 'text-gray-500 cursor-pointer hover:bg-blue-50 hover:text-blue-600'
                            : isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';

                        if (isDisabled) {
                          return (
                            <div
                              key={item.name}
                              className={`${baseClasses} ${stateClasses}`}
                              title="Complete previous steps to unlock"
                            >
                              <item.icon className="w-4 h-4 mr-3" />
                              {item.name}
                            </div>
                          );
                        }

                        if (isTeaser) {
                          // Map navigation key to feature registry key
                          const featureKey = item.key === 'aiCoach' ? 'ai-coach' :
                                             item.key === 'inspections' ? 'inspections' :
                                             item.key === 'insights' ? 'insights' : null;

                          const progressHint = featureKey ? getProgress(featureKey as any) : 'Locked';
                          const lockedRoute = featureKey ? registry[featureKey].lockedRoute : '/stores';

                          // Create tooltip text
                          const tooltipText = featureKey === 'ai-coach' ? 'Unlock after 3 Micro Checks.' :
                                              featureKey === 'inspections' ? 'Upgrade to Enterprise.' :
                                              featureKey === 'insights' ? 'Upgrade to unlock Insights.' :
                                              'Locked feature';

                          return (
                            <div
                              key={item.name}
                              className={`${baseClasses} ${stateClasses} cursor-pointer`}
                              title={tooltipText}
                              onClick={() => {
                                setSidebarOpen(false);
                                navigate(lockedRoute);
                              }}
                            >
                              <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                              <span className="flex-1 min-w-0 truncate">{item.name}</span>
                              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                <span className="text-xs text-gray-400 whitespace-nowrap">{progressHint}</span>
                                <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={`${baseClasses} ${stateClasses}`}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <item.icon className="w-4 h-4 mr-3" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64 bg-white border-r border-gray-200">
            <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
              {filteredSections.map((section, sectionIdx) => (
                <div key={sectionIdx}>
                  {section.title && (
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {section.title}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const state = navState[item.key as keyof typeof navState];
                      const isDisabled = state === 'visible-disabled';
                      const isTeaser = state === 'teaser';
                      const isActive = location.pathname === item.href;

                      const baseClasses = 'group flex items-center px-3 py-2 text-sm font-medium rounded-md';
                      const stateClasses = isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : isTeaser
                          ? 'text-gray-500 cursor-pointer hover:bg-blue-50 hover:text-blue-600'
                          : isActive
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';

                      if (isDisabled) {
                        return (
                          <div
                            key={item.name}
                            className={`${baseClasses} ${stateClasses}`}
                            title="Complete previous steps to unlock"
                          >
                            <item.icon className="w-4 h-4 mr-3" />
                            {item.name}
                          </div>
                        );
                      }

                      if (isTeaser) {
                        // Map navigation key to feature registry key
                        const featureKey = item.key === 'aiCoach' ? 'ai-coach' :
                                           item.key === 'inspections' ? 'inspections' :
                                           item.key === 'insights' ? 'insights' : null;

                        const progressHint = featureKey ? getProgress(featureKey as any) : 'Locked';
                        const lockedRoute = featureKey ? registry[featureKey].lockedRoute : '/stores';

                        // Create tooltip text
                        const tooltipText = featureKey === 'ai-coach' ? 'Unlock after 3 Micro Checks.' :
                                            featureKey === 'inspections' ? 'Upgrade to Enterprise.' :
                                            featureKey === 'insights' ? 'Upgrade to unlock Insights.' :
                                            'Locked feature';

                        return (
                          <div
                            key={item.name}
                            className={`${baseClasses} ${stateClasses} cursor-pointer`}
                            title={tooltipText}
                            onClick={() => navigate(lockedRoute)}
                          >
                            <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                            <span className="flex-1 min-w-0 truncate">{item.name}</span>
                            <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                              <span className="text-xs text-gray-400 whitespace-nowrap">{progressHint}</span>
                              <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`${baseClasses} ${stateClasses}`}
                        >
                          <item.icon className="w-4 h-4 mr-3" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mode-specific footer */}
      {navState.navigationMode === 'TRIAL_MODE' && <TrialFooter />}
      {navState.navigationMode === 'MULTI_STORE_MODE' && <MultiStoreFooter />}
      {navState.navigationMode === 'ENTERPRISE_MODE' && <EnterpriseFooter />}
      {navState.navigationMode === 'SUPER_ADMIN_MODE' && <SuperAdminFooter />}
    </div>
  );
}