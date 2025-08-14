export interface BillingPlan {
  id: string;
  name: string;
  stripe_price_id: string;
  monthly_credits: number;
  price_cents: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingCustomer {
  id: string;
  account_id: string;
  stripe_customer_id: string;
  email: string;
  payment_method_id?: string;
  default_payment_method?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingSubscription {
  id: string;
  billing_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingUsage {
  id: string;
  account_id: string;
  billing_period_start: string;
  billing_period_end: string;
  promotional_credits_used: number;
  monthly_credits_used: number;
  total_credits_used: number;
  usage_details: {
    content_analysis?: number;
    script_generation?: number;
    voice_generation?: number;
    avatar_generation?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface CreditUsageRate {
  content_analysis: number;
  script_generation: number;
  voice_generation_per_minute: number;
  avatar_generation_per_minute: number;
  chat_completion: number;
}

export const CREDIT_USAGE_RATES: CreditUsageRate = {
  content_analysis: 1,
  script_generation: 5,
  voice_generation_per_minute: 10,
  avatar_generation_per_minute: 20,
  chat_completion: 100, // Each chat completion costs 100 credits
};

export const PLAN_LIMITS = {
  basic: {
    monthly_credits: 1000,
    price_cents: 2900,
  },
  pro: {
    monthly_credits: 3000,
    price_cents: 7900,
  },
  agency: {
    monthly_credits: 5000,
    price_cents: 14900,
  },
  enterprise: {
    monthly_credits: -1, // Unlimited
    price_cents: 0, // Custom pricing
  },
};