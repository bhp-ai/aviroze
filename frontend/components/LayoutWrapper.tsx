'use client';

import { usePathname } from 'next/navigation';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartProvider } from '@/contexts/CartContext';
import { ToastProvider } from '@/contexts/ToastContext';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide navbar and footer for admin and login pages
  const isAdminRoute = pathname?.startsWith('/admin');
  const isLoginRoute = pathname === '/login';
  const isSignupRoute = pathname === '/signup';
  const hideNavAndFooter = isAdminRoute || isLoginRoute || isSignupRoute;

  return (
    <ToastProvider>
      <CartProvider>
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
      </CartProvider>
    </ToastProvider>
  );
}
