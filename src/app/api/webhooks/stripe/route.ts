import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to get subscription period from items
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  // If there are no items, return null values
  if (!subscription.items || !subscription.items.data || subscription.items.data.length === 0) {
    return { current_period_start: null, current_period_end: null };
  }
  
  // Get the latest start and earliest end from all items
  let latestStart = 0;
  let earliestEnd = Infinity;
  
  for (const item of subscription.items.data) {
    if (item.current_period_start && item.current_period_start > latestStart) {
      latestStart = item.current_period_start;
    }
    if (item.current_period_end && item.current_period_end < earliestEnd) {
      earliestEnd = item.current_period_end;
    }
  }
  
  return {
    current_period_start: latestStart > 0 ? latestStart : null,
    current_period_end: earliestEnd < Infinity ? earliestEnd : null
  };
}

// Disable body parsing for webhook to get raw body
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No stripe signature found');
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Process different event types
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the account associated with this customer
        const { data: customer } = await supabase
          .from('billing_customers')
          .select('id, account_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (!customer) {
          console.error('Customer not found for subscription:', subscription.id);
          break;
        }

        // Check if this customer already has an active subscription (upgrade scenario)
        const { data: existingSubscriptions } = await supabase
          .from('billing_subscriptions')
          .select('id, stripe_subscription_id')
          .eq('billing_customer_id', customer.id)
          .eq('status', 'active');

        // If there are existing active subscriptions, mark them as canceled
        if (existingSubscriptions && existingSubscriptions.length > 0) {
          console.log('Found existing active subscriptions, marking as canceled for upgrade');
          await supabase
            .from('billing_subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('billing_customer_id', customer.id)
            .eq('status', 'active');
        }

        // Get the plan details
        const priceId = subscription.items.data[0]?.price.id;
        const { data: plan } = await supabase
          .from('billing_plans')
          .select('id, monthly_credits')
          .eq('stripe_price_id', priceId)
          .single();

        // Get subscription period from items
        const { current_period_start, current_period_end } = getSubscriptionPeriod(subscription);

        // Create subscription record
        const { error: subError } = await supabase
          .from('billing_subscriptions')
          .insert({
            billing_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            plan_id: plan?.id,
            status: subscription.status,
            current_period_start: current_period_start ? new Date(current_period_start * 1000).toISOString() : null,
            current_period_end: current_period_end ? new Date(current_period_end * 1000).toISOString() : null,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          });

        if (subError) {
          console.error('Error creating subscription record:', subError);
          break;
        }

        // Update account with subscription and credits
        if (plan) {
          // Get the subscription record we just created
          const { data: newSubRecord } = await supabase
            .from('billing_subscriptions')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          const { error: accountError } = await supabase
            .from('accounts')
            .update({
              subscription_id: newSubRecord?.id,
              stripe_subscription_id: subscription.id,
              monthly_credit_allocation: plan.monthly_credits,
              monthly_credits_remaining: plan.monthly_credits,
              credits_reset_date: new Date().toISOString().split('T')[0],
            })
            .eq('id', customer.account_id);

          if (accountError) {
            console.error('Error updating account:', accountError);
          }
        }

        console.log('Subscription created successfully:', subscription.id);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get the subscription record
        const { data: existingSub } = await supabase
          .from('billing_subscriptions')
          .select('id, stripe_price_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!existingSub) {
          console.error('Subscription not found:', subscription.id);
          break;
        }

        const newPriceId = subscription.items.data[0]?.price.id;
        
        // Check if plan changed
        if (newPriceId !== existingSub.stripe_price_id) {
          // Get new plan details
          const { data: newPlan } = await supabase
            .from('billing_plans')
            .select('id, monthly_credits')
            .eq('stripe_price_id', newPriceId)
            .single();

          // Get subscription period from items
          const { current_period_start, current_period_end } = getSubscriptionPeriod(subscription);

          // Update subscription record
          const { error: updateError } = await supabase
            .from('billing_subscriptions')
            .update({
              stripe_price_id: newPriceId,
              plan_id: newPlan?.id,
              status: subscription.status,
              current_period_start: current_period_start ? new Date(current_period_start * 1000).toISOString() : null,
              current_period_end: current_period_end ? new Date(current_period_end * 1000).toISOString() : null,
              cancel_at_period_end: subscription.cancel_at_period_end || false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSub.id);

          if (updateError) {
            console.error('Error updating subscription:', updateError);
            break;
          }

          // Update account credits if plan changed
          if (newPlan) {
            // Get customer account
            const { data: customer } = await supabase
              .from('billing_customers')
              .select('account_id')
              .eq('stripe_customer_id', subscription.customer as string)
              .single();

            if (customer) {
              const { error: accountError } = await supabase
                .from('accounts')
                .update({
                  subscription_id: existingSub.id,
                  stripe_subscription_id: subscription.id,
                  monthly_credit_allocation: newPlan.monthly_credits,
                  monthly_credits_remaining: newPlan.monthly_credits, // Reset credits on plan change
                  credits_reset_date: new Date().toISOString().split('T')[0],
                })
                .eq('id', customer.account_id);

              if (accountError) {
                console.error('Error updating account credits:', accountError);
              }
            }
          }
        } else {
          // Just update status and dates
          const { current_period_start, current_period_end } = getSubscriptionPeriod(subscription);
          
          await supabase
            .from('billing_subscriptions')
            .update({
              status: subscription.status,
              current_period_start: current_period_start ? new Date(current_period_start * 1000).toISOString() : null,
              current_period_end: current_period_end ? new Date(current_period_end * 1000).toISOString() : null,
              cancel_at_period_end: subscription.cancel_at_period_end || false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSub.id);
        }

        console.log('Subscription updated successfully:', subscription.id);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update subscription record
        const { error: subError } = await supabase
          .from('billing_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (subError) {
          console.error('Error updating canceled subscription:', subError);
          break;
        }

        // Get customer account
        const { data: customer } = await supabase
          .from('billing_customers')
          .select('account_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (customer) {
          // Reset account subscription and credits
          const { error: accountError } = await supabase
            .from('accounts')
            .update({
              stripe_subscription_id: null,
              monthly_credit_allocation: 0,
              monthly_credits_remaining: 0,
            })
            .eq('id', customer.account_id);

          if (accountError) {
            console.error('Error resetting account subscription:', accountError);
          }
        }

        console.log('Subscription canceled successfully:', subscription.id);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Only process subscription invoices (not one-time payments)
        const subscriptionId = invoice.parent?.subscription_details?.subscription
          ? typeof invoice.parent.subscription_details.subscription === 'string'
            ? invoice.parent.subscription_details.subscription
            : invoice.parent.subscription_details.subscription.id
          : null;
        
        if (!subscriptionId) {
          break;
        }

        // Get customer account
        const { data: customer } = await supabase
          .from('billing_customers')
          .select('id, account_id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (!customer) {
          console.error('Customer not found for invoice:', invoice.id);
          break;
        }

        // Store invoice record
        const { error: invoiceError } = await supabase
          .from('billing_invoices')
          .insert({
            billing_customer_id: customer.id,
            stripe_invoice_id: invoice.id,
            invoice_number: invoice.number,
            amount_paid: invoice.amount_paid,
            amount_due: invoice.amount_due,
            currency: invoice.currency,
            status: invoice.status,
            invoice_pdf_url: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
            period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          });

        if (invoiceError) {
          console.error('Error storing invoice:', invoiceError);
        }

        // Reset monthly credits on successful payment
        const { data: account } = await supabase
          .from('accounts')
          .select('monthly_credit_allocation')
          .eq('id', customer.account_id)
          .single();

        if (account) {
          const { error: resetError } = await supabase
            .from('accounts')
            .update({
              monthly_credits_remaining: account.monthly_credit_allocation,
              credits_reset_date: new Date().toISOString().split('T')[0],
            })
            .eq('id', customer.account_id);

          if (resetError) {
            console.error('Error resetting monthly credits:', resetError);
          } else {
            console.log('Monthly credits reset for account:', customer.account_id);
          }
        }

        console.log('Invoice payment processed successfully:', invoice.id);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Only process subscription invoices
        const subscriptionId = invoice.parent?.subscription_details?.subscription
          ? typeof invoice.parent.subscription_details.subscription === 'string'
            ? invoice.parent.subscription_details.subscription
            : invoice.parent.subscription_details.subscription.id
          : null;
        
        if (!subscriptionId) {
          break;
        }

        // Get customer account
        const { data: customer } = await supabase
          .from('billing_customers')
          .select('id, account_id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (!customer) {
          console.error('Customer not found for failed invoice:', invoice.id);
          break;
        }

        // Store failed invoice record
        const { error: invoiceError } = await supabase
          .from('billing_invoices')
          .insert({
            billing_customer_id: customer.id,
            stripe_invoice_id: invoice.id,
            invoice_number: invoice.number,
            amount_paid: 0,
            amount_due: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            invoice_pdf_url: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
            period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          });

        if (invoiceError) {
          console.error('Error storing failed invoice:', invoiceError);
        }

        // Update subscription status to past_due
        const { error: subError } = await supabase
          .from('billing_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (subError) {
          console.error('Error updating subscription status:', subError);
        }

        // TODO: Send email notification to customer about failed payment

        console.log('Failed payment processed for invoice:', invoice.id);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}