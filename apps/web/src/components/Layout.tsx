import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProgressiveNavigation } from '@/hooks/useProgressiveNavigation';
import {
  Home,
  CheckSquare,
  Video,
  Puzzle,
  BarChart3,
  Settings,
  Menu,
  LogOut,
  User,
  ArrowRight,
} from 'lucide-react';

const navigationSections = [
  {
    title: null, // Flat navigation - no sections
    items: [
      { name: 'Home', href: '/', icon: Home, key: 'home' },
      { name: 'Checks', href: '/micro-check-history', icon: CheckSquare, key: 'checks' },
      { name: 'Walkthroughs', href: '/videos', icon: Video, key: 'walkthroughs' },
      { name: 'Templates', href: '/micro-check-templates', icon: Puzzle, key: 'templates' },
      { name: 'Insights', href: '/coaching/trends', icon: BarChart3, key: 'insights' },
      { name: 'Settings', href: '/stores', icon: Settings, key: 'settings' },
    ]
  }
] as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = useProgressiveNavigation();

  const filteredSections = navigationSections
    .map(section => {
      const filteredItems = section.items.filter(item => {
        const state = navState[item.key as keyof typeof navState];
        return state !== 'hidden';
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
            {/* Skip to Dashboard for trial users */}
            {navState.showSkipToDashboard && (
              <button
                onClick={() => navigate('/')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                Skip to Dashboard
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            )}
            
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
                        const isActive = location.pathname === item.href;

                        const baseClasses = 'group flex items-center px-3 py-2 text-sm font-medium rounded-md';
                        const stateClasses = isDisabled
                          ? 'text-gray-400 cursor-not-allowed'
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
                      const isActive = location.pathname === item.href;

                      const baseClasses = 'group flex items-center px-3 py-2 text-sm font-medium rounded-md';
                      const stateClasses = isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
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
    </div>
  );
}