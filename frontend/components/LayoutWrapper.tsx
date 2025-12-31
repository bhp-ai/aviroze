'use client';

import { usePathname } from 'next/navigation';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartProvider } from '@/contexts/CartContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ProductMediaProvider } from '@/contexts/ProductMediaContext';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Track all page visits (except admin, which has its own tracking in admin layout)
  const isAdminRoute = pathname?.startsWith('/admin');

  // Only track non-admin pages here
  usePageTracking();

  // Hide navbar and footer for admin and login pages
  const isLoginRoute = pathname === '/login';
  const isSignupRoute = pathname === '/signup';
  const hideNavAndFooter = isAdminRoute || isLoginRoute || isSignupRoute;

  return (
    <ToastProvider>
      <CartProvider>
        <ProductMediaProvider>
          {!hideNavAndFooter && (
            <>
              <AnnouncementBanner />
              <Navbar />
            </>
          )}
          <main className={hideNavAndFooter ? '' : 'min-h-screen'}>
            {children}
          </main>
          {!hideNavAndFooter && <Footer />}
        </ProductMediaProvider>
      </CartProvider>
    </ToastProvider>
  );
}
