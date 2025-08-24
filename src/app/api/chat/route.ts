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

    // Get user authentication
    const userId = await getUserIdFromCookies();
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
      'claude-opus-4': { provider: 'anthropic', model: 'claude-opus-4-20250514' },
      'claude-sonnet-4': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' }
    };

    const selectedModel = modelMapping[model] || { provider: 'mock', model: model };
    console.log(`[API] Model mapping - ${model} -> ${selectedModel.provider}:${selectedModel.model}`);

    // Build system message with RAG content
    let systemMessage = 'You are an AI assistant helping with content creation and analysis.';
    
    if (connectedContent && connectedContent.length > 0) {
      // Separate text elements from content elements
      const textElements = connectedContent.filter((item: any) => item.type === 'text');
      const contentElements = connectedContent.filter((item: any) => item.type === 'content' || !item.type);
      
      // Add text elements first if any exist
      if (textElements.length > 0) {
        systemMessage += '\n\nAdditional Context:\n';
        textElements.forEach((text: any) => {
          systemMessage += `\n${text.title}: ${text.content}\n`;
        });
      }
      
      // Add content analysis if any exists
      if (contentElements.length > 0) {
        systemMessage += '\n\nIMPORTANT: The following analyzed content is automatically available to you from the connected content pieces on the canvas. You should reference and use these insights to inform your responses, create inspired content, and provide relevant suggestions. You DO NOT need the user to mention these pieces - they are always available to you in this conversation.\n\n';
        
        // Format connected content as JSON
        const connectedContentJSON = contentElements.map((content: any, index: number) => ({
          contentId: index + 1,
          title: content.title,
          platform: content.platform,
          url: content.url,
          creatorUsername: content.creatorUsername || 'Unknown Creator',
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
        
        systemMessage += 'When generating content, incorporate successful patterns and tactics from the analyzed content above. Be specific about which techniques you are adapting and why they work. When referencing content, mention it naturally by creator name and title (e.g., "@alexhormozi\'s video about business growth" or "the Instagram reel by @garyvee"). DO NOT mention contentId numbers or say "Content #1" - always use natural references with creator names and titles.';
      }
    }

    let response;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let chatInterfaceUuid: string | null = null;

    console.log(`[API] Attempting to use ${selectedModel.provider} with model ${selectedModel.model}`);
    
    if (selectedModel.provider === 'openai' && openai) {
      console.log('[API] Using OpenAI API');
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
          completionParams.max_completion_tokens = 1000;
          // GPT-5 only supports default temperature value (1)
          // Don't set temperature to use the default
        } else {
          completionParams.max_tokens = 1000;
          completionParams.temperature = 0.7;
        }

        const completion = await openai.chat.completions.create(completionParams);

        console.log('[API] OpenAI completion response:', {
          hasChoices: !!completion.choices,
          choicesLength: completion.choices?.length,
          firstChoice: completion.choices[0],
          content: completion.choices[0]?.message?.content?.substring(0, 100)
        });

        response = completion.choices[0]?.message?.content || 'No response generated';
        
        // Extract token usage
        if (completion.usage) {
          promptTokens = completion.usage.prompt_tokens;
          completionTokens = completion.usage.completion_tokens;
          totalTokens = completion.usage.total_tokens;
        }

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
      console.log('[API] Using Anthropic API');
      try {
        // Convert messages to Anthropic format
        const anthropicMessages = messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

        const completion = await anthropic.messages.create({
          model: selectedModel.model,
          system: systemMessage,
          messages: anthropicMessages,
          max_tokens: 1000,
        });

        console.log('[API] Anthropic completion response:', {
          hasContent: !!completion.content,
          contentLength: completion.content?.length,
          firstContent: completion.content[0],
          type: completion.content[0]?.type,
          text: (completion.content[0] as any)?.text?.substring(0, 100)
        });

        response = completion.content && completion.content[0] && completion.content[0].type === 'text' 
          ? (completion.content[0] as any).text 
          : 'No response generated';
          
        // Extract token usage (Anthropic provides this differently)
        if (completion.usage) {
          promptTokens = completion.usage.input_tokens || 0;
          completionTokens = completion.usage.output_tokens || 0;
          totalTokens = promptTokens + completionTokens;
        }
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

    // Store the conversation in the database if we have thread/element info
    console.log('[API] Database persistence check:', { 
      threadId, 
      chatInterfaceId, 
      chatElementId,
      willPersist: !!(threadId && (chatInterfaceId || chatElementId))
    });
    
    if (threadId && (chatInterfaceId || chatElementId)) {
      try {
        // Use the provided chatInterfaceId or create one if needed
        chatInterfaceUuid = chatInterfaceId;
        let projectIdToUse = projectId; // Declare in outer scope
        
        if (!chatInterfaceUuid && chatElementId) {
          // Use the provided projectId if available, otherwise get the first project
          projectIdToUse = projectId;
          
          if (!projectIdToUse) {
            const { data: projects, error: projectError } = await supabase
              .from('projects')
              .select('id')
              .eq('account_id', userData.account_id)
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
          // Return early but still include response
          return NextResponse.json({ 
            content: response,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
              credits_used: CHAT_COMPLETION_CREDITS
            }
          });
        }
        
        // Check if thread exists
        const { data: existingThread } = await supabase
          .from('chat_threads')
          .select('id, title, created_by_user_id')
          .eq('id', threadId)
          .single();

        if (!existingThread) {
          // Ensure we have a chat_interface_id before creating the thread
          if (!chatInterfaceUuid) {
            console.error('[API] Cannot create thread without chat_interface_id');
            // Skip database persistence if we can't create a proper thread
            return NextResponse.json({ 
              content: response,
              usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: totalTokens,
                credits_used: CHAT_COMPLETION_CREDITS
              }
            });
          }
          
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
              created_by_user_id: userId, // This should now properly set the user ID
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
          // Also update title if it's still "New Chat" and we have a user message
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
        // Use the projectId we already have from earlier
        const projectIdForTracking = projectId || projectIdToUse;
        
        if (projectIdForTracking) {
          await supabase
            .from('message_usage_records')
            .insert({
              message_id: crypto.randomUUID(), // Generate a UUID for the message
              account_id: userData.account_id,
              project_id: projectIdForTracking, // Use the actual project ID from the request
              model: model,
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens,
              cost_usd: CHAT_COMPLETION_CREDITS / 100, // Convert credits to rough USD estimate
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
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}