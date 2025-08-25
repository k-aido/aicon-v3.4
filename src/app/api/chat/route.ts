import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize AI clients with optional environment variables
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Credit cost per chat completion (as specified by requirements)
const CHAT_COMPLETION_CREDITS = 100;

// Debug environment variables
console.log('[API] Environment check:');
console.log('[API] OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('[API] ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);

// Only initialize if API keys are available
if (process.env.OPENAI_API_KEY) {
  console.log('[API] Initializing OpenAI client');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.log('[API] OpenAI API key not found');
}

if (process.env.ANTHROPIC_API_KEY) {
  console.log('[API] Initializing Anthropic client');
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
} else {
  console.log('[API] Anthropic API key not found');
}

// Helper function to get user ID from cookies
async function getUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const authTokenKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
  const authToken = cookieStore.get(authTokenKey);
  
  if (authToken?.value) {
    try {
      const tokenData = JSON.parse(authToken.value);
      return tokenData.user?.id || null;
    } catch (e) {
      console.error('Failed to parse auth token:', e);
    }
  }
  return null;
}

// Helper function for storing conversation in database
async function storeConversationInDatabase(params: {
  threadId: string;
  chatInterfaceId: string | null;
  chatElementId: string | null;
  userId: string;
  projectId: string | null;
  accountId: string;
  messages: any[];
  response: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  CHAT_COMPLETION_CREDITS: number;
}) {
  const { 
    threadId, chatInterfaceId, chatElementId, userId, projectId, accountId, 
    messages, response, model, promptTokens, completionTokens, totalTokens, CHAT_COMPLETION_CREDITS 
  } = params;
  
  try {
    // Use the provided chatInterfaceId or create one if needed
    let chatInterfaceUuid = chatInterfaceId;
    let projectIdToUse = projectId;
    
    if (!chatInterfaceUuid && chatElementId) {
      // Use the provided projectId if available, otherwise get the first project
      if (!projectIdToUse) {
        const { data: projects, error: projectError } = await supabase
          .from('projects')
          .select('id')
          .eq('account_id', accountId)
          .limit(1);
        
        if (projectError) {
          console.error('[API] Error fetching project:', projectError);
        }
        
        projectIdToUse = projects && projects.length > 0 ? projects[0].id : null;
      }
      
      if (projectIdToUse) {
        // Create a chat_interface if it doesn't exist
        const { data: newInterface } = await supabase
          .from('chat_interfaces')
          .insert({
            project_id: projectIdToUse,
            name: `Chat Interface ${chatElementId}`,
            user_id: userId,
            ai_model_preference: model,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (newInterface) {
          chatInterfaceUuid = newInterface.id;
          console.log('[API] Created new chat interface:', chatInterfaceUuid);
        } else {
          console.error('[API] Failed to create chat interface');
        }
      } else {
        console.error('[API] No project found for account');
      }
    }
    
    // If we still don't have a chat interface ID, we can't proceed with database storage
    if (!chatInterfaceUuid) {
      console.warn('[API] No chat_interface_id available, skipping database persistence');
      return;
    }
    
    // Check if thread exists
    const { data: existingThread } = await supabase
      .from('chat_threads')
      .select('id, title, created_by_user_id')
      .eq('id', threadId)
      .single();

    if (!existingThread) {
      // For new threads, use the first user message as the title
      const firstUserMessage = messages.find((m: any) => m.role === 'user');
      const threadTitle = firstUserMessage?.content?.substring(0, 50) || 'New Chat';
      
      // Create new thread with proper user ID
      const { error: insertError } = await supabase
        .from('chat_threads')
        .insert({
          id: threadId,
          chat_interface_id: chatInterfaceUuid,
          title: threadTitle,
          created_by_user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('[API] Error creating thread:', insertError);
      } else {
        console.log('[API] Created new thread with title:', threadTitle, 'and user:', userId);
      }
    } else {
      // Update existing thread's updated_at timestamp
      let updates: any = {
        updated_at: new Date().toISOString()
      };
      
      // Update user ID if it was null
      if (!existingThread.created_by_user_id) {
        updates.created_by_user_id = userId;
      }
      
      // Update title if it's still "New Chat"
      if (existingThread.title === 'New Chat') {
        const firstUserMessage = messages.find((m: any) => m.role === 'user');
        if (firstUserMessage) {
          updates.title = firstUserMessage.content.substring(0, 50);
        }
      }
      
      const { error: updateError } = await supabase
        .from('chat_threads')
        .update(updates)
        .eq('id', threadId);
        
      if (updateError) {
        console.error('[API] Error updating thread:', updateError);
      }
    }

    // Store user message
    const userMessage = messages[messages.length - 1];
    if (userMessage) {
      await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          role: 'user',
          content: userMessage.content,
          tool_calls: {},
          usage: {},
          model: null,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    // Store assistant response with token usage
    await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        role: 'assistant',
        content: response,
        tool_calls: {},
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          credits_used: CHAT_COMPLETION_CREDITS
        },
        model: model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    // Also log in message_usage_records for billing tracking
    const projectIdForTracking = projectId || projectIdToUse;
    
    if (projectIdForTracking) {
      await supabase
        .from('message_usage_records')
        .insert({
          message_id: crypto.randomUUID(),
          account_id: accountId,
          project_id: projectIdForTracking,
          model: model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          cost_usd: CHAT_COMPLETION_CREDITS / 100,
          billing_period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
  } catch (dbError) {
    console.error('[API] Error storing message in database:', dbError);
    // Don't fail the request if DB storage fails
  }
}

// Helper function to check and deduct credits
async function checkAndDeductCredits(accountId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get account details for credit check and deduction
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('promotional_credits, monthly_credits_remaining')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('[API] Error fetching account:', accountError);
      return { success: false, error: 'Unable to fetch account details' };
    }

    // Check if sufficient credits (check actual fields, not the view)
    const totalAvailable = (account.promotional_credits || 0) + (account.monthly_credits_remaining || 0);
    console.log('[API] Credit check:', { 
      promotional: account.promotional_credits, 
      monthly: account.monthly_credits_remaining, 
      total: totalAvailable,
      required: CHAT_COMPLETION_CREDITS 
    });
    
    if (totalAvailable < CHAT_COMPLETION_CREDITS) {
      return { 
        success: false, 
        error: `Insufficient credits. You need ${CHAT_COMPLETION_CREDITS} credits but only have ${totalAvailable} available.` 
      };
    }

    // Calculate credit deduction (promotional first, then monthly)
    let promotionalUsed = 0;
    let monthlyUsed = 0;
    let remainingToDeduct = CHAT_COMPLETION_CREDITS;

    if (account.promotional_credits > 0) {
      promotionalUsed = Math.min(account.promotional_credits, remainingToDeduct);
      remainingToDeduct -= promotionalUsed;
    }

    if (remainingToDeduct > 0) {
      monthlyUsed = remainingToDeduct;
    }

    // Update account credits
    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        promotional_credits: Math.max(0, account.promotional_credits - promotionalUsed),
        monthly_credits_remaining: Math.max(0, account.monthly_credits_remaining - monthlyUsed),
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('[API] Error updating credits:', updateError);
      return { success: false, error: 'Failed to deduct credits' };
    }

    // Update or create usage record for current month
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const { data: existingUsage } = await supabase
      .from('billing_usage')
      .select('*')
      .eq('account_id', accountId)
      .eq('billing_period_start', startOfMonth.toISOString().split('T')[0])
      .single();

    if (existingUsage) {
      // Update existing usage
      const usageDetails = existingUsage.usage_details || {};
      usageDetails.chat_completions = (usageDetails.chat_completions || 0) + 1;

      await supabase
        .from('billing_usage')
        .update({
          promotional_credits_used: existingUsage.promotional_credits_used + promotionalUsed,
          monthly_credits_used: existingUsage.monthly_credits_used + monthlyUsed,
          total_credits_used: existingUsage.total_credits_used + CHAT_COMPLETION_CREDITS,
          usage_details: usageDetails,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUsage.id);
    } else {
      // Create new usage record
      await supabase
        .from('billing_usage')
        .insert({
          account_id: accountId,
          billing_period_start: startOfMonth.toISOString().split('T')[0],
          billing_period_end: endOfMonth.toISOString().split('T')[0],
          promotional_credits_used: promotionalUsed,
          monthly_credits_used: monthlyUsed,
          total_credits_used: CHAT_COMPLETION_CREDITS,
          usage_details: { chat_completions: 1 },
        });
    }

    console.log('[API] Credits deducted successfully:', {
      accountId,
      creditsUsed: CHAT_COMPLETION_CREDITS,
      promotionalUsed,
      monthlyUsed
    });

    return { success: true };
  } catch (error) {
    console.error('[API] Unexpected error in credit check/deduction:', error);
    return { success: false, error: 'Unexpected error processing credits' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model, connectedContent, threadId, chatElementId, chatInterfaceId, projectId } = await request.json();

    console.log(`[API] Chat request - Model: ${model}, Messages: ${messages.length}, Thread: ${threadId}, Element: ${chatElementId}, Interface: ${chatInterfaceId}`);
    console.log('[API] Connected content received:', {
      totalContent: connectedContent?.length || 0,
      contentTypes: connectedContent?.map((c: any) => c.type) || [],
      platforms: connectedContent?.filter((c: any) => c.type === 'content').map((c: any) => c.platform) || []
    });

    // Get user authentication
    let userId = await getUserIdFromCookies();
    
    // In demo mode, use the demo user ID
    if (!userId && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      userId = process.env.NEXT_PUBLIC_DEMO_USER_ID || '550e8400-e29b-41d4-a716-446655440002';
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's account
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.account_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check and deduct credits BEFORE making the API call
    const creditCheck = await checkAndDeductCredits(userData.account_id);
    if (!creditCheck.success) {
      return NextResponse.json(
        { error: creditCheck.error || 'Insufficient credits' },
        { status: 402 } // Payment Required
      );
    }

    // Map model IDs to actual API models
    const modelMapping: Record<string, { provider: string; model: string }> = {
      // OpenAI models
      'gpt-5-standard': { provider: 'openai', model: 'gpt-5-2025-08-07' },
      'gpt-5-mini': { provider: 'openai', model: 'gpt-5-mini-2025-08-07' },
      'gpt-5-nano': { provider: 'openai', model: 'gpt-5-nano-2025-08-07' },
      
      // Anthropic models
      'claude-opus-4': { provider: 'anthropic', model: 'claude-opus-4-1-20250805' },
      'claude-sonnet-4': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' }
    };

    const selectedModel = modelMapping[model] || { provider: 'mock', model: model };
    console.log(`[API] Model mapping - ${model} -> ${selectedModel.provider}:${selectedModel.model}`);

    // Build system message with RAG content
    let systemMessage = 'You are an AI assistant helping with content creation and analysis.';
    
    console.log('[API] Building system message with connected content:', {
      hasConnectedContent: !!connectedContent,
      contentLength: connectedContent?.length || 0
    });
    
    if (connectedContent && connectedContent.length > 0) {
      // Separate text elements from content elements
      const textElements = connectedContent.filter((item: any) => item.type === 'text');
      const contentElements = connectedContent.filter((item: any) => item.type === 'content' || !item.type);
      
      console.log('[API] Content breakdown:', {
        textElements: textElements.length,
        contentElements: contentElements.length
      });
      
      // Add text elements first if any exist
      if (textElements.length > 0) {
        systemMessage += '\n\nAdditional Context:\n';
        textElements.forEach((text: any) => {
          systemMessage += `\n${text.title}: ${text.content}\n`;
        });
      }
      
      // Add content analysis if any exists
      if (contentElements.length > 0) {
        systemMessage += '\n\nIMPORTANT: You have access to the following connected content. Use this information to provide insights, summaries, and analysis as requested. The user has connected this content to the chat, so you should reference it in your responses.\n\n';
        
        // Format connected content as JSON
        const connectedContentJSON = contentElements.map((content: any, index: number) => ({
          contentId: index + 1,
          title: content.title,
          platform: content.platform,
          url: content.url,
          thumbnailUrl: content.thumbnailUrl || content.thumbnail || '',
          creator: {
            name: content.creatorName || content.authorName || '',
            handle: content.creatorUsername || content.creatorHandle || '@unknown'
          },
          postedDate: content.uploadDate || content.publishedAt || content.postedDate || '',
          transcript: content.transcript || content.subtitles || '',
          analysis: {
            hookAnalysis: content.analysis?.hookAnalysis || '',
            bodyAnalysis: content.analysis?.bodyAnalysis || '',
            ctaAnalysis: content.analysis?.ctaAnalysis || '',
            keyTopics: content.keyTopics || [],
            engagementTactics: content.engagementTactics || [],
            sentiment: content.analysis?.sentiment || 'neutral',
            complexity: content.analysis?.complexity || 'moderate'
          },
          metrics: {
            views: content.metrics?.views || 0,
            likes: content.metrics?.likes || 0,
            comments: content.metrics?.comments || 0
          }
        }));
        
        systemMessage += 'Connected Content Analysis (JSON format):\n```json\n';
        systemMessage += JSON.stringify(connectedContentJSON, null, 2);
        systemMessage += '\n```\n\n';
        
        systemMessage += '\n\nWhen the user asks you to summarize or analyze content, use the connected content data above. When they click "Summarize" or "Get Insights", they are specifically asking about the connected content listed above. Do NOT ask for content to be provided - you already have it in the JSON above.';
      }
    }
    
    console.log('[API] Final system message length:', systemMessage.length);
    console.log('[API] System message preview:', systemMessage.substring(0, 500) + '...');

    let response;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let chatInterfaceUuid: string | null = null;

    console.log(`[API] Attempting to use ${selectedModel.provider} with model ${selectedModel.model}`);
    
    if (selectedModel.provider === 'openai' && openai) {
      console.log('[API] Using OpenAI API with streaming');
      try {
        // GPT-5 models use max_completion_tokens instead of max_tokens
        const completionParams: any = {
          model: selectedModel.model,
          messages: [
            { role: 'system', content: systemMessage },
            ...messages
          ],
        };

        // GPT-5 models have specific requirements
        if (selectedModel.model.startsWith('gpt-5')) {
          completionParams.max_completion_tokens = 1000; // Reduced for faster responses
          // GPT-5 only supports default temperature value (1)
          // Don't set temperature to use the default
        } else {
          completionParams.max_tokens = 1000; // Reduced for faster responses
          completionParams.temperature = 0.7;
        }

        const stream = await openai.chat.completions.create({
          ...completionParams,
          stream: true
        });

        console.log('[API] OpenAI streaming initiated');

        // Create encoder for streaming
        const encoder = new TextEncoder();
        let fullResponse = '';
        
        // Create streaming response
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              // Type guard to check if stream is iterable
              if (Symbol.asyncIterator in Object(stream)) {
                for await (const chunk of stream as any) {
                  const content = chunk.choices[0]?.delta?.content || '';
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                }
              } else {
                // Fallback for non-streaming response
                const response = stream as OpenAI.Chat.Completions.ChatCompletion;
                fullResponse = response.choices[0]?.message?.content || '';
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fullResponse })}\n\n`));
                
                // Extract usage from response
                if (response.usage) {
                  promptTokens = response.usage.prompt_tokens || 0;
                  completionTokens = response.usage.completion_tokens || 0;
                  totalTokens = response.usage.total_tokens || 0;
                }
              }
              
              // Token counting for streaming will be estimated if not already set
              // In production, you'd track this server-side or use a different approach
              if (promptTokens === 0) {
                promptTokens = Math.floor(systemMessage.length / 4) + Math.floor(JSON.stringify(messages).length / 4);
                completionTokens = Math.floor(fullResponse.length / 4);
                totalTokens = promptTokens + completionTokens;
              }
              
              // Send completion signal
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              
              // Store in database after streaming is complete
              if (threadId && (chatInterfaceId || chatElementId)) {
                await storeConversationInDatabase({
                  threadId,
                  chatInterfaceId,
                  chatElementId,
                  userId,
                  projectId,
                  accountId: userData.account_id,
                  messages,
                  response: fullResponse,
                  model,
                  promptTokens,
                  completionTokens,
                  totalTokens,
                  CHAT_COMPLETION_CREDITS
                });
              }
              
              controller.close();
            } catch (error) {
              console.error('[API] Streaming error:', error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming error occurred' })}\n\n`));
              controller.close();
              throw error;
            }
          },
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });

      } catch (error: any) {
        console.error('OpenAI API error:', error);
        
        // Since we already deducted credits, we should refund them on error
        // In production, you might want a more sophisticated refund mechanism
        const { data: currentAccount } = await supabase
          .from('accounts')
          .select('monthly_credits_remaining')
          .eq('id', userData.account_id)
          .single();
        
        if (currentAccount) {
          await supabase
            .from('accounts')
            .update({
              monthly_credits_remaining: currentAccount.monthly_credits_remaining + CHAT_COMPLETION_CREDITS
            })
            .eq('id', userData.account_id);
        }
        
        let errorMessage = 'Sorry, I encountered an error: ';
        
        // Parse specific error types
        if (error.status === 429 || error.message?.includes('429')) {
          errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing and usage limits at platform.openai.com';
        } else if (error.status === 401 || error.message?.includes('401')) {
          errorMessage = 'Invalid OpenAI API key. Please check your API configuration.';
        } else if (error.message?.includes('insufficient_quota')) {
          errorMessage = 'OpenAI account has insufficient quota. Please add billing details to your OpenAI account.';
        } else if (error.message?.includes('billing')) {
          errorMessage = 'OpenAI billing issue. Please check your account status at platform.openai.com';
        } else {
          errorMessage = `OpenAI API Error: ${error.message || 'Unknown error occurred'}`;
        }
        
        throw new Error(errorMessage);
      }
    } else if (selectedModel.provider === 'anthropic' && anthropic) {
      console.log('[API] Using Anthropic API with streaming');
      try {
        // Convert messages to Anthropic format
        const anthropicMessages = messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        const stream = await anthropic.messages.create({
          model: selectedModel.model,
          system: systemMessage,
          messages: anthropicMessages,
          max_tokens: 1000, // Reduced for faster responses
          stream: true, // Enable streaming
        });

        console.log('[API] Anthropic streaming initiated');

        // Create encoder for streaming
        const encoder = new TextEncoder();
        let fullResponse = '';
        
        // Create streaming response
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                // Handle different event types from Anthropic
                if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                  const content = chunk.delta.text || '';
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                }
                
                // Extract usage from message_stop event
                if ('usage' in chunk && chunk.usage) {
                  promptTokens = chunk.usage.input_tokens || 0;
                  completionTokens = chunk.usage.output_tokens || 0;
                  totalTokens = promptTokens + completionTokens;
                }
              }
              
              // Send completion signal
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              
              // Store in database after streaming is complete
              if (threadId && (chatInterfaceId || chatElementId)) {
                await storeConversationInDatabase({
                  threadId,
                  chatInterfaceId,
                  chatElementId,
                  userId,
                  projectId,
                  accountId: userData.account_id,
                  messages,
                  response: fullResponse,
                  model,
                  promptTokens,
                  completionTokens,
                  totalTokens,
                  CHAT_COMPLETION_CREDITS
                });
              }
              
              controller.close();
            } catch (error) {
              console.error('[API] Streaming error:', error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming error occurred' })}\n\n`));
              controller.close();
              throw error;
            }
          },
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (error: any) {
        console.error('Anthropic API error:', error);
        
        // Refund credits on error
        const { data: currentAccount } = await supabase
          .from('accounts')
          .select('monthly_credits_remaining')
          .eq('id', userData.account_id)
          .single();
        
        if (currentAccount) {
          await supabase
            .from('accounts')
            .update({
              monthly_credits_remaining: currentAccount.monthly_credits_remaining + CHAT_COMPLETION_CREDITS
            })
            .eq('id', userData.account_id);
        }
        
        let errorMessage = 'Sorry, I encountered an error: ';
        
        // Parse specific error types
        if (error.status === 529 || error.message?.includes('529') || error.message?.includes('overloaded_error')) {
          errorMessage = 'Claude is temporarily overloaded due to high demand. Please try again in a few moments.';
        } else if (error.status === 429 || error.message?.includes('429')) {
          errorMessage = 'Anthropic API rate limit exceeded. Please wait and try again.';
        } else if (error.status === 401 || error.message?.includes('401')) {
          errorMessage = 'Invalid Anthropic API key. Please check your API configuration.';
        } else if (error.message?.includes('credit balance is too low') || error.message?.includes('insufficient')) {
          errorMessage = 'Anthropic account has insufficient credits. Please add credits at console.anthropic.com';
        } else if (error.message?.includes('billing')) {
          errorMessage = 'Anthropic billing issue. Please check your account status at console.anthropic.com';
        } else {
          errorMessage = `Anthropic API Error: ${error.message || 'Unknown error occurred'}`;
        }
        
        throw new Error(errorMessage);
      }
    } else {
      // No API keys configured - refund credits and return error
      const { data: currentAccount } = await supabase
        .from('accounts')
        .select('monthly_credits_remaining')
        .eq('id', userData.account_id)
        .single();
      
      if (currentAccount) {
        await supabase
          .from('accounts')
          .update({
            monthly_credits_remaining: currentAccount.monthly_credits_remaining + CHAT_COMPLETION_CREDITS
          })
          .eq('id', userData.account_id);
      }
        
      console.log(`[API] No API keys configured for ${selectedModel.provider}`);
      const lastMessage = messages[messages.length - 1];
      const userMessage = lastMessage?.content || '';
      
      if (selectedModel.provider === 'openai') {
        response = `⚠️ OpenAI API key not configured. Add OPENAI_API_KEY to your .env.local file to enable ${model} responses. Your message: "${userMessage}"`;
      } else if (selectedModel.provider === 'anthropic') {
        response = `⚠️ Anthropic API key not configured. Add ANTHROPIC_API_KEY to your .env.local file to enable ${model} responses. Your message: "${userMessage}"`;
      } else {
        response = `⚠️ API configuration missing for ${model}. Please check your environment variables. Your message: "${userMessage}"`;
      }
      
      // Development mock response if needed
      if (process.env.NODE_ENV === 'development' && response.includes('API configuration missing')) {
        console.log('[API] Using mock response for development');
        response = `I understand you're asking about: "${userMessage}". 

Based on the connected content, here are some insights:
- This appears to be related to content strategy and engagement optimization
- Consider focusing on strong hooks in the first 3 seconds
- Engagement tactics like visual storytelling and strategic hashtags are important
- Platform-specific features should be leveraged for maximum reach

[Note: This is a mock response. Please configure your API keys for real AI responses.]`;
      }
    }

    // For non-streaming responses, store in database and return
    if (response) {
      if (threadId && (chatInterfaceId || chatElementId)) {
        await storeConversationInDatabase({
          threadId,
          chatInterfaceId,
          chatElementId,
          userId,
          projectId,
          accountId: userData.account_id,
          messages,
          response,
          model,
          promptTokens,
          completionTokens,
          totalTokens,
          CHAT_COMPLETION_CREDITS
        });
      }

      return NextResponse.json({ 
        content: response,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          credits_used: CHAT_COMPLETION_CREDITS
        },
        chatInterfaceId: chatInterfaceUuid // Return the interface ID to the frontend
      });
    }
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}