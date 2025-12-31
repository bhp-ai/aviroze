'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { authService, User } from '@/lib/services/auth';

export default function DeletionBanner() {
  const [user, setUser] = useState<User | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkUser = () => {
      const userData = authService.getUser();
      setUser(userData);
    };

    checkUser();

    // Listen for login events
    window.addEventListener('userLogin', checkUser);

    return () => {
      window.removeEventListener('userLogin', checkUser);
    };
  }, []);

  // Don't show banner if dismissed, no user, or not self-deleted
  if (
    isDismissed ||
    !user ||
    !user.deleted_at ||
    user.deletion_type !== 'self'
  ) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                Your account is marked for deletion
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                You can still use all features normally. Contact support to restore your account.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-yellow-100 rounded transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-yellow-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
