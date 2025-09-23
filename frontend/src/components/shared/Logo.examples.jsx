/**
 * Logo Component Usage Examples
 *
 * This file demonstrates how to integrate the Logo component across the PrepDoctors application.
 * Use these examples as reference when adding the logo to Header, Footer, and other components.
 */

import React from 'react';
import Logo, { ResponsiveLogo, LogoWithFallback } from './Logo.jsx';

/**
 * Example Header Component with Logo
 *
 * Perfect for navigation bars and page headers
 */
export const HeaderWithLogo = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container-app">
        <div className="flex items-center justify-between py-4">
          {/* Logo with link to home */}
          <Logo
            variant="horizontal"
            size="medium"
            linkToHome={true}
            priority={true}
            className="focus:ring-primary-400"
          />

          {/* Navigation items would go here */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="/book/exam-types" className="text-gray-700 hover:text-primary-600">
              Book Exam
            </a>
            <a href="/profile" className="text-gray-700 hover:text-primary-600">
              Profile
            </a>
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

/**
 * Example Footer Component with Logo
 *
 * Good for page footers with company branding
 */
export const FooterWithLogo = () => {
  return (
    <footer className="bg-navy-900 text-white">
      <div className="container-app py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and company info */}
          <div className="md:col-span-1">
            <Logo
              variant="full"
              size="medium"
              className="mb-4 filter brightness-0 invert" // Make logo white for dark background
            />
            <p className="text-gray-300 text-sm">
              Leading provider of medical education and exam preparation.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/book/exam-types" className="text-gray-300 hover:text-white">Book Exam</a></li>
              <li><a href="/support" className="text-gray-300 hover:text-white">Support</a></li>
              <li><a href="/about" className="text-gray-300 hover:text-white">About</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <p className="text-gray-300 text-sm">
              info@prepdoctors.com
            </p>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              {/* Social media icons would go here */}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          © 2024 PrepDoctors. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

/**
 * Example Login Page with Logo
 *
 * Shows how to integrate logo into the login form
 */
export const LoginFormWithLogo = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header with Logo */}
        <div className="text-center">
          <Logo
            variant="full"
            size="large"
            priority={true}
            className="mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mock Exam Booking
          </h1>
          <p className="text-gray-600">
            Enter your details to access the booking system.
          </p>
        </div>

        {/* Login form would continue here... */}
      </div>
    </div>
  );
};

/**
 * Example Mobile-First Responsive Header
 *
 * Uses ResponsiveLogo for automatic variant switching
 */
export const ResponsiveHeader = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container-app">
        <div className="flex items-center justify-between py-3">
          {/* Responsive logo that automatically switches variants */}
          <ResponsiveLogo
            size="medium"
            linkToHome={true}
            priority={true}
          />

          {/* User profile or menu */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              Welcome, John Doe
            </span>
            <button className="btn-outline btn-small">
              Menu
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

/**
 * Example Error Page with Logo
 *
 * Shows how to use LogoWithFallback for reliability
 */
export const ErrorPageWithLogo = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LogoWithFallback
          variant="full"
          size="large"
          className="mx-auto mb-8"
        />
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <a href="/login" className="btn-primary">
          Go to Login
        </a>
      </div>
    </div>
  );
};

/**
 * Example Sidebar with Icon Logo
 *
 * Perfect for dashboard layouts with compact sidebar
 */
export const SidebarWithLogo = () => {
  return (
    <aside className="bg-white shadow-lg w-64 min-h-screen">
      <div className="p-6 border-b">
        <Logo
          variant="icon"
          size="large"
          className="mx-auto"
        />
      </div>

      <nav className="p-6">
        <ul className="space-y-2">
          <li>
            <a href="/dashboard" className="block p-2 rounded hover:bg-gray-100">
              Dashboard
            </a>
          </li>
          <li>
            <a href="/book/exam-types" className="block p-2 rounded hover:bg-gray-100">
              Book Exam
            </a>
          </li>
          {/* More navigation items... */}
        </ul>
      </nav>
    </aside>
  );
};

/**
 * Example Loading Screen with Logo
 *
 * Shows logo with loading animation
 */
export const LoadingScreenWithLogo = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Logo
          variant="full"
          size="xl"
          priority={true}
          className="mx-auto mb-8 animate-pulse"
        />
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="text-gray-600 font-medium">Loading...</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Example Brand Colors for Dark Backgrounds
 *
 * Utility classes to make logos work on dark backgrounds
 */
export const LogoOnDarkBackground = () => {
  return (
    <div className="bg-navy-900 p-8 text-center">
      <h3 className="text-white text-lg mb-6">Logo on Dark Background</h3>

      {/* Method 1: Use filter to make logo white */}
      <div className="mb-6">
        <Logo
          variant="horizontal"
          size="medium"
          className="filter brightness-0 invert"
        />
        <p className="text-gray-300 text-sm mt-2">Using CSS filter</p>
      </div>

      {/* Method 2: Custom dark variant (would need separate logo file) */}
      <div className="mb-6">
        <div className="text-white font-headline font-bold text-2xl">
          PrepDoctors
        </div>
        <p className="text-gray-300 text-sm mt-2">Text fallback</p>
      </div>
    </div>
  );
};

/**
 * Integration Examples in Current Components
 *
 * These show how to modify existing components to include the logo
 */

// For LoginForm.jsx - Replace the existing header section:
export const LoginFormHeaderReplacement = () => (
  <div className="text-center">
    <Logo
      variant="full"
      size="large"
      priority={true}
      className="mx-auto mb-6"
    />
    <h1 className="text-3xl font-bold text-gray-900 mb-2">
      Mock Exam Booking
    </h1>
    <p className="text-gray-600">
      Enter your details to access the booking system.
    </p>
  </div>
);

// For ExamTypeSelector.jsx - Add above the title:
export const ExamTypeSelectorHeaderAddition = () => (
  <div className="text-center mb-8">
    <Logo
      variant="horizontal"
      size="medium"
      className="mx-auto mb-6"
    />
  </div>
);

// For BookingConfirmation.jsx - Add above success icon:
export const BookingConfirmationHeaderAddition = () => (
  <div className="text-center mb-6">
    <Logo
      variant="horizontal"
      size="medium"
      className="mx-auto mb-4"
    />
  </div>
);

/**
 * Advanced Usage: Logo with Animation
 */
export const AnimatedLogo = () => {
  return (
    <div className="text-center p-8">
      <Logo
        variant="full"
        size="large"
        className="mx-auto transition-transform duration-300 hover:scale-110"
        onClick={() => console.log('Logo clicked!')}
      />
      <p className="text-gray-600 text-sm mt-4">Hover to see animation</p>
    </div>
  );
};

export default {
  HeaderWithLogo,
  FooterWithLogo,
  LoginFormWithLogo,
  ResponsiveHeader,
  ErrorPageWithLogo,
  SidebarWithLogo,
  LoadingScreenWithLogo,
  LogoOnDarkBackground,
  AnimatedLogo
};