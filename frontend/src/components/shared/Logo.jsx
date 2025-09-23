import React from 'react';
import PropTypes from 'prop-types';

/**
 * PrepDoctors Logo Component
 *
 * A flexible logo component that handles different variants and sizes
 * with responsive behavior and proper accessibility attributes.
 *
 * @param {Object} props
 * @param {'full'|'horizontal'|'icon'} props.variant - Logo variant to display
 * @param {'small'|'medium'|'large'|'xl'} props.size - Size of the logo
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.linkToHome - Whether to wrap logo in a link to home
 * @param {function} props.onClick - Optional click handler
 * @param {boolean} props.priority - Whether to load image with high priority
 */
const Logo = ({
  variant = 'full',
  size = 'medium',
  className = '',
  linkToHome = false,
  onClick,
  priority = false,
  ...props
}) => {
  // Logo URLs from HubSpot CDN
  const logoUrls = {
    full: 'https://46814382.fs1.hubspotusercontent-na1.net/hubfs/46814382/prep%20doctors%20logo-%20vertical.png',
    horizontal: 'https://46814382.fs1.hubspotusercontent-na1.net/hubfs/46814382/Prep%20Doctors%20Logo%20Blue.png',
    icon: 'https://46814382.fs1.hubspotusercontent-na1.net/hubfs/46814382/Prep%20Doctors%20Icon.png'
  };

  // Size configurations
  const sizeClasses = {
    small: {
      full: 'h-12 w-auto', // Vertical logo, height-based
      horizontal: 'h-8 w-auto', // Horizontal logo, shorter
      icon: 'h-8 w-8' // Square icon
    },
    medium: {
      full: 'h-16 w-auto',
      horizontal: 'h-10 w-auto',
      icon: 'h-10 w-10'
    },
    large: {
      full: 'h-24 w-auto',
      horizontal: 'h-14 w-auto',
      icon: 'h-14 w-14'
    },
    xl: {
      full: 'h-32 w-auto',
      horizontal: 'h-18 w-auto',
      icon: 'h-18 w-18'
    }
  };

  // Responsive behavior - automatically switch variants based on screen size
  const responsiveClasses = {
    full: 'block', // Always show full logo unless overridden
    horizontal: 'hidden md:block', // Show horizontal on medium screens and up
    icon: 'block md:hidden' // Show icon only on small screens
  };

  // Alt text based on variant
  const altText = {
    full: 'PrepDoctors - Medical Education Excellence',
    horizontal: 'PrepDoctors Logo',
    icon: 'PrepDoctors Icon'
  };

  // Get the appropriate classes and URL
  const logoUrl = logoUrls[variant];
  const logoSizeClass = sizeClasses[size][variant];
  const logoAlt = altText[variant];

  // Base image classes
  const baseClasses = `
    ${logoSizeClass}
    object-contain
    transition-opacity duration-200
    ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
    ${className}
  `.trim();

  // Loading strategy
  const loadingStrategy = priority ? 'eager' : 'lazy';

  // Logo image element
  const logoElement = (
    <img
      src={logoUrl}
      alt={logoAlt}
      className={baseClasses}
      loading={loadingStrategy}
      onClick={onClick}
      onError={(e) => {
        console.warn(`Failed to load logo variant: ${variant}`, e);
        // Fallback to text if image fails
        e.target.style.display = 'none';
        e.target.parentNode.innerHTML = `
          <div class="text-primary-600 font-headline font-bold ${size === 'small' ? 'text-lg' : size === 'medium' ? 'text-xl' : size === 'large' ? 'text-2xl' : 'text-3xl'}">
            PrepDoctors
          </div>
        `;
      }}
      {...props}
    />
  );

  // Wrap in link if requested
  if (linkToHome) {
    return (
      <a
        href="/"
        className="inline-block focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 rounded"
        aria-label="PrepDoctors Home"
      >
        {logoElement}
      </a>
    );
  }

  return logoElement;
};

/**
 * Responsive Logo Component
 *
 * Automatically shows different logo variants based on screen size:
 * - Mobile: Icon only
 * - Tablet: Horizontal logo
 * - Desktop: Full vertical logo
 */
export const ResponsiveLogo = ({ size = 'medium', className = '', ...props }) => {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Mobile: Icon only */}
      <div className="block sm:hidden">
        <Logo variant="icon" size={size} {...props} />
      </div>

      {/* Tablet: Horizontal logo */}
      <div className="hidden sm:block lg:hidden">
        <Logo variant="horizontal" size={size} {...props} />
      </div>

      {/* Desktop: Full vertical logo */}
      <div className="hidden lg:block">
        <Logo variant="full" size={size} {...props} />
      </div>
    </div>
  );
};

/**
 * Logo with Text Fallback
 *
 * Shows PrepDoctors text if the image fails to load
 */
export const LogoWithFallback = ({ variant = 'full', size = 'medium', className = '', ...props }) => {
  const textSizes = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center ${className}`}>
      <Logo
        variant={variant}
        size={size}
        onError={(e) => {
          // Hide the image and show text fallback
          e.target.style.display = 'none';
          const fallback = e.target.nextElementSibling;
          if (fallback) fallback.style.display = 'block';
        }}
        {...props}
      />
      <div
        className={`hidden font-headline font-bold text-primary-600 ${textSizes[size]}`}
        role="img"
        aria-label="PrepDoctors"
      >
        PrepDoctors
      </div>
    </div>
  );
};

// PropTypes
Logo.propTypes = {
  variant: PropTypes.oneOf(['full', 'horizontal', 'icon']),
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xl']),
  className: PropTypes.string,
  linkToHome: PropTypes.bool,
  onClick: PropTypes.func,
  priority: PropTypes.bool
};

ResponsiveLogo.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xl']),
  className: PropTypes.string
};

LogoWithFallback.propTypes = {
  variant: PropTypes.oneOf(['full', 'horizontal', 'icon']),
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xl']),
  className: PropTypes.string
};

export default Logo;