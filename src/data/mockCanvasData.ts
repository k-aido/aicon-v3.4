import { 
  CanvasElement, 
  ContentPiece, 
  FolderData, 
  ChatData, 
  Connection, 
  CanvasState,
  ContentAnalysis 
} from '@/types/canvas';

// Mock content analysis data
const mockAnalyses: Record<string, ContentAnalysis> = {
  'analysis-1': {
    id: 'analysis-1',
    contentId: 'content-1',
    summary: 'Comprehensive React hooks tutorial covering useState, useEffect, and custom hooks with practical examples.',
    keyPoints: [
      'Strong opening with relatable problem statement',
      'Clear step-by-step hook implementations',
      'Real-world examples and best practices',
      'Call to action: Subscribe for advanced React content'
    ],
    sentiment: 'positive',
    topics: [
      { name: 'React', confidence: 0.95 },
      { name: 'JavaScript', confidence: 0.85 },
      { name: 'Web Development', confidence: 0.78 },
      { name: 'Programming', confidence: 0.72 }
    ],
    entities: [
      { text: 'React', type: 'product', confidence: 0.95 },
      { text: 'JavaScript', type: 'product', confidence: 0.88 },
      { text: 'Facebook', type: 'organization', confidence: 0.65 }
    ],
    language: 'en',
    readingTime: 12,
    complexity: 'moderate',
    analyzedAt: new Date('2024-01-15T10:30:00Z')
  },
  'analysis-2': {
    id: 'analysis-2',
    contentId: 'content-2',
    summary: 'Quick TikTok showcasing CSS Grid layout tricks with visual examples and code snippets.',
    keyPoints: [
      'Eye-catching visual hook with grid animation',
      'Concise explanation of grid properties',
      'Live coding demonstration',
      'Follow for more web dev tips'
    ],
    sentiment: 'positive',
    topics: [
      { name: 'CSS', confidence: 0.92 },
      { name: 'Web Design', confidence: 0.85 },
      { name: 'Frontend', confidence: 0.78 }
    ],
    entities: [
      { text: 'CSS Grid', type: 'product', confidence: 0.88 },
      { text: 'HTML', type: 'product', confidence: 0.65 }
    ],
    language: 'en',
    readingTime: 2,
    complexity: 'simple',
    analyzedAt: new Date('2024-01-14T14:20:00Z')
  }
};

// Mock elements with comprehensive data
export const mockElements: Record<string, CanvasElement> = {
  'content-1': {
    id: 'content-1',
    type: 'content',
    position: { x: 150, y: 100 },
    dimensions: { width: 320, height: 240 },
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    createdAt: new Date('2024-01-10T08:00:00Z'),
    updatedAt: new Date('2024-01-15T10:30:00Z'),
    url: 'https://youtube.com/watch?v=react-hooks-tutorial',
    title: 'Complete React Hooks Guide - useState, useEffect & Custom Hooks',
    description: 'Learn React hooks from basics to advanced patterns with practical examples.',
    thumbnail: 'https://via.placeholder.com/1280x720/ff0000/ffffff?text=📺+React+Hooks+Tutorial&font-size=48',
    platform: 'youtube',
    duration: 720, // 12 minutes
    viewCount: 245000,
    likeCount: 8500,
    commentCount: 420,
    publishedAt: new Date('2024-01-10T08:00:00Z'),
    author: {
      name: 'CodeMaster Pro',
      avatarUrl: 'https://via.placeholder.com/40x40?text=CM&bg=blue&color=white',
      channelUrl: 'https://youtube.com/@codemasterpro'
    },
    analysis: mockAnalyses['analysis-1'],
    tags: ['react', 'hooks', 'javascript', 'tutorial', 'frontend'],
    transcription: 'Welcome to this comprehensive React hooks tutorial...'
  } as ContentPiece,

  'content-2': {
    id: 'content-2',
    type: 'content',
    position: { x: 600, y: 150 },
    dimensions: { width: 280, height: 220 },
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    createdAt: new Date('2024-01-12T15:30:00Z'),
    updatedAt: new Date('2024-01-14T14:20:00Z'),
    url: 'https://tiktok.com/@webdev/video/css-grid-tricks',
    title: 'CSS Grid Layout Tricks That Will Blow Your Mind! 🤯',
    thumbnail: 'https://via.placeholder.com/1080x1920/000000/ffffff?text=🎵+CSS+Grid+Tricks&font-size=48',
    platform: 'tiktok',
    duration: 45,
    viewCount: 120000,
    likeCount: 12000,
    commentCount: 850,
    publishedAt: new Date('2024-01-12T15:30:00Z'),
    author: {
      name: 'WebDevTips',
      avatarUrl: 'https://via.placeholder.com/40x40?text=WD&bg=black&color=white'
    },
    analysis: mockAnalyses['analysis-2'],
    tags: ['css', 'grid', 'layout', 'webdev', 'tips']
  } as ContentPiece,

  'content-3': {
    id: 'content-3',
    type: 'content',
    position: { x: 300, y: 400 },
    dimensions: { width: 300, height: 200 },
    zIndex: 1,
    isVisible: true,
    isLocked: false,
    createdAt: new Date('2024-01-08T12:00:00Z'),
    updatedAt: new Date('2024-01-08T12:00:00Z'),
    url: 'https://instagram.com/p/design-systems-post',
    title: 'Building Scalable Design Systems for Modern Apps',
    thumbnail: 'https://via.placeholder.com/1080x1080/E4405F/ffffff?text=📸+Design+Systems&font-size=48',
    platform: 'instagram',
    viewCount: 85000,
    likeCount: 3200,
    commentCount: 180,
    publishedAt: new Date('2024-01-08T12:00:00Z'),
    author: {
      name: 'DesignSystemsIO',
      avatarUrl: 'https://via.placeholder.com/40x40?text=DS&bg=purple&color=white'
    },
    tags: ['design', 'systems', 'ui', 'ux', 'components']
  } as ContentPiece,

  'folder-1': {
    id: 'folder-1',
    type: 'folder',
    position: { x: 50, y: 350 },
    dimensions: { width: 400, height: 300 },
    zIndex: 0,
    isVisible: true,
    isLocked: false,
    createdAt: new Date('2024-01-10T09:00:00Z'),
    updatedAt: new Date('2024-01-15T11:00:00Z'),
    name: 'Frontend Development Resources',
    description: 'Collection of tutorials and guides for modern frontend development',
    color: '#3B82F6',
    icon: '💻',
    childIds: ['content-3'],
    isExpanded: true,
    sortOrder: 'date'
  } as FolderData,

  'folder-2': {
    id: 'folder-2',
    type: 'folder',
    position: { x: 700, y: 400 },
    dimensions: { width: 350, height: 250 },
    zIndex: 0,
    isVisible: true,
    isLocked: false,
    createdAt: new Date('2024-01-11T10:00:00Z'),
    updatedAt: new Date('2024-01-11T10:00:00Z'),
    name: 'Social Media Content',
    description: 'Quick tips and tricks from social platforms',
    color: '#EC4899',
    icon: '📱',
    childIds: [],
    isExpanded: false,
    sortOrder: 'manual'
  } as FolderData,

  'chat-1': {
    id: 'chat-1',
    type: 'chat',
    position: { x: 950, y: 120 },
    dimensions: { width: 420, height: 500 },
    zIndex: 2,
    isVisible: true,
    isLocked: false,
    createdAt: new Date('2024-01-10T10:00:00Z'),
    updatedAt: new Date('2024-01-15T16:30:00Z'),
    title: 'React Learning Discussion',
    model: 'gpt-4',
    messages: [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello! I can see you\'ve connected some React content. I\'m here to help you understand and discuss the concepts. What would you like to explore?',
        timestamp: new Date('2024-01-10T10:05:00Z')
      },
      {
        id: 'msg-2',
        role: 'user',
        content: 'Can you help me understand when to use useState vs useReducer?',
        timestamp: new Date('2024-01-10T10:10:00Z')
      },
      {
        id: 'msg-3',
        role: 'assistant',
        content: 'Great question! Based on the connected React hooks tutorial, here\'s when to use each:\n\n**useState** is perfect for:\n- Simple state values (strings, numbers, booleans)\n- Independent state updates\n- Component-level state\n\n**useReducer** is better for:\n- Complex state objects\n- State transitions that depend on previous state\n- When you need predictable state updates\n\nThe tutorial shows useState is ideal for toggles and counters, while useReducer shines in forms and complex workflows.',
        timestamp: new Date('2024-01-10T10:12:00Z')
      },
      {
        id: 'msg-4',
        role: 'user',
        content: 'That makes sense! Can you give me a practical example?',
        timestamp: new Date('2024-01-15T16:25:00Z')
      },
      {
        id: 'msg-5',
        role: 'assistant',
        content: 'Absolutely! Here\'s a practical comparison:\n\n**useState for a simple counter:**\n```javascript\nconst [count, setCount] = useState(0);\n```\n\n**useReducer for a shopping cart:**\n```javascript\nconst cartReducer = (state, action) => {\n  switch(action.type) {\n    case \'ADD_ITEM\':\n      return {...state, items: [...state.items, action.item]};\n    case \'REMOVE_ITEM\':\n      return {...state, items: state.items.filter(i => i.id !== action.id)};\n    default:\n      return state;\n  }\n};\n```\n\nThe cart example shows how useReducer helps manage related state changes predictably!',
        timestamp: new Date('2024-01-15T16:30:00Z')
      }
    ],
    connectedContentIds: ['content-1'],
    settings: {
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'You are a helpful React development assistant.'
    },
    status: 'idle',
    lastMessageAt: new Date('2024-01-15T16:30:00Z')
  } as ChatData,

  'chat-2': {
    id: 'chat-2',
    type: 'chat',
    position: { x: 1100, y: 650 },
    dimensions: { width: 400, height: 450 },
    zIndex: 2,
    isVisible: true,
    isLocked: false,
    createdAt: new Date('2024-01-14T14:00:00Z'),
    updatedAt: new Date('2024-01-14T15:00:00Z'),
    title: 'CSS Grid Analysis',
    model: 'claude-sonnet',
    messages: [
      {
        id: 'msg-6',
        role: 'assistant',
        content: 'I can see you\'ve connected a CSS Grid tutorial! This is a powerful layout system. What aspects of Grid would you like to explore?',
        timestamp: new Date('2024-01-14T14:05:00Z')
      },
      {
        id: 'msg-7',
        role: 'user',
        content: 'The video shows some cool tricks, but I\'m confused about grid-template-areas. Can you explain?',
        timestamp: new Date('2024-01-14T14:50:00Z')
      },
      {
        id: 'msg-8',
        role: 'assistant',
        content: 'Grid-template-areas is like drawing your layout with text! You define named areas and assign them visually:\n\n```css\n.container {\n  display: grid;\n  grid-template-areas:\n    "header header"\n    "sidebar main"\n    "footer footer";\n}\n\n.header { grid-area: header; }\n.sidebar { grid-area: sidebar; }\n```\n\nIt\'s incredibly intuitive - you literally see your layout in the CSS!',
        timestamp: new Date('2024-01-14T15:00:00Z')
      }
    ],
    connectedContentIds: ['content-2'],
    settings: {
      temperature: 0.8,
      maxTokens: 1500
    },
    status: 'idle',
    lastMessageAt: new Date('2024-01-14T15:00:00Z')
  } as ChatData
};

// Mock connections
export const mockConnections: Connection[] = [
  {
    id: 'conn-1',
    source: { elementId: 'content-1', anchor: 'right' },
    target: { elementId: 'chat-1', anchor: 'left' },
    type: 'data',
    style: { 
      color: '#8B5CF6', 
      strokeWidth: 2, 
      animated: true,
      label: 'Learning Context'
    },
    metadata: { createdAt: new Date('2024-01-10T10:05:00Z') }
  },
  {
    id: 'conn-2',
    source: { elementId: 'content-2', anchor: 'right' },
    target: { elementId: 'chat-2', anchor: 'left' },
    type: 'data',
    style: { 
      color: '#10B981', 
      strokeWidth: 2, 
      animated: true,
      label: 'CSS Help'
    },
    metadata: { createdAt: new Date('2024-01-14T14:05:00Z') }
  },
  {
    id: 'conn-3',
    source: { elementId: 'content-1', anchor: 'bottom' },
    target: { elementId: 'content-2', anchor: 'top' },
    type: 'reference',
    style: { 
      color: '#F59E0B', 
      strokeWidth: 1, 
      animated: false,
      label: 'Related Content'
    },
    metadata: { createdAt: new Date('2024-01-12T16:00:00Z') }
  }
];

// Complete mock canvas state
export const mockCanvasState: CanvasState = {
  elements: mockElements,
  connections: mockConnections,
  viewport: { x: 0, y: 0, zoom: 1 },
  selection: { elementIds: [], connectionIds: [] },
  clipboard: undefined
};

// Mock workspace configuration
export const mockWorkspaceConfig = {
  id: 'workspace-demo',
  name: 'Frontend Learning Workspace',
  description: 'A comprehensive workspace for learning modern frontend development',
  thumbnail: 'https://via.placeholder.com/300x200?text=Frontend+Workspace&bg=blue&color=white',
  createdAt: new Date('2024-01-10T08:00:00Z'),
  updatedAt: new Date('2024-01-15T16:30:00Z'),
  lastAccessedAt: new Date(),
  settings: {
    gridSize: 20,
    snapToGrid: false,
    showGrid: true,
    theme: 'dark' as const,
    autoSave: true,
    autoSaveInterval: 30
  },
  permissions: {
    canEdit: true,
    canShare: true,
    canDelete: true,
    isPublic: false
  },
  tags: ['frontend', 'react', 'css', 'learning']
};