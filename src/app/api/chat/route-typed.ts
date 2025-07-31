import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ChatApiRequest, ChatApiResponse, Message } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ModelConfig {
  provider: 'openai' | 'anthropic';
  model: string;
}

const modelMapping: Record<string, ModelConfig> = {
  'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
  'gpt-4': { provider: 'openai', model: 'gpt-4-turbo-preview' },
  'claude-sonnet': { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
};

/**
 * Handles chat requests for both OpenAI and Anthropic models
 */
export async function POST(req: NextRequest): Promise<NextResponse<ChatApiResponse>> {
  try {
    const body: ChatApiRequest = await req.json();
    const { messages, model, connectedContent } = body;

    const selectedModel = modelMapping[model];
    if (!selectedModel) {
      return NextResponse.json({ 
        content: '', 
        error: 'Invalid model selected' 
      }, { status: 400 });
    }

    // Build context from connected content
    const contextMessage = connectedContent?.length 
      ? `Connected content:\n${connectedContent.map(c => 
          `- ${c.title} (${c.platform}): ${c.url}`
        ).join('\n')}\n\n`
      : '';

    if (selectedModel.provider === 'openai') {
      const systemMessage: OpenAI.ChatCompletionMessageParam = {
        role: 'system',
        content: 'You are a helpful AI assistant analyzing social media content. ' + contextMessage
      };

      const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
        systemMessage,
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];

      const completion = await openai.chat.completions.create({
        model: selectedModel.model,
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return NextResponse.json({
        content: completion.choices[0]?.message?.content || 'No response generated'
      });
    } else {
      // Anthropic
      const systemMessage = 'You are a helpful AI assistant analyzing social media content. ' + contextMessage;

      const anthropicMessages = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      const completion = await anthropic.messages.create({
        model: selectedModel.model,
        system: systemMessage,
        messages: anthropicMessages,
        max_tokens: 1000,
      });

      const textContent = completion.content.find(c => c.type === 'text');
      return NextResponse.json({
        content: textContent?.text || 'No response generated'
      });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ 
      content: '', 
      error: error instanceof Error ? error.message : 'An error occurred' 
    }, { status: 500 });
  }
}