'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2 } from 'lucide-react';

export default function SignOutPage() {
  const { signOut } = useAuth();

  useEffect(() => {
    // Automatically sign out when this page loads
    signOut();
  }, [signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Signing out...</p>
      </div>
    </div>
  );
}