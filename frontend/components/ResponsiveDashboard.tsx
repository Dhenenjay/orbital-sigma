import { useEffect, useState, ReactNode } from "react";
import { breakpoints } from "../utils/responsive";

interface ResponsiveDashboardProps {
  children: ReactNode;
  sidebarOpen?: boolean;
}

export default function ResponsiveDashboard({ 
  children, 
  sidebarOpen = false 
}: ResponsiveDashboardProps) {
  const [viewportSize, setViewportSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < breakpoints.mobile) {
        setViewportSize('mobile');
      } else if (width < breakpoints.tablet) {
        setViewportSize('tablet');
      } else {
        setViewportSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMounted) {
    return <div>{children}</div>;
  }

  const getPadding = () => {
    switch (viewportSize) {
      case 'mobile': return 16;
      case 'tablet': return 20;
      default: return 24;
    }
  };

  const getMarginLeft = () => {
    if (viewportSize === 'mobile') return 0; // Sidebar overlays on mobile
    if (sidebarOpen) return 320;
    return 0;
  };

  return (
    <main 
      style={{ 
        padding: getPadding(),
        marginLeft: getMarginLeft(),
        transition: "margin-left 0.3s ease",
        minHeight: "100vh",
        maxWidth: viewportSize === 'desktop' ? 'none' : '100%',
        overflowX: 'hidden',
      }}
    >
      {children}
      
      <style jsx global>{`
        /* Responsive adjustments for tablets */
        @media (min-width: 640px) and (max-width: 1023px) {
          /* Grid layouts become single column on tablets */
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
          
          /* Reduce font sizes slightly on tablets */
          h1 { font-size: 1.875rem !important; }
          h2 { font-size: 1.5rem !important; }
          h3 { font-size: 1.25rem !important; }
          
          /* Stack flex items on tablets */
          .tablet-stack {
            flex-direction: column !important;
          }
          
          /* Full width buttons on tablets */
          .tablet-full-width {
            width: 100% !important;
          }
        }

        /* Responsive adjustments for mobile */
        @media (max-width: 639px) {
          /* Stack all layouts vertically on mobile */
          .responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          
          /* Smaller text on mobile */
          h1 { font-size: 1.5rem !important; }
          h2 { font-size: 1.25rem !important; }
          h3 { font-size: 1.125rem !important; }
          p { font-size: 0.875rem !important; }
          
          /* Stack all flex items on mobile */
          .mobile-stack {
            flex-direction: column !important;
          }
          
          /* Full width elements on mobile */
          .mobile-full-width {
            width: 100% !important;
          }
          
          /* Hide non-essential elements on mobile */
          .mobile-hide {
            display: none !important;
          }
          
          /* Reduce padding on mobile */
          section {
            padding: 12px !important;
          }
        }

        /* Ensure images and maps are responsive */
        img, iframe, .map-container {
          max-width: 100% !important;
          height: auto !important;
        }

        /* Responsive tables */
        @media (max-width: 1023px) {
          table {
            display: block !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
          }
        }

        /* Responsive modals */
        @media (max-width: 1023px) {
          .modal-content {
            width: 90vw !important;
            max-width: none !important;
            margin: 20px !important;
          }
        }

        /* Touch-friendly buttons on tablets */
        @media (max-width: 1023px) {
          button, a.button {
            min-height: 44px !important;
            min-width: 44px !important;
          }
        }

        /* Responsive sidebar */
        @media (max-width: 639px) {
          .sidebar {
            position: fixed !important;
            z-index: 1100 !important;
            width: 80vw !important;
            max-width: 300px !important;
          }
          
          .sidebar-overlay {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.5) !important;
            z-index: 1099 !important;
          }
        }
      `}</style>
    </main>
  );
}
