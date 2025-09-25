import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserSession, clearUserSession } from '../../utils/auth';
import { ResponsiveLogo } from './Logo';

/**
 * Sidebar Navigation Component
 *
 * A responsive vertical navigation component for the PrepDoctors app
 * - Desktop: Full vertical sidebar
 * - Mobile: Collapsible hamburger menu
 * - Includes PrepDoctors branding and active state indicators
 */
const SidebarNavigation = ({ isOpen, setIsOpen, className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userSession, setUserSession] = useState(null);

  // Check for user session on mount
  useEffect(() => {
    const session = getUserSession();
    setUserSession(session);
  }, [location.pathname]);

  // Navigation items
  const navigationItems = [
    {
      name: 'Book Exam',
      href: '/book/exam-types',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      requiresAuth: true
    },
    {
      name: 'My Bookings',
      href: '/my-bookings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      requiresAuth: true
    }
  ];

  // Check if current path is active
  const isActivePath = (href) => {
    if (href === '/book/exam-types') {
      return location.pathname === href || location.pathname.startsWith('/book');
    }
    return location.pathname === href || location.pathname.startsWith(href);
  };

  // Handle navigation
  const handleNavigation = (href) => {
    navigate(href);
    // Close mobile menu after navigation
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    clearUserSession();
    setUserSession(null);
    navigate('/login');
    setIsOpen(false);
  };

  // Don't show navigation on login page or if not authenticated
  if (location.pathname === '/login' || !userSession) {
    return null;
  }

  // Filter nav items based on auth requirements
  const visibleNavItems = navigationItems.filter(item =>
    !item.requiresAuth || userSession
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Full viewport height */}
      <div className={`
        fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 shadow-lg
        transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto lg:shadow-none
        ${className}
      `}>
        <div className="flex flex-col h-full">
          {/* Header with Logo */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center">
              <ResponsiveLogo
                size="medium"
                className="transition-opacity duration-300 hover:opacity-80"
                onClick={() => handleNavigation('/book/exam-types')}
              />
            </div>

            {/* Close button - Mobile only */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close navigation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Enhanced User Info Section */}
          {userSession && (
            <div className="px-6 pb-6 border-b border-gray-200">
              {/* Welcome Message */}
              <div className="text-sm font-semibold text-gray-900 mb-3">
                Welcome back!
              </div>

              {/* User Details Card */}
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-4 space-y-2">
                {/* Student Name */}
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium text-primary-900 truncate">
                    {userSession.studentName || 'Student'}
                  </span>
                </div>

                {/* Student ID */}
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <span className="text-xs font-medium text-primary-700 truncate">
                    ID: {userSession.studentId}
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-primary-700 truncate" title={userSession.email}>
                    {userSession.email}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Items - More spacious */}
          <nav className="flex-1 px-6 py-6 overflow-y-auto">
            <ul className="space-y-3">
              {visibleNavItems.map((item) => {
                const isActive = isActivePath(item.href);

                return (
                  <li key={item.name}>
                    <button
                      onClick={() => handleNavigation(item.href)}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg
                        transition-all duration-200 text-left
                        ${isActive
                          ? 'bg-primary-100 text-primary-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                        focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2
                      `}
                    >
                      <span className={`
                        mr-3 flex-shrink-0
                        ${isActive ? 'text-primary-600' : 'text-gray-400'}
                      `}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.name}</span>

                      {/* Active indicator */}
                      {isActive && (
                        <span className="ml-auto">
                          <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer Section - More spacious */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            {userSession && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 shadow-sm hover:shadow"
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            )}

            {/* Version and Support Info */}
            <div className="mt-4 space-y-1">
              <div className="text-xs text-gray-500 text-center">
                PrepDoctors v1.0.0
              </div>
              <div className="text-xs text-gray-400 text-center">
                © 2025 PrepDoctors
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarNavigation;