'use client';

import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

const supabase = createBrowserClient();

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    setEmail(emailParam || storedEmail || null);

    // Check if user is already verified
    const checkVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        // Redirect to onboarding after 2 seconds
        setTimeout(() => {
          router.push('/onboarding');
        }, 2000);
      }
    };

    checkVerification();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        setIsVerified(true);
        // Clear pending verification email from localStorage
        localStorage.removeItem('pendingVerificationEmail');
        setTimeout(() => {
          router.push('/onboarding');
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (!error) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      } else {
        console.error('Error resending email:', error);
      }
    } catch (error) {
      console.error('Error resending email:', error);
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
          <p className="text-gray-600 mb-4">Redirecting you to complete your profile...</p>
          <div className="flex items-center justify-center text-blue-600">
            <span className="mr-2">Taking you to onboarding</span>
            <ArrowRight className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="bg-blue-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          
          <p className="text-gray-600 mb-6">
            We've sent a verification link to:
          </p>
          
          {email && (
            <div className="bg-gray-100 rounded-lg p-3 mb-6">
              <p className="font-medium text-gray-900">{email}</p>
            </div>
          )}
          
          <p className="text-sm text-gray-600 mb-8">
            Please check your email and click the verification link to continue. 
            This helps us ensure the security of your account.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleResendEmail}
              disabled={isResending || resendSuccess}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Email Sent!
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  Resend Verification Email
                </>
              )}
            </button>

            <button
              onClick={() => router.push('/login')}
              className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Back to Login
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}