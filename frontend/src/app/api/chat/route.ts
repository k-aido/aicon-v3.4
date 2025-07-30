import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, model, connectedContent } = await request.json();

    // Map model IDs to actual API models
    const modelMapping: Record<string, { provider: string; model: string }> = {
      'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
      'gpt-4': { provider: 'openai', model: 'gpt-4-turbo-preview' },
      'claude-sonnet': { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
      // Add more model mappings as needed
    };

    const selectedModel = modelMapping[model] || modelMapping['gpt-4'];

    // Add context from connected content if available
    let systemMessage = 'You are an AI assistant helping with content creation and analysis.';
    if (connectedContent && connectedContent.length > 0) {
      systemMessage += '\n\nConnected content for context:\n';
      connectedContent.forEach((content: any) => {
        systemMessage += `- ${content.title} (${content.platform}): ${content.url}\n`;
      });
    }

    let response;

    if (selectedModel.provider === 'openai') {
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
    } else if (selectedModel.provider === 'anthropic') {
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
    } else {
      // Fallback to mock response for unsupported models
      response = `This is a mock response from ${model}. The actual model integration is not yet implemented.`;
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