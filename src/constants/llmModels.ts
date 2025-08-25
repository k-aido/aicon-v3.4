export interface LLMModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  color: string;
  model: string; // Actual API model name
  category: 'low-cost' | 'high-reasoning';
  description?: string;
}

export const LLM_MODELS: LLMModel[] = [
  // Low Cost Models
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    color: 'text-green-300',
    model: 'gpt-5-mini',
    category: 'low-cost',
    description: 'Cost-optimized version'
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    color: 'text-green-200',
    model: 'gpt-5-nano',
    category: 'low-cost',
    description: 'Ultra-compact, lowest cost'
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    color: 'text-purple-300',
    model: 'claude-sonnet-4',
    category: 'low-cost',
    description: 'Mid-tier, balanced pricing'
  },
  
  // High Reasoning Models
  {
    id: 'gpt-5-standard',
    name: 'GPT-5 Standard',
    provider: 'openai',
    color: 'text-green-400',
    model: 'gpt-5-standard',
    category: 'high-reasoning',
    description: 'Full reasoning capabilities'
  },
  {
    id: 'claude-opus-4',
    name: 'Claude Opus 4.1',
    provider: 'anthropic',
    color: 'text-purple-400',
    model: 'claude-opus-4',
    category: 'high-reasoning',
    description: 'Premium reasoning tier - Latest version'
  }
];

export const MODEL_CATEGORIES = {
  'low-cost': 'Low Cost Models',
  'high-reasoning': 'High Reasoning Models'
} as const;

export const getModelsByCategory = () => {
  const grouped = LLM_MODELS.reduce((acc, model) => {
    if (!acc[model.category]) {
      acc[model.category] = [];
    }
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, LLMModel[]>);
  
  return grouped;
};

export const getDefaultModel = () => LLM_MODELS.find(m => m.id === 'gpt-5-mini') || LLM_MODELS[0];