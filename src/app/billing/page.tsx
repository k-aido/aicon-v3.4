'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { 
  CreditCard, 
  Check, 
  Loader2, 
  ChevronRight,
  Zap,
  TrendingUp,
  Users,
  Building,
  ArrowLeft
} from 'lucide-react';
import { PLANS } from '@/lib/stripe/plans';
import { BillingUsage, BillingSubscription } from '@/types/billing';
import { useToast } from '@/components/Modal/ToastContainer';
import ConfirmationModal from '@/components/Modal/ConfirmationModal';
import PlanChangeModal from '@/components/Modal/PlanChangeModal';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function BillingPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError, showWarning } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadBillingData();
    }
  }, [user]);

  // Handle return from Stripe (success or cancel)
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true' || canceled === 'true') {
      // Clean up URL
      router.replace('/billing');
      
      // Refresh data after a short delay to allow webhook processing
      if (success === 'true') {
        setRefreshing(true);
        // Give webhooks time to process
        setTimeout(() => {
          loadBillingData().then(() => {
            setRefreshing(false);
          });
        }, 2000);
      }
    }
  }, [searchParams, router]);

  const loadBillingData = async () => {
    try {
      const response = await fetch('/api/billing/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data.usage);
        setSubscription(data.subscription);
        setAccount(data.account);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, priceId: string) => {
    setSubscribing(planId);
    try {
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, priceId }),
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        window.location.href = checkoutUrl;
      } else {
        console.error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setSubscribing(null);
    }
  };

  const handleChangePlan = async (planId: string) => {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;

    setSelectedPlan(plan);
    setShowPlanChangeModal(true);
  };

  const confirmPlanChange = async () => {
    if (!selectedPlan) return;
    
    setIsProcessing(true);

    try {
      console.log('Changing to plan:', selectedPlan.id, 'with price ID:', selectedPlan.priceId);
      
      const response = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPriceId: selectedPlan.priceId }),
      });

      const responseData = await response.json();
      console.log('API response:', responseData);

      if (response.ok) {
        setShowPlanChangeModal(false);
        showSuccess('Plan Changed!', `Successfully switched to ${selectedPlan.name} plan.`);
        
        // Poll for updates until the plan change is reflected
        const pollForUpdate = async (attempts = 0) => {
          if (attempts >= 10) {
            console.log('Max polling attempts reached, stopping');
            return;
          }
          
          await loadBillingData();
          
          // Check if the plan has updated
          const expectedCredits = selectedPlan.credits;
          const currentData = await fetch('/api/billing/usage').then(r => r.json());
          
          if (currentData.account?.monthly_credit_allocation === expectedCredits) {
            console.log('Plan update detected!');
            return;
          }
          
          // Try again in 1 second
          setTimeout(() => pollForUpdate(attempts + 1), 1000);
        };
        
        // Start polling after a short delay
        setTimeout(() => pollForUpdate(), 1500);
      } else {
        showError('Plan Change Failed', responseData.error || 'Failed to change plan');
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      showError('Plan Change Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const handleCancelSubscription = () => {
    setShowCancelModal(true);
  };

  const confirmCancelSubscription = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelImmediately: false }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setShowCancelModal(false);
        showWarning('Subscription Canceled', 'Your subscription will end at the current billing period.');
        await loadBillingData(); // Refresh to show cancellation status
      } else {
        showError('Cancellation Failed', responseData.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      showError('Cancellation Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/billing/manage-subscription', {
        method: 'POST',
      });

      if (response.ok) {
        const { portalUrl } = await response.json();
        window.location.href = portalUrl;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'basic':
        return <Zap className="h-6 w-6" />;
      case 'pro':
        return <TrendingUp className="h-6 w-6" />;
      case 'agency':
        return <Users className="h-6 w-6" />;
      case 'enterprise':
        return <Building className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const totalCredits = (account?.promotional_credits || 0) + (account?.monthly_credits_remaining || 0);
  const currentPlanId = subscription?.plan_id;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Refreshing notification */}
        {refreshing && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
            <Loader2 className="h-5 w-5 animate-spin mr-3 text-blue-600" />
            <p className="text-blue-800">Updating subscription information...</p>
          </div>
        )}
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="mt-2 text-gray-600">Manage your subscription and track credit usage</p>
        </div>

        {/* Current Usage Card */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Credit Usage</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total Available</p>
              <p className="text-3xl font-bold text-gray-900">{totalCredits}</p>
              <p className="text-xs text-gray-500 mt-1">credits remaining</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Promotional Credits</p>
              <p className="text-2xl font-semibold text-green-600">
                {account?.promotional_credits || 0}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Monthly Credits</p>
              <p className="text-2xl font-semibold text-blue-600">
                {account?.monthly_credits_remaining || 0} / {account?.monthly_credit_allocation || 0}
              </p>
            </div>
          </div>

          {/* Usage Progress Bar */}
          {account?.monthly_credit_allocation > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Monthly Usage</span>
                <span>
                  {account.monthly_credit_allocation - account.monthly_credits_remaining} / {account.monthly_credit_allocation} used
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(100, ((account.monthly_credit_allocation - account.monthly_credits_remaining) / account.monthly_credit_allocation) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Current Subscription */}
          {subscription && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Current Plan</p>
                  <p className="text-lg font-semibold">
                    {PLANS.find(p => p.priceId === subscription.stripe_price_id)?.name || 'Custom Plan'}
                  </p>
                  {subscription.cancel_at_period_end && (
                    <p className="text-sm text-orange-600 mt-1">
                      Cancels at end of billing period
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleManageSubscription}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Manage Subscription
                  </button>
                  {!subscription.cancel_at_period_end && (
                    <button
                      onClick={handleCancelSubscription}
                      className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const isCurrentPlan = currentPlanId === plan.id || subscription?.stripe_price_id === plan.priceId;
              const isEnterprise = plan.id === 'enterprise';
              
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-lg shadow-md p-6 relative ${
                    plan.highlighted ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-blue-600">{getPlanIcon(plan.name)}</div>
                    {isCurrentPlan && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Current
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                  <div className="mb-6">
                    {isEnterprise ? (
                      <p className="text-3xl font-bold">Custom</p>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">${plan.price}</span>
                        <span className="text-gray-600">/month</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isEnterprise ? (
                    <a
                      href="mailto:sales@aicon.ai"
                      className="w-full block text-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Contact Sales
                    </a>
                  ) : isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-md text-sm font-medium cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (subscription) {
                          // Existing subscriber: change plan via API
                          handleChangePlan(plan.id);
                        } else {
                          // New subscriber: use checkout
                          handleSubscribe(plan.id, plan.priceId);
                        }
                      }}
                      disabled={subscribing === plan.id || isProcessing}
                      className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        plan.highlighted
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {subscribing === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : subscription ? (
                        'Switch Plan'
                      ) : (
                        'Subscribe'
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Credit Usage Rates */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Credit Usage Rates</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Content Scraping</span>
              <span className="font-medium">50 credits per scrape</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">AI Chat Message</span>
              <span className="font-medium">100 credits per message</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Voice Generation</span>
              <span className="font-medium text-gray-400">Coming soon</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Avatar Generation</span>
              <span className="font-medium text-gray-400">Coming soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Change Modal */}
      {selectedPlan && (
        <PlanChangeModal
          isOpen={showPlanChangeModal}
          onClose={() => {
            setShowPlanChangeModal(false);
            setSelectedPlan(null);
          }}
          onConfirm={confirmPlanChange}
          currentPlan={subscription ? PLANS.find(p => p.priceId === subscription.stripe_price_id) || null : null}
          newPlan={selectedPlan}
          isLoading={isProcessing}
        />
      )}

      {/* Cancel Subscription Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelSubscription}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? Your subscription will remain active until the end of your current billing period, and you'll keep access to all features until then."
        confirmText="Cancel Subscription"
        cancelText="Keep Subscription"
        type="warning"
        isLoading={isProcessing}
      />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  );
}