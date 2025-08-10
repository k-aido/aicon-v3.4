import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
// Initialize AI clients with optional environment variables
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

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

export async function POST(request: NextRequest) {
  try {
    const { messages, model, connectedContent } = await request.json();

    console.log(`[API] Chat request - Model: ${model}, Messages: ${messages.length}, Connected Content: ${connectedContent?.length || 0}`);

    // Map model IDs to actual API models
    const modelMapping: Record<string, { provider: string; model: string }> = {
      'gpt-5-standard': { provider: 'openai', model: 'gpt-4o' },
      'gpt-5-mini': { provider: 'openai', model: 'gpt-4o-mini' },
      'gpt-5-nano': { provider: 'openai', model: 'gpt-4o-mini' },
      'claude-opus-4': { provider: 'anthropic', model: 'claude-3-opus-20240229' },
      'claude-sonnet-4': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
    };

    const selectedModel = modelMapping[model] || { provider: 'mock', model: model };
    console.log(`[API] Model mapping - ${model} -> ${selectedModel.provider}:${selectedModel.model}`);

    // Add context from connected content if available
    let systemMessage = 'You are an AI assistant helping with content creation and analysis.';
    if (connectedContent && connectedContent.length > 0) {
      systemMessage += '\n\nConnected content for context:\n';
      connectedContent.forEach((content: any) => {
        systemMessage += `- ${content.title} (${content.platform}): ${content.url}\n`;
      });
    }

    let response;

    console.log(`[API] Attempting to use ${selectedModel.provider} with model ${selectedModel.model}`);
    console.log(`[API] OpenAI client available:`, !!openai);
    console.log(`[API] Anthropic client available:`, !!anthropic);
    
    if (selectedModel.provider === 'openai' && openai) {
      console.log('[API] Using OpenAI API');
      try {
        const completion = await openai.chat.completions.create({
          model: selectedModel.model,
          messages: [
            { role: 'system', content: systemMessage },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        response = completion.choices[0]?.message?.content || 'No response generated';
      } catch (error: any) {
        console.error('OpenAI API error:', error);
        
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

        response = completion.content[0].type === 'text' 
          ? completion.content[0].text 
          : 'No response generated';
      } catch (error: any) {
        console.error('Anthropic API error:', error);
        
        let errorMessage = 'Sorry, I encountered an error: ';
        
        // Parse specific error types
        if (error.status === 429 || error.message?.includes('429')) {
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
      // No API keys configured - explain to user
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
    }

    return NextResponse.json({ content: response });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}