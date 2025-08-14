/**
 * Chat Usage Service
 * 
 * Provides functions to query and analyze chat completion usage
 * for billing and usage tracking purposes.
 */

import { createBrowserClient } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

interface ChatUsageStats {
  totalCompletions: number;
  totalCreditsUsed: number;
  totalTokensUsed: number;
  periodStart: Date;
  periodEnd: Date;
  dailyBreakdown?: Array<{
    date: string;
    completions: number;
    creditsUsed: number;
    tokensUsed: number;
  }>;
}

class ChatUsageService {
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
   * Get chat completions count for the last N days
   * This is the primary method for checking how many chat completions
   * have been done in the last 30 days at any point
   */
  async getChatCompletionsLastNDays(accountId: string, days: number = 30): Promise<number> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      console.log('[ChatUsageService] Fetching chat completions for last', days, 'days');
      
      // Query message_usage_records for chat completions in the time period
      const { data, error } = await this.supabase
        .from('message_usage_records')
        .select('id')
        .eq('account_id', accountId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) {
        console.error('[ChatUsageService] Error fetching chat completions:', error);
        return 0;
      }
      
      const count = data?.length || 0;
      console.log('[ChatUsageService] Found', count, 'chat completions in last', days, 'days');
      
      return count;
    } catch (error) {
      console.error('[ChatUsageService] Unexpected error:', error);
      return 0;
    }
  }

  /**
   * Get detailed chat usage statistics for a time period
   */
  async getChatUsageStats(accountId: string, days: number = 30): Promise<ChatUsageStats | null> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get all message usage records for the period
      const { data: messages, error } = await this.supabase
        .from('message_usage_records')
        .select('*')
        .eq('account_id', accountId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[ChatUsageService] Error fetching usage stats:', error);
        return null;
      }
      
      if (!messages || messages.length === 0) {
        return {
          totalCompletions: 0,
          totalCreditsUsed: 0,
          totalTokensUsed: 0,
          periodStart: startDate,
          periodEnd: endDate,
          dailyBreakdown: []
        };
      }
      
      // Calculate totals
      const totalCompletions = messages.length;
      const totalCreditsUsed = totalCompletions * 100; // 100 credits per completion
      const totalTokensUsed = messages.reduce((sum, msg) => sum + (msg.total_tokens || 0), 0);
      
      // Create daily breakdown
      const dailyMap = new Map<string, { completions: number; tokens: number }>();
      
      messages.forEach(msg => {
        const date = new Date(msg.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { completions: 0, tokens: 0 };
        existing.completions += 1;
        existing.tokens += msg.total_tokens || 0;
        dailyMap.set(date, existing);
      });
      
      const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, stats]) => ({
        date,
        completions: stats.completions,
        creditsUsed: stats.completions * 100,
        tokensUsed: stats.tokens
      })).sort((a, b) => b.date.localeCompare(a.date));
      
      return {
        totalCompletions,
        totalCreditsUsed,
        totalTokensUsed,
        periodStart: startDate,
        periodEnd: endDate,
        dailyBreakdown
      };
    } catch (error) {
      console.error('[ChatUsageService] Unexpected error getting usage stats:', error);
      return null;
    }
  }

  /**
   * Get current month's chat usage from billing_usage table
   */
  async getCurrentMonthUsage(accountId: string): Promise<number> {
    try {
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const { data, error } = await this.supabase
        .from('billing_usage')
        .select('usage_details')
        .eq('account_id', accountId)
        .eq('billing_period_start', startOfMonth.toISOString().split('T')[0])
        .single();
      
      if (error) {
        console.error('[ChatUsageService] Error fetching monthly usage:', error);
        return 0;
      }
      
      return data?.usage_details?.chat_completions || 0;
    } catch (error) {
      console.error('[ChatUsageService] Unexpected error getting monthly usage:', error);
      return 0;
    }
  }

  /**
   * Check if an account can perform a chat completion
   * based on their remaining credits
   */
  async canPerformChatCompletion(accountId: string): Promise<boolean> {
    try {
      const { data: balance, error } = await this.supabase
        .from('account_credit_balance')
        .select('credits_remaining')
        .eq('account_id', accountId)
        .single();
      
      if (error) {
        console.error('[ChatUsageService] Error checking credit balance:', error);
        return false;
      }
      
      // Chat completion costs 100 credits
      return (balance?.credits_remaining || 0) >= 100;
    } catch (error) {
      console.error('[ChatUsageService] Unexpected error checking credits:', error);
      return false;
    }
  }
}

// Export singleton instances for client and server
export const clientChatUsageService = new ChatUsageService(false);
export const serverChatUsageService = () => new ChatUsageService(true);

// Export the class for custom instantiation if needed
export default ChatUsageService;