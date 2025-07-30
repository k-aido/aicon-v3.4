# AICON v3 Component Architecture & User Flows Specification

## Overview
This document defines the complete component architecture and user experience flows for AICON v3's canvas-first interface. It covers the React component structure, state management patterns, user interaction flows, and the integration of all previously defined systems (auth, APIs, file management) into a cohesive user experience.

## Technology Stack
- **Frontend Framework**: Next.js 14 with App Router
- **UI Library**: React 18 with TypeScript
- **Component Library**: Shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Context
- **Canvas Rendering**: HTML5 Canvas + React DnD
- **Routing**: Next.js App Router
- **Real-time Updates**: Server-Sent Events (SSE)

## Application Architecture

### 1. App Structure

```typescript
// App directory structure
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── verify-email/
├── (authenticated)/
│   ├── dashboard/
│   ├── projects/
│   │   └── [id]/
│   │       ├── canvas/
│   │       └── settings/
│   ├── account/
│   │   ├── settings/
│   │   ├── team/
│   │   └── billing/
│   ├── creators/
│   ├── voice-models/
│   ├── avatar-models/
│   └── analytics/
├── api/
│   ├── auth/
│   ├── projects/
│   ├── content/
│   ├── files/
│   ├── ai/
│   └── webhooks/
├── components/
│   ├── ui/ (shadcn components)
│   ├── auth/
│   ├── canvas/
│   ├── content/
│   ├── generation/
│   ├── layout/
│   └── shared/
└── lib/
    ├── auth/
    ├── api/
    ├── canvas/
    ├── stores/
    └── utils/
```

### 2. State Management Architecture

```typescript
// Global state structure using Zustand
interface AppState {
  // Authentication state
  auth: {
    user: User | null;
    account: Account | null;
    permissions: UserPermissions;
    isAuthenticated: boolean;
  };
  
  // Current project state
  project: {
    current: Project | null;
    collaborators: ProjectCollaborator[];
    isLoading: boolean;
  };
  
  // Canvas state
  canvas: {
    elements: CanvasElement[];
    connections: CanvasConnection[];
    selectedElements: string[];
    viewport: CanvasViewport;
    mode: 'select' | 'connect' | 'add';
  };
  
  // Content management
  content: {
    pieces: ContentPiece[];
    folders: CanvasFolder[];
    analysis: Record<string, ContentAnalysis>;
    processingStatus: Record<string, ProcessingStatus>;
  };
  
  // AI generation state
  generation: {
    scripts: GeneratedScript[];
    voiceModels: VoiceModel[];
    avatarModels: AvatarModel[];
    activeGenerations: ActiveGeneration[];
  };
  
  // UI state
  ui: {
    sidebarOpen: boolean;
    activePanel: 'content' | 'analysis' | 'generation' | 'settings' | null;
    notifications: Notification[];
    modals: ModalState;
  };
}
```

## Core Component Architecture

### 1. Layout Components

#### App Layout
```typescript
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, account } = useAuthStore();
  const { notifications } = useUIStore();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <TopNavigation user={user} account={account} />
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Global Notifications */}
      <NotificationCenter notifications={notifications} />
      
      {/* Global Modals */}
      <GlobalModals />
      
      {/* Real-time Status */}
      <RealtimeStatusIndicator />
    </div>
  );
};

const TopNavigation: React.FC<{
  user: User;
  account: Account;
}> = ({ user, account }) => {
  const router = useRouter();
  const { logout } = useAuthStore();
  
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo and Navigation */}
        <div className="flex items-center space-x-8">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded text-white flex items-center justify-center font-bold">
              A
            </div>
            <span className="text-xl font-semibold">AICON</span>
          </Link>
          
          <NavigationTabs />
        </div>
        
        {/* Right side */}
        <div className="flex items-center space-x-4">
          <NotificationBell />
          <AccountSwitcher account={account} />
          <UserMenu user={user} onLogout={logout} />
        </div>
      </div>
    </nav>
  );
};
```

#### Project Layout
```typescript
const ProjectLayout: React.FC<{
  projectId: string;
  children: React.ReactNode;
}> = ({ projectId, children }) => {
  const { project, loadProject } = useProjectStore();
  const { activePanel, sidebarOpen } = useUIStore();
  
  useEffect(() => {
    loadProject(projectId);
  }, [projectId]);
  
  if (!project) {
    return <ProjectLoadingScreen />;
  }
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <ProjectSidebar 
        project={project}
        isOpen={sidebarOpen}
        activePanel={activePanel}
      />
      
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        <ProjectToolbar project={project} />
        <div className="flex-1 relative">
          {children}
        </div>
      </div>
      
      {/* Right Panel */}
      <RightPanel activePanel={activePanel} />
    </div>
  );
};
```

### 2. Canvas Components

#### Main Canvas Component
```typescript
const CanvasWorkspace: React.FC<{ projectId: string }> = ({ projectId }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { 
    elements, 
    connections, 
    selectedElements, 
    viewport,
    mode,
    addElement,
    updateElement,
    deleteElement,
    createConnection
  } = useCanvasStore();
  
  const [draggedElement, setDraggedElement] = useState<CanvasElement | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  
  // Handle canvas interactions
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert screen coordinates to canvas coordinates
    const canvasX = (x - viewport.offsetX) / viewport.zoom;
    const canvasY = (y - viewport.offsetY) / viewport.zoom;
    
    if (mode === 'add' && draggedElement) {
      addElement({
        ...draggedElement,
        position: { x: canvasX, y: canvasY }
      });
      setDraggedElement(null);
    }
  }, [mode, draggedElement, viewport, addElement]);
  
  const handleElementDrag = useCallback((elementId: string, newPosition: Position) => {
    updateElement(elementId, { position: newPosition });
  }, [updateElement]);
  
  const handleConnectionStart = useCallback((elementId: string, connectionPoint: ConnectionPoint) => {
    if (mode === 'connect') {
      setConnectionStart(`${elementId}:${connectionPoint}`);
    }
  }, [mode]);
  
  const handleConnectionEnd = useCallback((elementId: string, connectionPoint: ConnectionPoint) => {
    if (connectionStart && mode === 'connect') {
      const [sourceId, sourcePoint] = connectionStart.split(':');
      createConnection({
        source: { elementId: sourceId, point: sourcePoint as ConnectionPoint },
        target: { elementId, point: connectionPoint }
      });
      setConnectionStart(null);
    }
  }, [connectionStart, mode, createConnection]);
  
  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-gray-50 overflow-hidden cursor-default"
      onClick={handleCanvasClick}
      style={{
        backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
        backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
        backgroundPosition: `${viewport.offsetX}px ${viewport.offsetY}px`
      }}
    >
      {/* Canvas Transform Container */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Render Elements */}
        {elements.map(element => (
          <CanvasElement
            key={element.id}
            element={element}
            isSelected={selectedElements.includes(element.id)}
            onDrag={handleElementDrag}
            onConnectionStart={handleConnectionStart}
            onConnectionEnd={handleConnectionEnd}
          />
        ))}
        
        {/* Render Connections */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          {connections.map(connection => (
            <CanvasConnection
              key={connection.id}
              connection={connection}
              elements={elements}
            />
          ))}
        </svg>
      </div>
      
      {/* Canvas Controls */}
      <CanvasControls />
      
      {/* Mini Map */}
      <CanvasMiniMap 
        elements={elements}
        viewport={viewport}
        className="absolute bottom-4 right-4"
      />
    </div>
  );
};

const CanvasElement: React.FC<{
  element: CanvasElement;
  isSelected: boolean;
  onDrag: (elementId: string, position: Position) => void;
  onConnectionStart: (elementId: string, point: ConnectionPoint) => void;
  onConnectionEnd: (elementId: string, point: ConnectionPoint) => void;
}> = ({ element, isSelected, onDrag, onConnectionStart, onConnectionEnd }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    
    const rect = event.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  };
  
  // Render different element types
  const renderElementContent = () => {
    switch (element.type) {
      case 'content_piece':
        return <ContentPieceElement element={element} />;
      case 'folder':
        return <FolderElement element={element} />;
      case 'chat_interface':
        return <ChatInterfaceElement element={element} />;
      default:
        return <div>Unknown Element</div>;
    }
  };
  
  return (
    <div
      className={cn(
        "absolute cursor-move transition-all duration-200",
        isSelected && "ring-2 ring-blue-500 ring-offset-2",
        isDragging && "shadow-lg scale-105"
      )}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Connection Points */}
      <ConnectionPoint
        position="left"
        onConnectionStart={() => onConnectionStart(element.id, 'left')}
        onConnectionEnd={() => onConnectionEnd(element.id, 'left')}
      />
      <ConnectionPoint
        position="right"
        onConnectionStart={() => onConnectionStart(element.id, 'right')}
        onConnectionEnd={() => onConnectionEnd(element.id, 'right')}
      />
      
      {/* Element Content */}
      {renderElementContent()}
    </div>
  );
};
```

#### Specialized Canvas Elements
```typescript
const ContentPieceElement: React.FC<{ element: CanvasElement }> = ({ element }) => {
  const contentPiece = element.data as ContentPiece;
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const { analyzeContent, analysisStatus } = useContentAnalysis();
  
  useEffect(() => {
    loadThumbnail();
  }, [contentPiece.id]);
  
  const loadThumbnail = async () => {
    try {
      const url = await getThumbnailUrl(contentPiece.id, 150);
      setThumbnailUrl(url);
    } catch (error) {
      console.error('Failed to load thumbnail:', error);
    }
  };
  
  const getContentIcon = () => {
    switch (contentPiece.content_type) {
      case 'video':
        return <Video className="w-6 h-6 text-blue-500" />;
      case 'audio':
        return <Volume2 className="w-6 h-6 text-green-500" />;
      case 'image':
        return <Image className="w-6 h-6 text-purple-500" />;
      default:
        return <File className="w-6 h-6 text-gray-500" />;
    }
  };
  
  const status = analysisStatus[contentPiece.id];
  
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 w-64 h-40">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getContentIcon()}
          <span className="text-sm font-medium text-gray-700 truncate">
            {contentPiece.title || 'Untitled'}
          </span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => analyzeContent(contentPiece.id)}>
              <Search className="w-4 h-4 mr-2" />
              Analyze
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Preview */}
      <div className="flex-1 bg-gray-50 rounded-md flex items-center justify-center mb-3">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Content preview"
            className="w-full h-20 object-cover rounded-md"
          />
        ) : (
          getContentIcon()
        )}
      </div>
      
      {/* Status */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{contentPiece.platform}</span>
        {status === 'analyzing' && (
          <div className="flex items-center space-x-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Analyzing...</span>
          </div>
        )}
        {status === 'completed' && (
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Analyzed</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ChatInterfaceElement: React.FC<{ element: CanvasElement }> = ({ element }) => {
  const chat = element.data as ChatInterface;
  const [messages, setMessages] = useState<ChatMessage[]>(chat.chat_history || []);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { generateScript } = useScriptGeneration();
  
  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    
    try {
      // Get connected content for context
      const connectedContent = getConnectedContent(chat.id);
      
      // Generate AI response
      const response = await generateChatResponse(input, connectedContent);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      toast.error('Failed to generate response');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 w-96 h-80 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">{chat.name}</h3>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {chat.ai_model_preference}
            </Badge>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(message => (
          <div
            key={message.id}
            className={cn(
              "max-w-[80%] p-3 rounded-lg text-sm",
              message.role === 'user'
                ? "bg-blue-600 text-white ml-auto"
                : "bg-gray-100 text-gray-900"
            )}
          >
            {message.content}
          </div>
        ))}
        
        {isGenerating && (
          <div className="bg-gray-100 text-gray-900 max-w-[80%] p-3 rounded-lg text-sm">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Start a conversation</p>
            <p className="text-xs mt-1">Connect content to provide context</p>
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about connected content..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isGenerating}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isGenerating}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const FolderElement: React.FC<{ element: CanvasElement }> = ({ element }) => {
  const folder = element.data as CanvasFolder;
  const [isExpanded, setIsExpanded] = useState(false);
  const [childElements, setChildElements] = useState<CanvasElement[]>([]);
  
  useEffect(() => {
    loadChildElements();
  }, [folder.id]);
  
  const loadChildElements = async () => {
    try {
      const children = await getCanvasElementsByParent(folder.id);
      setChildElements(children);
    } catch (error) {
      console.error('Failed to load child elements:', error);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 w-80">
      {/* Folder Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
          <Folder className="w-5 h-5 text-yellow-500" />
          <span className="font-medium text-gray-900">{folder.name}</span>
        </div>
        
        <Badge variant="secondary" className="text-xs">
          {childElements.length} items
        </Badge>
      </div>
      
      {/* Folder Description */}
      {folder.description && (
        <p className="text-sm text-gray-600 mb-3">{folder.description}</p>
      )}
      
      {/* Child Elements Preview */}
      {isExpanded && (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {childElements.map(child => (
            <div
              key={child.id}
              className="flex items-center space-x-2 p-2 bg-gray-50 rounded text-sm"
            >
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="truncate">{child.data.title || child.data.name}</span>
            </div>
          ))}
          
          {childElements.length === 0 && (
            <div className="text-center text-gray-400 py-4">
              <FolderOpen className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xs">Empty folder</p>
            </div>
          )}
        </div>
      )}
      
      {/* Folder Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm">
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        <span className="text-xs text-gray-500">
          {folder.color && (
            <div
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: folder.color }}
            />
          )}
        </span>
      </div>
    </div>
  );
};
```

### 3. Panel Components

#### Content Panel
```typescript
const ContentPanel: React.FC<{ project: Project }> = ({ project }) => {
  const { content, loadProjectContent, uploadFiles } = useContentStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'video' | 'image' | 'audio'>('all');
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    loadProjectContent(project.id);
  }, [project.id]);
  
  const filteredContent = content.filter(item => {
    if (filter !== 'all' && item.content_type !== filter) return false;
    if (searchTerm && !item.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  
  const handleFileDrop = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      await uploadFiles(files, project.id);
      toast.success(`Uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [project.id, uploadFiles]);
  
  return (
    <div className="p-4 space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <Input
          placeholder="Search content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        
        <div className="flex space-x-2">
          {['all', 'video', 'image', 'audio'].map(type => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type as any)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Upload Area */}
      <FileUploadArea
        onUpload={handleFileDrop}
        acceptedTypes={['image/*', 'video/*', 'audio/*']}
        bucketType="user-uploads"
        isUploading={isUploading}
      />
      
      {/* Content List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">
            Content ({filteredContent.length})
          </h3>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredContent.map(item => (
            <ContentListItem
              key={item.id}
              content={item}
              onAddToCanvas={() => addContentToCanvas(item)}
              onAnalyze={() => analyzeContent(item.id)}
            />
          ))}
          
          {filteredContent.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No content found</p>
              <p className="text-xs">Upload files or adjust filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AnalysisPanel: React.FC<{ project: Project }> = ({ project }) => {
  const { selectedElements } = useCanvasStore();
  const { analysis, generateAnalysis } = useContentAnalysis();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const selectedContent = selectedElements
    .map(id => getCanvasElementById(id))
    .filter(el => el?.type === 'content_piece')
    .map(el => el?.data as ContentPiece)
    .filter(Boolean);
  
  const runAnalysis = async () => {
    if (selectedContent.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      await Promise.all(
        selectedContent.map(content => generateAnalysis(content.id))
      );
      toast.success('Analysis completed');
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Analysis Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Content Analysis</h3>
          <Button
            onClick={runAnalysis}
            disabled={selectedContent.length === 0 || isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Analyze Selected
          </Button>
        </div>
        
        {selectedContent.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              Select content pieces to analyze them
            </p>
          </div>
        )}
      </div>
      
      {/* Analysis Results */}
      <div className="space-y-4">
        {selectedContent.map(content => {
          const contentAnalysis = analysis[content.id];
          
          return (
            <div key={content.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="font-medium text-gray-900">
                  {content.title}
                </span>
                {contentAnalysis?.status === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {contentAnalysis?.status === 'processing' && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                )}
              </div>
              
              {contentAnalysis?.status === 'completed' && (
                <div className="space-y-3">
                  {/* Transcription */}
                  {contentAnalysis.transcription && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Transcription
                      </h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {contentAnalysis.transcription.substring(0, 200)}...
                      </p>
                    </div>
                  )}
                  
                  {/* Key Points */}
                  {contentAnalysis.key_points && contentAnalysis.key_points.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Key Points
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {contentAnalysis.key_points.slice(0, 3).map((point, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Sentiment */}
                  {contentAnalysis.sentiment && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                        Sentiment
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={
                            contentAnalysis.sentiment.overall === 'positive' ? 'default' :
                            contentAnalysis.sentiment.overall === 'negative' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {contentAnalysis.sentiment.overall}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {Math.round(contentAnalysis.sentiment.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {contentAnalysis?.status === 'failed' && (
                <div className="text-sm text-red-600">
                  Analysis failed: {contentAnalysis.error}
                </div>
              )}
              
              {!contentAnalysis && (
                <div className="text-sm text-gray-500">
                  Click "Analyze Selected" to process this content
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GenerationPanel: React.FC<{ project: Project }> = ({ project }) => {
  const { selectedElements } = useCanvasStore();
  const { voiceModels, avatarModels } = useGenerationStore();
  const [generationType, setGenerationType] = useState<'script' | 'audio' | 'video'>('script');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSettings, setGenerationSettings] = useState({
    voiceModel: '',
    avatarModel: '',
    style: 'professional',
    length: 'medium'
  });
  
  const hasConnectedContent = selectedElements.some(id => {
    const element = getCanvasElementById(id);
    return element?.type === 'content_piece';
  });
  
  const startGeneration = async () => {
    if (!hasConnectedContent) return;
    
    setIsGenerating(true);
    try {
      const connectedContent = selectedElements
        .map(id => getCanvasElementById(id))
        .filter(el => el?.type === 'content_piece')
        .map(el => el?.data as ContentPiece);
      
      let result;
      switch (generationType) {
        case 'script':
          result = await generateScript(connectedContent, generationSettings);
          break;
        case 'audio':
          result = await generateAudio(connectedContent, generationSettings);
          break;
        case 'video':
          result = await generateVideo(connectedContent, generationSettings);
          break;
      }
      
      toast.success(`${generationType} generation started`);
      
    } catch (error) {
      toast.error(`${generationType} generation failed`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Generation Type */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Generate Content</h3>
        
        <div className="grid grid-cols-3 gap-2">
          {['script', 'audio', 'video'].map(type => (
            <Button
              key={type}
              variant={generationType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGenerationType(type as any)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Connected Content */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Connected Content</h4>
        {hasConnectedContent ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">
              {selectedElements.length} element(s) selected for generation
            </p>
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-700">
              Select content pieces to use as source material
            </p>
          </div>
        )}
      </div>
      
      {/* Generation Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Settings</h4>
        
        {/* Voice Model (for audio/video) */}
        {(generationType === 'audio' || generationType === 'video') && (
          <div className="space-y-2">
            <Label htmlFor="voice-model">Voice Model</Label>
            <Select
              value={generationSettings.voiceModel}
              onValueChange={(value) => 
                setGenerationSettings(prev => ({ ...prev, voiceModel: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voice model" />
              </SelectTrigger>
              <SelectContent>
                {voiceModels.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} ({model.gender}, {model.accent})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Avatar Model (for video) */}
        {generationType === 'video' && (
          <div className="space-y-2">
            <Label htmlFor="avatar-model">Avatar Model</Label>
            <Select
              value={generationSettings.avatarModel}
              onValueChange={(value) => 
                setGenerationSettings(prev => ({ ...prev, avatarModel: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select avatar model" />
              </SelectTrigger>
              <SelectContent>
                {avatarModels.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} ({model.style})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Style */}
        <div className="space-y-2">
          <Label>Style</Label>
          <div className="grid grid-cols-2 gap-2">
            {['professional', 'casual', 'energetic', 'calm'].map(style => (
              <Button
                key={style}
                variant={generationSettings.style === style ? 'default' : 'outline'}
                size="sm"
                onClick={() => 
                  setGenerationSettings(prev => ({ ...prev, style }))
                }
                className="capitalize"
              >
                {style}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Length */}
        <div className="space-y-2">
          <Label>Length</Label>
          <div className="grid grid-cols-3 gap-2">
            {['short', 'medium', 'long'].map(length => (
              <Button
                key={length}
                variant={generationSettings.length === length ? 'default' : 'outline'}
                size="sm"
                onClick={() => 
                  setGenerationSettings(prev => ({ ...prev, length }))
                }
                className="capitalize"
              >
                {length}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Generate Button */}
      <Button
        onClick={startGeneration}
        disabled={!hasConnectedContent || isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Generating {generationType}...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate {generationType}
          </>
        )}
      </Button>
    </div>
  );
};
```

## User Flow Specifications

### 1. Onboarding Flow

```typescript
const OnboardingFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { user, account } = useAuthStore();
  
  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to AICON',
      component: WelcomeStep
    },
    {
      id: 'profile-setup',
      title: 'Set Up Your Profile',
      component: ProfileSetupStep
    },
    {
      id: 'first-project',
      title: 'Create Your First Project',
      component: FirstProjectStep
    },
    {
      id: 'follow-creators',
      title: 'Follow Creators',
      component: FollowCreatorsStep
    },
    {
      id: 'canvas-tutorial',
      title: 'Learn the Canvas',
      component: CanvasTutorialStep
    }
  ];
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };
  
  const completeOnboarding = async () => {
    await updateUserPreferences({ onboardingCompleted: true });
    router.push('/dashboard');
  };
  
  const CurrentStepComponent = steps[currentStep].component;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
        </div>
        
        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {steps[currentStep].title}
          </h2>
          
          <CurrentStepComponent onNext={handleNext} />
          
          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="text-gray-500"
            >
              Skip for now
            </Button>
            
            <div className="flex space-x-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Back
                </Button>
              )}
              <Button onClick={handleNext}>
                {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual Step Components
const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  return (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <Sparkles className="w-12 h-12 text-blue-600" />
      </div>
      
      <div className="space-y-3">
        <p className="text-lg text-gray-600">
          Transform your content with AI-powered remixing and generation
        </p>
        <p className="text-gray-500">
          Upload content, analyze it with AI, and create new videos, audio, and scripts
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-2">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Upload Content</p>
          <p className="text-xs text-gray-500">Videos, audio, images</p>
        </div>
        
        <div className="space-y-2">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
            <Brain className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">AI Analysis</p>
          <p className="text-xs text-gray-500">Extract insights & data</p>
        </div>
        
        <div className="space-y-2">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto">
            <Wand2 className="w-6 h-6 text-orange-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Generate</p>
          <p className="text-xs text-gray-500">New content & remixes</p>
        </div>
      </div>
    </div>
  );
};

const ProfileSetupStep: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    website: '',
    interests: [] as string[]
  });
  
  const interests = [
    'Content Creation', 'Social Media', 'Marketing', 'Education',
    'Entertainment', 'Business', 'Technology', 'Gaming'
  ];
  
  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };
  
  const handleSubmit = async () => {
    await updateUserProfile(formData);
    onNext();
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder="How should we address you?"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio">Bio (Optional)</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Tell us about yourself..."
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="website">Website (Optional)</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            placeholder="https://yourwebsite.com"
          />
        </div>
      </div>
      
      <div className="space-y-3">
        <Label>Interests</Label>
        <div className="grid grid-cols-2 gap-2">
          {interests.map(interest => (
            <Button
              key={interest}
              variant={formData.interests.includes(interest) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleInterestToggle(interest)}
            >
              {interest}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 2. Content Creation Flow

```typescript
const ContentCreationFlow: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyze' | 'connect' | 'generate'>('upload');
  const [selectedContent, setSelectedContent] = useState<ContentPiece[]>([]);
  const { project } = useProjectStore();
  
  const steps = [
    {
      id: 'upload',
      title: 'Upload or Import Content',
      description: 'Add content to analyze and remix',
      component: UploadContentStep
    },
    {
      id: 'analyze',
      title: 'Analyze Content',
      description: 'Get AI insights on your content',
      component: AnalyzeContentStep
    },
    {
      id: 'connect',
      title: 'Connect to AI Chat',
      description: 'Create connections for context',
      component: ConnectContentStep
    },
    {
      id: 'generate',
      title: 'Generate New Content',
      description: 'Create scripts, audio, and video',
      component: GenerateContentStep
    }
  ];
  
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const CurrentStepComponent = steps[currentStepIndex].component;
  
  return (
    <div className="h-full flex flex-col">
      {/* Step Indicator */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {steps[currentStepIndex].title}
          </h2>
          <Button
            variant="ghost"
            onClick={() => setCurrentStep('upload')}
          >
            Reset Flow
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center space-x-2",
                index < currentStepIndex && "text-green-600",
                index === currentStepIndex && "text-blue-600",
                index > currentStepIndex && "text-gray-400"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                index < currentStepIndex && "bg-green-100 text-green-700",
                index === currentStepIndex && "bg-blue-100 text-blue-700",
                index > currentStepIndex && "bg-gray-100 text-gray-500"
              )}>
                {index < currentStepIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="text-sm font-medium">{step.title}</span>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 mx-2" />
              )}
            </div>
          ))}
        </div>
        
        <p className="text-sm text-gray-600 mt-2">
          {steps[currentStepIndex].description}
        </p>
      </div>
      
      {/* Step Content */}
      <div className="flex-1 p-4">
        <CurrentStepComponent
          projectId={projectId}
          selectedContent={selectedContent}
          onContentSelect={setSelectedContent}
          onNext={(nextStep) => setCurrentStep(nextStep)}
        />
      </div>
    </div>
  );
};

// Flow Step Components
const UploadContentStep: React.FC<{
  projectId: string;
  selectedContent: ContentPiece[];
  onContentSelect: (content: ContentPiece[]) => void;
  onNext: (step: string) => void;
}> = ({ projectId, selectedContent, onContentSelect, onNext }) => {
  const [uploadedFiles, setUploadedFiles] = useState<ContentPiece[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      const uploaded = await uploadFiles(files, projectId);
      setUploadedFiles(prev => [...prev, ...uploaded]);
      toast.success(`Uploaded ${files.length} file(s)`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleContentSelect = (content: ContentPiece) => {
    const isSelected = selectedContent.includes(content);
    if (isSelected) {
      onContentSelect(selectedContent.filter(c => c.id !== content.id));
    } else {
      onContentSelect([...selectedContent, content]);
    }
  };
  
  const canProceed = selectedContent.length > 0;
  
  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <FileUploadArea
        onUpload={handleFileUpload}
        acceptedTypes={['image/*', 'video/*', 'audio/*']}
        bucketType="user-uploads"
        isUploading={isUploading}
      />
      
      {/* Import Options */}
      <div className="grid grid-cols-3 gap-4">
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <Youtube className="w-6 h-6" />
          <span className="text-sm">YouTube Import</span>
        </Button>
        
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <Instagram className="w-6 h-6" />
          <span className="text-sm">Instagram Import</span>
        </Button>
        
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <Link className="w-6 h-6" />
          <span className="text-sm">URL Import</span>
        </Button>
      </div>
      
      {/* Content Selection */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Select Content to Analyze</h3>
          <div className="grid grid-cols-2 gap-3">
            {uploadedFiles.map(content => (
              <div
                key={content.id}
                className={cn(
                  "border-2 rounded-lg p-3 cursor-pointer transition-all",
                  selectedContent.includes(content)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => handleContentSelect(content)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                    {content.content_type === 'video' && <Video className="w-6 h-6" />}
                    {content.content_type === 'audio' && <Volume2 className="w-6 h-6" />}
                    {content.content_type === 'image' && <Image className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{content.title}</p>
                    <p className="text-sm text-gray-500">{content.content_type}</p>
                  </div>
                  {selectedContent.includes(content) && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Next Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => onNext('analyze')}
          disabled={!canProceed}
        >
          Continue to Analysis
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const AnalyzeContentStep: React.FC<{
  projectId: string;
  selectedContent: ContentPiece[];
  onContentSelect: (content: ContentPiece[]) => void;
  onNext: (step: string) => void;
}> = ({ projectId, selectedContent, onContentSelect, onNext }) => {
  const [analysisResults, setAnalysisResults] = useState<Record<string, ContentAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const results = await Promise.all(
        selectedContent.map(async (content) => {
          const analysis = await analyzeContent(content.id);
          return { contentId: content.id, analysis };
        })
      );
      
      const analysisMap = results.reduce((acc, { contentId, analysis }) => {
        acc[contentId] = analysis;
        return acc;
      }, {} as Record<string, ContentAnalysis>);
      
      setAnalysisResults(analysisMap);
      toast.success('Analysis completed');
    } catch (error) {
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const allAnalyzed = selectedContent.every(content => 
    analysisResults[content.id]?.status === 'completed'
  );
  
  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Content Analysis</h3>
          <p className="text-sm text-gray-600">
            AI will analyze your content to extract key insights
          </p>
        </div>
        
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing || selectedContent.length === 0}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Start Analysis
            </>
          )}
        </Button>
      </div>
      
      {/* Analysis Progress */}
      <div className="space-y-3">
        {selectedContent.map(content => {
          const analysis = analysisResults[content.id];
          
          return (
            <div key={content.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    {content.content_type === 'video' && <Video className="w-5 h-5" />}
                    {content.content_type === 'audio' && <Volume2 className="w-5 h-5" />}
                    {content.content_type === 'image' && <Image className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{content.title}</p>
                    <p className="text-sm text-gray-500">{content.content_type}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {analysis?.status === 'completed' && (
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Key Insights</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {analysis.key_points?.slice(0, 2).map((point, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {analysis.sentiment && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {analysis.sentiment.overall} sentiment
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {Math.round(analysis.sentiment.confidence * 100)}% confidence
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {analysis?.status === 'failed' && (
                <div className="text-sm text-red-600">
                  Analysis failed: {analysis.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => onNext('upload')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Upload
        </Button>
        
        <Button
          onClick={() => onNext('connect')}
          disabled={!allAnalyzed}
        >
          Continue to Connect
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const ConnectContentStep: React.FC<{
  projectId: string;
  selectedContent: ContentPiece[];
  onContentSelect: (content: ContentPiece[]) => void;
  onNext: (step: string) => void;
}> = ({ projectId, selectedContent, onContentSelect, onNext }) => {
  const [chatName, setChatName] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4');
  const [isCreating, setIsCreating] = useState(false);
  
  const createChatInterface = async () => {
    setIsCreating(true);
    try {
      const chatInterface = await createChat({
        name: chatName || 'Content Analysis Chat',
        ai_model_preference: aiModel,
        project_id: projectId,
        connected_content: selectedContent.map(c => c.id)
      });
      
      // Add chat to canvas
      await addElementToCanvas({
        type: 'chat_interface',
        data: chatInterface,
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 }
      });
      
      toast.success('Chat interface created');
      onNext('generate');
    } catch (error) {
      toast.error('Failed to create chat interface');
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Connected Content Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Ready to Connect</h3>
        <p className="text-sm text-blue-700 mb-3">
          {selectedContent.length} content piece(s) analyzed and ready for AI interaction
        </p>
        
        <div className="space-y-2">
          {selectedContent.map(content => (
            <div key={content.id} className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800">{content.title}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Chat Configuration */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Configure AI Chat</h3>
        
        <div className="space-y-2">
          <Label htmlFor="chat-name">Chat Name</Label>
          <Input
            id="chat-name"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="Content Analysis Chat"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="ai-model">AI Model</Label>
          <Select value={aiModel} onValueChange={setAiModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4">GPT-4 (Best quality)</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 (Fast & efficient)</SelectItem>
              <SelectItem value="claude-3">Claude 3 (Great for analysis)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Preview */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Chat Preview</h4>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">AI Assistant</p>
              <p className="text-sm text-gray-600 mt-1">
                I've analyzed your {selectedContent.length} content piece(s). 
                Ask me anything about the key themes, sentiment, or specific details!
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
            <Input
              placeholder="Ask about your content..."
              className="flex-1"
              disabled
            />
            <Button size="sm" disabled>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => onNext('analyze')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Analysis
        </Button>
        
        <Button
          onClick={createChatInterface}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Creating Chat...
            </>
          ) : (
            <>
              Create Chat Interface
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const GenerateContentStep: React.FC<{
  projectId: string;
  selectedContent: ContentPiece[];
  onContentSelect: (content: ContentPiece[]) => void;
  onNext: (step: string) => void;
}> = ({ projectId, selectedContent, onContentSelect, onNext }) => {
  const [generationType, setGenerationType] = useState<'script' | 'audio' | 'video'>('script');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSettings, setGenerationSettings] = useState({
    style: 'professional',
    length: 'medium',
    voice_model: '',
    avatar_model: ''
  });
  
  const startGeneration = async () => {
    setIsGenerating(true);
    try {
      let result;
      switch (generationType) {
        case 'script':
          result = await generateScript(selectedContent, generationSettings);
          break;
        case 'audio':
          result = await generateAudio(selectedContent, generationSettings);
          break;
        case 'video':
          result = await generateVideo(selectedContent, generationSettings);
          break;
      }
      
      toast.success(`${generationType} generation started`);
      
      // Navigate to canvas to see the result
      router.push(`/projects/${projectId}/canvas`);
      
    } catch (error) {
      toast.error(`${generationType} generation failed`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Generation Type Selection */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Choose Generation Type</h3>
        
        <div className="grid grid-cols-3 gap-4">
          {[
            { type: 'script', icon: FileText, label: 'Script', description: 'Generate written content' },
            { type: 'audio', icon: Volume2, label: 'Audio', description: 'Create voiceover' },
            { type: 'video', icon: Video, label: 'Video', description: 'Full video production' }
          ].map(({ type, icon: Icon, label, description }) => (
            <div
              key={type}
              className={cn(
                "border-2 rounded-lg p-4 cursor-pointer transition-all",
                generationType === type
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => setGenerationType(type as any)}
            >
              <div className="text-center space-y-2">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mx-auto",
                  generationType === type ? "bg-blue-100" : "bg-gray-100"
                )}>
                  <Icon className={cn(
                    "w-6 h-6",
                    generationType === type ? "text-blue-600" : "text-gray-600"
                  )} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Generation Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Generation Settings</h4>
        
        {/* Style */}
        <div className="space-y-2">
          <Label>Style</Label>
          <div className="grid grid-cols-4 gap-2">
            {['professional', 'casual', 'energetic', 'educational'].map(style => (
              <Button
                key={style}
                variant={generationSettings.style === style ? 'default' : 'outline'}
                size="sm"
                onClick={() => 
                  setGenerationSettings(prev => ({ ...prev, style }))
                }
                className="capitalize"
              >
                {style}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Length */}
        <div className="space-y-2">
          <Label>Length</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'short', label: 'Short (30s-1m)' },
              { value: 'medium', label: 'Medium (1-3m)' },
              { value: 'long', label: 'Long (3-5m)' }
            ].map(({ value, label }) => (
              <Button
                key={value}
                variant={generationSettings.length === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => 
                  setGenerationSettings(prev => ({ ...prev, length: value }))
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Voice Model (for audio/video) */}
        {(generationType === 'audio' || generationType === 'video') && (
          <div className="space-y-2">
            <Label>Voice Model</Label>
            <Select
              value={generationSettings.voice_model}
              onValueChange={(value) => 
                setGenerationSettings(prev => ({ ...prev, voice_model: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voice model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voice-1">Sarah (Female, Professional)</SelectItem>
                <SelectItem value="voice-2">Mike (Male, Energetic)</SelectItem>
                <SelectItem value="voice-3">Emma (Female, Casual)</SelectItem>
                <SelectItem value="voice-4">David (Male, Authoritative)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Avatar Model (for video) */}
        {generationType === 'video' && (
          <div className="space-y-2">
            <Label>Avatar Model</Label>
            <Select
              value={generationSettings.avatar_model}
              onValueChange={(value) => 
                setGenerationSettings(prev => ({ ...prev, avatar_model: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select avatar model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avatar-1">Alex (Professional)</SelectItem>
                <SelectItem value="avatar-2">Jordan (Casual)</SelectItem>
                <SelectItem value="avatar-3">Taylor (Energetic)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      {/* Content Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-900 mb-2">Source Content</h4>
        <p className="text-sm text-green-700 mb-2">
          Your {generationType} will be generated based on:
        </p>
        <ul className="text-sm text-green-700 space-y-1">
          {selectedContent.map(content => (
            <li key={content.id} className="flex items-center space-x-2">
              <div className="w-1 h-1 bg-green-500 rounded-full" />
              <span>{content.title}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Generate Button */}
      <Button
        onClick={startGeneration}
        disabled={isGenerating}
        className="w-full h-12"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Generating {generationType}...
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5 mr-2" />
            Generate {generationType.charAt(0).toUpperCase() + generationType.slice(1)}
          </>
        )}
      </Button>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => onNext('connect')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Connect
        </Button>
        
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${projectId}/canvas`)}
        >
          Go to Canvas
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
```

## Real-time Features

### 1. Live Collaboration

```typescript
const useRealtimeCollaboration = (projectId: string) => {
  const [collaborators, setCollaborators] = useState<ActiveCollaborator[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  
  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`project:${projectId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = supabase.getChannels()[0].presenceState();
        setCollaborators(Object.values(state).flat());
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
        setCursors(prev => ({
          ...prev,
          [payload.userId]: payload.position
        }));
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [projectId]);
  
  const broadcastCursorMove = useCallback((position: CursorPosition) => {
    supabase.channel(`project:${projectId}`).send({
      type: 'broadcast',
      event: 'cursor-move',
      payload: { userId: 'current-user', position }
    });
  }, [projectId]);
  
  return {
    collaborators,
    cursors,
    broadcastCursorMove
  };
};

const CollaboratorCursors: React.FC<{ cursors: Record<string, CursorPosition> }> = ({ cursors }) => {
  return (
    <>
      {Object.entries(cursors).map(([userId, position]) => (
        <div
          key={userId}
          className="absolute pointer-events-none z-50"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="relative">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
            <div className="absolute top-5 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {position.userName}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
```

### 2. Processing Status Updates

```typescript
const useProcessingStatusSSE = () => {
  const [processingJobs, setProcessingJobs] = useState<Record<string, ProcessingJob>>({});
  
  useEffect(() => {
    const eventSource = new EventSource('/api/processing/stream');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      setProcessingJobs(prev => ({
        ...prev,
        [data.jobId]: data
      }));
      
      // Show notifications for completed jobs
      if (data.status === 'completed') {
        toast.success(`${data.jobType} completed successfully`);
      } else if (data.status === 'failed') {
        toast.error(`${data.jobType} failed: ${data.error}`);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
    
    return () => {
      eventSource.close();
    };
  }, []);
  
  return processingJobs;
};

const ProcessingStatusBar: React.FC = () => {
  const processingJobs = useProcessingStatusSSE();
  
  const activeJobs = Object.values(processingJobs).filter(
    job => job.status === 'processing' || job.status === 'queued'
  );
  
  if (activeJobs.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">
          Processing Jobs ({activeJobs.length})
        </h3>
        <Button variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        {activeJobs.slice(0, 3).map(job => (
          <div key={job.id} className="flex items-center space-x-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {job.jobType.replace('_', ' ').toUpperCase()}
              </p>
              <div className="flex items-center space-x-2">
                <Progress value={job.progress || 0} className="flex-1 h-1" />
                <span className="text-xs text-gray-500">
                  {job.progress || 0}%
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
        
        {activeJobs.length > 3 && (
          <p className="text-xs text-gray-500 text-center">
            +{activeJobs.length - 3} more jobs processing...
          </p>
        )}
      </div>
    </div>
  );
};
```

## State Management Implementation

### 1. Store Definitions

```typescript
// Auth Store
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  account: null,
  permissions: {},
  isAuthenticated: false,
  
  login: async (credentials) => {
    try {
      const { user, account } = await authAPI.login(credentials);
      set({ user, account, isAuthenticated: true });
      return { user, account };
    } catch (error) {
      throw error;
    }
  },
  
  logout: async () => {
    await authAPI.logout();
    set({ user: null, account: null, isAuthenticated: false });
  },
  
  updateProfile: async (data) => {
    const updatedUser = await userAPI.updateProfile(data);
    set({ user: updatedUser });
  }
}));

// Canvas Store
export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  connections: [],
  selectedElements: [],
  viewport: { zoom: 1, offsetX: 0, offsetY: 0 },
  mode: 'select',
  
  addElement: (element) => {
    const newElement = {
      ...element,
      id: generateId(),
      created_at: new Date().toISOString()
    };
    set(state => ({
      elements: [...state.elements, newElement]
    }));
  },
  
  updateElement: (id, updates) => {
    set(state => ({
      elements: state.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      )
    }));
  },
  
  deleteElement: (id) => {
    set(state => ({
      elements: state.elements.filter(el => el.id !== id),
      connections: state.connections.filter(
        conn => conn.source.elementId !== id && conn.target.elementId !== id
      )
    }));
  },
  
  createConnection: (connection) => {
    const newConnection = {
      ...connection,
      id: generateId(),
      created_at: new Date().toISOString()
    };
    set(state => ({
      connections: [...state.connections, newConnection]
    }));
  },
  
  setViewport: (viewport) => {
    set({ viewport });
  },
  
  setMode: (mode) => {
    set({ mode });
  },
  
  selectElements: (elementIds) => {
    set({ selectedElements: elementIds });
  }
}));

// Content Store
export const useContentStore = create<ContentState>((set, get) => ({
  pieces: [],
  folders: [],
  analysis: {},
  processingStatus: {},
  
  loadProjectContent: async (projectId) => {
    const content = await contentAPI.getProjectContent(projectId);
    set({ pieces: content });
  },
  
  uploadFiles: async (files, projectId) => {
    const uploadedContent = [];
    
    for (const file of files) {
      try {
        const content = await contentAPI.uploadFile(file, projectId);
        uploadedContent.push(content);
      } catch (error) {
        console.error('Upload failed for file:', file.name, error);
      }
    }
    
    set(state => ({
      pieces: [...state.pieces, ...uploadedContent]
    }));
    
    return uploadedContent;
  },
  
  analyzeContent: async (contentId) => {
    set(state => ({
      processingStatus: {
        ...state.processingStatus,
        [contentId]: { status: 'processing' }
      }
    }));
    
    try {
      const analysis = await aiAPI.analyzeContent(contentId);
      set(state => ({
        analysis: { ...state.analysis, [contentId]: analysis },
        processingStatus: {
          ...state.processingStatus,
          [contentId]: { status: 'completed' }
        }
      }));
    } catch (error) {
      set(state => ({
        processingStatus: {
          ...state.processingStatus,
          [contentId]: { status: 'failed', error: error.message }
        }
      }));
    }
  }
}));
```

### 2. Custom Hooks

```typescript
// Canvas interaction hooks
export const useCanvasInteraction = () => {
  const { 
    elements, 
    selectedElements, 
    mode, 
    addElement, 
    updateElement, 
    selectElements 
  } = useCanvasStore();
  
  const handleElementClick = useCallback((elementId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      const newSelection = selectedElements.includes(elementId)
        ? selectedElements.filter(id => id !== elementId)
        : [...selectedElements, elementId];
      selectElements(newSelection);
    } else {
      // Single select
      selectElements([elementId]);
    }
  }, [selectedElements, selectElements]);
  
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      selectElements([]);
    }
  }, [selectElements]);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' && selectedElements.length > 0) {
      selectedElements.forEach(id => deleteElement(id));
    }
    
    if (event.key === 'Escape') {
      selectElements([]);
    }
  }, [selectedElements]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return {
    handleElementClick,
    handleCanvasClick
  };
};

// File upload hook
export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  const uploadFiles = useCallback(async (files: File[], projectId: string) => {
    setIsUploading(true);
    const results = [];
    
    try {
      for (const file of files) {
        const fileId = generateId();
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        const result = await fileAPI.uploadFile(file, {
          projectId,
          onProgress: (progress) => {
            setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
          }
        });
        
        results.push(result);
        setUploadProgress(prev => {
          const { [fileId]: _, ...rest } = prev;
          return rest;
        });
      }
      
      return results;
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  }, []);
  
  return {
    uploadFiles,
    isUploading,
    uploadProgress
  };
};
```

## Performance Optimizations

### 1. Canvas Virtualization

```typescript
const VirtualizedCanvas: React.FC<{ elements: CanvasElement[] }> = ({ elements }) => {
  const [visibleElements, setVisibleElements] = useState<CanvasElement[]>([]);
  const { viewport } = useCanvasStore();
  
  useEffect(() => {
    // Calculate visible area with buffer
    const viewportBounds = {
      left: -viewport.offsetX - 200,
      top: -viewport.offsetY - 200,
      right: (-viewport.offsetX + window.innerWidth) / viewport.zoom + 200,
      bottom: (-viewport.offsetY + window.innerHeight) / viewport.zoom + 200
    };
    
    // Filter elements that intersect with viewport
    const visible = elements.filter(element => {
      const elementBounds = {
        left: element.position.x,
        top: element.position.y,
        right: element.position.x + element.size.width,
        bottom: element.position.y + element.size.height
      };
      
      return !(
        elementBounds.right < viewportBounds.left ||
        elementBounds.left > viewportBounds.right ||
        elementBounds.bottom < viewportBounds.top ||
        elementBounds.top > viewportBounds.bottom
      );
    });
    
    setVisibleElements(visible);
  }, [elements, viewport]);
  
  return (
    <>
      {visibleElements.map(element => (
        <CanvasElement key={element.id} element={element} />
      ))}
    </>
  );
};
```

### 2. Memoization and Optimization

```typescript
// Memoized components
const MemoizedCanvasElement = React.memo<CanvasElementProps>(
  ({ element, isSelected, onDrag, onConnectionStart, onConnectionEnd }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    return (
      prevProps.element.id === nextProps.element.id &&
      prevProps.isSelected === nextProps.isSelected &&
      JSON.stringify(prevProps.element.position) === JSON.stringify(nextProps.element.position) &&
      JSON.stringify(prevProps.element.size) === JSON.stringify(nextProps.element.size)
    );
  }
);

// Debounced operations
export const useDebouncedCanvasUpdate = () => {
  const updateElement = useCanvasStore(state => state.updateElement);
  
  const debouncedUpdate = useCallback(
    debounce((elementId: string, updates: Partial<CanvasElement>) => {
      updateElement(elementId, updates);
    }, 100),
    [updateElement]
  );
  
  return debouncedUpdate;
};
```

## Error Handling and Loading States

```typescript
// Error boundary for canvas
class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Canvas error:', error, errorInfo);
    // Log to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Canvas Error</h3>
              <p className="text-gray-600">Something went wrong with the canvas</p>
            </div>
            <Button onClick={() => this.setState({ hasError: false })}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Loading states
const ProjectLoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="text-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
      <div>
        <h3 className="text-lg font-medium text-gray-900">Loading Project</h3>
        <p className="text-gray-600">Setting up your workspace...</p>
      </div>
    </div>
  </div>
);
```

## Testing Strategy

### 1. Component Testing

```typescript
// Canvas component tests
describe('CanvasWorkspace', () => {
  it('should render elements correctly', () => {
    const mockElements = [
      { id: '1', type: 'content_piece', position: { x: 0, y: 0 }, size: { width: 200, height: 150 } }
    ];
    
    render(<CanvasWorkspace elements={mockElements} />);
    
    expect(screen.getByTestId('canvas-element-1')).toBeInTheDocument();
  });
  
  it('should handle element drag', () => {
    const onDrag = jest.fn();
    render(<CanvasElement element={mockElement} onDrag={onDrag} />);
    
    fireEvent.mouseDown(screen.getByTestId('canvas-element'));
    fireEvent.mouseMove(document, { clientX: 100, clientY: 100 });
    
    expect(onDrag).toHaveBeenCalled();
  });
});
```

### 2. Store Testing

```typescript
// Canvas store tests
describe('useCanvasStore', () => {
  beforeEach(() => {
    useCanvasStore.setState({ elements: [], connections: [] });
  });
  
  it('should add elements correctly', () => {
    const { addElement } = useCanvasStore.getState();
    
    addElement({
      type: 'content_piece',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 150 }
    });
    
    const { elements } = useCanvasStore.getState();
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('content_piece');
  });
});
```

## Deployment Configuration

### 1. Environment Setup

```typescript
// Environment variables
export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    timeout: 30000
  },
  
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  },
  
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!
  },
  
  storage: {
    buckets: {
      userUploads: 'user-uploads',
      generated: 'generated-content',
      avatars: 'avatars'
    }
  },
  
  features: {
    realTimeCollaboration: process.env.ENABLE_REALTIME === 'true',
    aiGeneration: process.env.ENABLE_AI_GENERATION === 'true'
  }
};
```

This completes the comprehensive component architecture and user flows specification for AICON v3. The document covers all major aspects of the frontend implementation, from basic components to complex user flows, state management, real-time features, and performance optimizations.d' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {analysis?.status === 'processing' && (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  )}
                  {!analysis && (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              
              {analysis?.status === 'complete