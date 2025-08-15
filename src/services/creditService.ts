/**
 * Credit Management Service
 * 
 * Handles credit balance checking, usage tracking, and enforcement
 * for all AI-powered operations in the application.
 */

import { createBrowserClient } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

// Credit costs for different operations
export const CREDIT_COSTS = {
  CONTENT_SCRAPING: 50,      // Scraping and analyzing social media content (combined)
  CONTENT_ANALYSIS: 0,       // Analysis is included in scraping cost
  CHAT_MESSAGE: 100,         // Each AI chat message (updated to match billing requirements)
  SCRIPT_GENERATION: 50,     // Generating video scripts
  VOICE_GENERATION: 100,     // Text-to-speech generation
  AVATAR_GENERATION: 200,    // Avatar video generation
  CANVAS_SAVE: 0,           // Free operation
  CANVAS_CREATE: 0,         // Free operation
} as const;

export type OperationType = keyof typeof CREDIT_COSTS;

export interface CreditBalance {
  accountId: string;
  monthlyAllocation: number;
  bonusCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  canPerformOperation: (operation: OperationType) => boolean;
}

export interface CreditUsageLog {
  accountId: string;
  userId: string;
  operation: OperationType;
  creditsUsed: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

class CreditService {
  private supabase;
  
  constructor(isServerSide: boolean = false) {
    if (isServerSide) {
      // Server-side: Use service role key
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } else {
      // Client-side: Use browser client
      this.supabase = createBrowserClient();
    }
  }

  /**
   * Get current credit balance for an account
   */
  async getCreditBalance(accountId: string): Promise<CreditBalance | null> {
    try {
      console.log('[CreditService] Fetching credit balance for account:', accountId);
      
      const { data, error } = await this.supabase
        .from('account_credit_balance')
        .select('*')
        .eq('account_id', accountId)
        .single();

      if (error) {
        console.error('[CreditService] Error fetching credit balance:', error);
        return null;
      }

      const balance: CreditBalance = {
        accountId: data.account_id,
        monthlyAllocation: data.monthly_credit_allocation || 0,
        bonusCredits: data.bonus_credits || 0,
        creditsUsed: data.credits_used_this_month || 0,
        creditsRemaining: data.credits_remaining || 0,
        canPerformOperation: (operation: OperationType) => {
          const cost = CREDIT_COSTS[operation];
          return data.credits_remaining >= cost;
        }
      };

      console.log('[CreditService] Credit balance:', {
        accountId: balance.accountId,
        remaining: balance.creditsRemaining,
        used: balance.creditsUsed
      });

      return balance;
    } catch (error) {
      console.error('[CreditService] Unexpected error getting credit balance:', error);
      return null;
    }
  }

  /**
   * Check if an account has sufficient credits for an operation
   */
  async canPerformOperation(accountId: string, operation: OperationType): Promise<boolean> {
    const balance = await this.getCreditBalance(accountId);
    if (!balance) {
      console.warn('[CreditService] Could not fetch balance, denying operation');
      return false;
    }
    
    const cost = CREDIT_COSTS[operation];
    const canPerform = balance.creditsRemaining >= cost;
    
    console.log('[CreditService] Credit check:', {
      operation,
      cost,
      remaining: balance.creditsRemaining,
      canPerform
    });
    
    return canPerform;
  }

  /**
   * Deduct credits for an operation
   */
  async deductCredits(
    accountId: string, 
    userId: string,
    operation: OperationType,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const cost = CREDIT_COSTS[operation];
      
      // First check if account has sufficient credits
      const canPerform = await this.canPerformOperation(accountId, operation);
      if (!canPerform) {
        console.error('[CreditService] Insufficient credits for operation:', operation);
        return false;
      }

      // Get current date for stat tracking
      const today = new Date().toISOString().split('T')[0];

      // Update or insert usage stats for today
      const { data: existingStats } = await this.supabase
        .from('account_usage_stats')
        .select('*')
        .eq('account_id', accountId)
        .eq('stat_date', today)
        .single();

      if (existingStats) {
        // Update existing stats
        const { error: updateError } = await this.supabase
          .from('account_usage_stats')
          .update({
            total_credits_used: (existingStats.total_credits_used || 0) + cost,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStats.id);

        if (updateError) {
          console.error('[CreditService] Error updating usage stats:', updateError);
          return false;
        }
      } else {
        // Create new stats for today
        const { error: insertError } = await this.supabase
          .from('account_usage_stats')
          .insert({
            account_id: accountId,
            stat_date: today,
            total_credits_used: cost,
            projects_created: operation === 'CANVAS_CREATE' ? 1 : 0,
            content_pieces_added: operation === 'CONTENT_ANALYSIS' ? 1 : 0,
            scripts_generated: operation === 'SCRIPT_GENERATION' ? 1 : 0,
            voice_generations: operation === 'VOICE_GENERATION' ? 1 : 0,
            avatar_generations: operation === 'AVATAR_GENERATION' ? 1 : 0,
            storage_used_gb: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[CreditService] Error creating usage stats:', insertError);
          return false;
        }
      }

      // Log the API usage
      const { error: logError } = await this.supabase
        .from('api_usage_logs')
        .insert({
          account_id: accountId,
          user_id: userId,
          service_name: 'AICON',
          endpoint: `/api/${operation.toLowerCase()}`,
          request_type: operation,
          tokens_used: 0, // Can be updated with actual token count if available
          credits_cost: cost,
          response_time_ms: 0, // Can be updated with actual response time
          status_code: 200,
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.error('[CreditService] Error logging API usage:', logError);
        // Don't fail the operation if logging fails
      }

      console.log('[CreditService] Credits deducted successfully:', {
        accountId,
        operation,
        cost
      });

      return true;
    } catch (error) {
      console.error('[CreditService] Unexpected error deducting credits:', error);
      return false;
    }
  }

  /**
   * Add bonus credits to an account
   */
  async addBonusCredits(accountId: string, credits: number): Promise<boolean> {
    try {
      // First get current bonus credits
      const { data: account, error: fetchError } = await this.supabase
        .from('accounts')
        .select('bonus_credits')
        .eq('id', accountId)
        .single();
      
      if (fetchError || !account) {
        console.error('[CreditService] Error fetching account for bonus credits:', fetchError);
        return false;
      }
      
      // Update with new total
      const { error } = await this.supabase
        .from('accounts')
        .update({
          bonus_credits: (account.bonus_credits || 0) + credits,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) {
        console.error('[CreditService] Error adding bonus credits:', error);
        return false;
      }

      console.log('[CreditService] Bonus credits added:', {
        accountId,
        credits
      });

      return true;
    } catch (error) {
      console.error('[CreditService] Unexpected error adding bonus credits:', error);
      return false;
    }
  }

  /**
   * Get usage history for an account
   */
  async getUsageHistory(accountId: string, days: number = 30): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('account_usage_stats')
        .select('*')
        .eq('account_id', accountId)
        .gte('stat_date', startDate.toISOString().split('T')[0])
        .order('stat_date', { ascending: false });

      if (error) {
        console.error('[CreditService] Error fetching usage history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[CreditService] Unexpected error getting usage history:', error);
      return [];
    }
  }
}

// Export singleton instances for client and server
export const clientCreditService = new CreditService(false);
export const serverCreditService = () => new CreditService(true);

// Export the class for custom instantiation if needed
export default CreditService;