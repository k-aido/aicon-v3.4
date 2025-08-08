import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
// Initialize AI clients with optional environment variables
let openai: OpenAI | null = null;
let anthropic: Anthropic | null = null;

// Only initialize if API keys are available
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model, connectedContent } = await request.json();

    // Map model IDs to actual API models
    const modelMapping: Record<string, { provider: string; model: string }> = {
      'claude-sonnet-4': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      'chatgpt-o3-mini': { provider: 'openai', model: 'gpt-4o-mini' },
      'chatgpt-4.1': { provider: 'openai', model: 'gpt-4-turbo-preview' },
      'chatgpt-4o': { provider: 'openai', model: 'gpt-4o' },
      'claude-sonnet-3.7': { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
      // Legacy mappings
      'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
      'gpt-4': { provider: 'openai', model: 'gpt-4-turbo-preview' },
      'claude-sonnet': { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
    };

    const selectedModel = modelMapping[model] || { provider: 'mock', model: model };

    // Add context from connected content if available
    let systemMessage = 'You are an AI assistant helping with content creation and analysis.';
    if (connectedContent && connectedContent.length > 0) {
      systemMessage += '\n\nConnected content for context:\n';
      connectedContent.forEach((content: any) => {
        systemMessage += `- ${content.title} (${content.platform}): ${content.url}\n`;
      });
    }

    let response;

    if (selectedModel.provider === 'openai' && openai) {
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
      } catch (error) {
        console.error('OpenAI API error:', error);
        response = `I'm a demo ${selectedModel.model} assistant. ${systemMessage.includes('Connected content') ? 'I can see you have connected content for analysis. ' : ''}How can I help you today?`;
      }
    } else if (selectedModel.provider === 'anthropic' && anthropic) {
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
      } catch (error) {
        console.error('Anthropic API error:', error);
        response = `I'm a demo ${selectedModel.model} assistant. ${systemMessage.includes('Connected content') ? 'I can see you have connected content for analysis. ' : ''}How can I help you today?`;
      }
    } else {
      // Mock response for demo/development
      const lastMessage = messages[messages.length - 1];
      const userMessage = lastMessage?.content || '';
      
      // Generate contextual mock responses
      if (connectedContent && connectedContent.length > 0) {
        response = `I'm analyzing your connected content using ${model}. Based on the ${connectedContent.length} pieces you've connected, I can help with content analysis, insights, and creative suggestions. You asked: "${userMessage}" - this is a demo response showing how I would process your request with the actual AI model.`;
      } else {
        response = `Hello! I'm a demo ${model} assistant. You said: "${userMessage}" - In the full version, I would provide detailed responses using the actual AI model. Try connecting some content pieces to see contextual analysis features!`;
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