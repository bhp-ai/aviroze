import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { authService } from '@/lib/services/auth';

/**
 * Hook to track page visits and send them to the logging system
 * Automatically logs every page the user visits
 */
export function usePageTracking() {
  const pathname = usePathname();

  useEffect(() => {
    const logPageVisit = async () => {
      try {
        // Get current user
        const user = authService.getUser();

        // Determine activity type based on path
        let activityType = 'page_view';

        if (pathname.includes('/admin')) {
          activityType = 'admin_action';
        } else if (pathname.includes('/products/') && pathname.split('/').length > 2) {
          activityType = 'product_view';
        } else if (pathname.includes('/cart')) {
          activityType = 'cart_view';
        } else if (pathname.includes('/orders')) {
          activityType = 'order_view';
        }

        // Log the page visit
        const logData = {
          activity_type: activityType, // lowercase
          user_id: user?.id || null,
          description: `Visited ${pathname}`,
          details: {
            url: window.location.href,
            path: pathname,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
          }
        };

        console.log('Logging page visit:', logData);
        await apiClient.post('/api/logs/activities', logData);
      } catch (error) {
        // Silently fail - don't disrupt user experience if logging fails
        console.debug('Failed to log page visit:', error);
      }
    };

    // Log after a small delay to ensure the page is loaded
    const timeoutId = setTimeout(logPageVisit, 500);

    return () => clearTimeout(timeoutId);
  }, [pathname]);
}
