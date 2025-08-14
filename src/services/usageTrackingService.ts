import { supabase } from '@/lib/supabase';
import { 
  MessageUsageRecord, 
  ApiUsageLog, 
  TokenUsage,
  calculateTokenCost,
  getCurrentBillingPeriod 
} from '@/types/database';

export class UsageTrackingService {
  /**
   * Track message usage for billing purposes
   */
  static async trackMessageUsage(params: {
    messageId: string;
    accountId: string;
    projectId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const totalTokens = params.promptTokens + params.completionTokens;
      const costUsd = calculateTokenCost(params.model, params.promptTokens, params.completionTokens);
      const billingPeriod = getCurrentBillingPeriod();

      // Call API endpoint to bypass RLS with service role
      const response = await fetch('/api/usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: params.messageId,
          account_id: params.accountId,
          project_id: params.projectId,
          model: params.model,
          prompt_tokens: params.promptTokens,
          completion_tokens: params.completionTokens,
          total_tokens: totalTokens,
          cost_usd: costUsd,
          billing_period: billingPeriod
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to track usage');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to track message usage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Log detailed API usage for analytics
   */
  static async logApiUsage(params: {
    accountId?: string;
    userId?: string;
    serviceName: string;
    endpoint?: string;
    projectId?: string;
    chatInterfaceId?: string;
    threadId?: string;
    messageId?: string;
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    responseTimeMs?: number;
    statusCode?: number;
    errorMessage?: string;
    metadata?: any;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('api_usage_logs')
        .insert({
          account_id: params.accountId,
          user_id: params.userId,
          service_name: params.serviceName,
          endpoint: params.endpoint,
          project_id: params.projectId,
          chat_interface_id: params.chatInterfaceId,
          thread_id: params.threadId,
          message_id: params.messageId,
          model: params.model,
          prompt_tokens: params.promptTokens,
          completion_tokens: params.completionTokens,
          tokens_used: params.promptTokens && params.completionTokens 
            ? params.promptTokens + params.completionTokens 
            : null,
          response_time_ms: params.responseTimeMs,
          status_code: params.statusCode,
          error_message: params.errorMessage,
          metadata: params.metadata
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Failed to log API usage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get usage for a specific billing period
   */
  static async getUsageForPeriod(
    accountId: string, 
    billingPeriod: string
  ): Promise<{ 
    success: boolean; 
    data?: {
      totalTokens: number;
      totalCost: number;
      messageCount: number;
      byModel: Record<string, { tokens: number; cost: number; count: number }>;
    };
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('message_usage_records')
        .select('*')
        .eq('account_id', accountId)
        .eq('billing_period', billingPeriod);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: {
            totalTokens: 0,
            totalCost: 0,
            messageCount: 0,
            byModel: {}
          }
        };
      }

      // Aggregate data
      const result = data.reduce((acc, record) => {
        acc.totalTokens += record.total_tokens;
        acc.totalCost += record.cost_usd || 0;
        acc.messageCount += 1;

        if (!acc.byModel[record.model]) {
          acc.byModel[record.model] = { tokens: 0, cost: 0, count: 0 };
        }
        acc.byModel[record.model].tokens += record.total_tokens;
        acc.byModel[record.model].cost += record.cost_usd || 0;
        acc.byModel[record.model].count += 1;

        return acc;
      }, {
        totalTokens: 0,
        totalCost: 0,
        messageCount: 0,
        byModel: {} as Record<string, { tokens: number; cost: number; count: number }>
      });

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get usage for period:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if account is within usage limits
   */
  static async checkUsageLimits(
    accountId: string,
    additionalTokens: number = 0
  ): Promise<{ 
    success: boolean; 
    withinLimits?: boolean;
    currentUsage?: number;
    limit?: number;
    error?: string;
  }> {
    try {
      // Get current billing period
      const billingPeriod = getCurrentBillingPeriod();
      
      // Get current usage
      const usageResult = await this.getUsageForPeriod(accountId, billingPeriod);
      if (!usageResult.success) {
        throw new Error(usageResult.error);
      }

      // Get account limits (this would come from accounts table)
      // For now, using a default limit
      const monthlyTokenLimit = 1000000; // 1M tokens default

      const currentUsage = usageResult.data?.totalTokens || 0;
      const projectedUsage = currentUsage + additionalTokens;
      const withinLimits = projectedUsage <= monthlyTokenLimit;

      return {
        success: true,
        withinLimits,
        currentUsage,
        limit: monthlyTokenLimit
      };
    } catch (error) {
      console.error('Failed to check usage limits:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}