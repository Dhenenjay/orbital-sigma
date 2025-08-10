/**
 * Responsive breakpoints for the application
 */
export const breakpoints = {
  mobile: 640,    // < 640px - phones
  tablet: 1024,   // 640px - 1024px - tablets
  desktop: 1280,  // > 1024px - desktops
} as const;

/**
 * Media query helpers
 */
export const mediaQueries = {
  mobile: `@media (max-width: ${breakpoints.mobile - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.mobile}px) and (max-width: ${breakpoints.tablet - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.tablet}px)`,
  tabletUp: `@media (min-width: ${breakpoints.mobile}px)`,
  desktopUp: `@media (min-width: ${breakpoints.desktop}px)`,
} as const;

/**
 * Check if viewport is tablet or smaller
 */
export const isTabletOrSmaller = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints.tablet;
};

/**
 * Check if viewport is mobile
 */
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints.mobile;
};

/**
 * Responsive padding values
 */
export const responsivePadding = {
  mobile: 16,
  tablet: 20,
  desktop: 24,
} as const;

/**
 * Get current viewport size category
 */
export const getViewportSize = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < breakpoints.mobile) return 'mobile';
  if (width < breakpoints.tablet) return 'tablet';
  return 'desktop';
};
