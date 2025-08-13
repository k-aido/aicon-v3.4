export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string;
  credits: number;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for individual creators getting started',
    price: 29,
    priceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic_placeholder',
    credits: 1000,
    features: [
      '1,000 credits per month',
      'AI content analysis',
      'Script generation',
      'Basic support',
      'All core features',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For professional creators and small teams',
    price: 79,
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
    credits: 3000,
    features: [
      '3,000 credits per month',
      'Everything in Basic',
      'Priority support',
      'Advanced analytics',
      'Team collaboration (up to 3 users)',
      'Custom brand presets',
    ],
    highlighted: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For agencies and larger teams',
    price: 149,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID || 'price_agency_placeholder',
    credits: 5000,
    features: [
      '5,000 credits per month',
      'Everything in Pro',
      'Dedicated account manager',
      'Custom integrations',
      'White-label options',
      'Unlimited team members',
      'API access',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    price: 0,
    priceId: 'price_enterprise_placeholder',
    credits: -1,
    features: [
      'Custom credit allocation',
      'Everything in Agency',
      '24/7 phone support',
      'SLA guarantee',
      'Custom features development',
      'On-premise deployment option',
      'Dedicated infrastructure',
    ],
  },
];

export function getPlanByPriceId(priceId: string): PlanConfig | undefined {
  return PLANS.find(plan => plan.priceId === priceId);
}

export function getPlanById(planId: string): PlanConfig | undefined {
  return PLANS.find(plan => plan.id === planId);
}