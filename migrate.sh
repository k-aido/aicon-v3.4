#!/bin/bash

# AICON v3.4 - Cursor to GitHub Migration Script
# This script migrates your working Cursor codebase to GitHub

echo "🚀 Migrating AICON Canvas from Cursor to GitHub..."

# Check if we're in the GitHub repository
if [ ! -d ".git" ]; then
    echo "❌ Please run this script from your GitHub repository directory"
    echo "First clone your repository:"
    echo "   git clone https://github.com/yourusername/aicon-v3.4.git"
    echo "   cd aicon-v3.4"
    exit 1
fi

# Ask for the path to the Cursor project
read -p "📁 Enter the full path to your Cursor project folder (the one containing 'aicon-canvas'): " CURSOR_PATH

# Verify the path exists
if [ ! -d "$CURSOR_PATH" ]; then
    echo "❌ Directory not found: $CURSOR_PATH"
    exit 1
fi

# Check if aicon-canvas folder exists
if [ ! -d "$CURSOR_PATH/aicon-canvas" ]; then
    echo "❌ aicon-canvas folder not found in $CURSOR_PATH"
    echo "Please provide the path to the folder that contains 'aicon-canvas'"
    exit 1
fi

echo "✅ Found Cursor project at: $CURSOR_PATH"

# Create the professional folder structure
echo "📂 Creating professional project structure..."
mkdir -p frontend
mkdir -p docs
mkdir -p backend/api
mkdir -p database/migrations
mkdir -p sample-data
mkdir -p scripts
mkdir -p .github/ISSUE_TEMPLATE
mkdir -p .github/workflows

# Copy your working code to frontend folder
echo "📋 Copying your working aicon-canvas code..."
cp -r "$CURSOR_PATH/aicon-canvas"/* frontend/

# Copy documentation files
echo "📚 Copying technical specifications..."
if [ -d "$CURSOR_PATH/Context MD Files" ]; then
    cp "$CURSOR_PATH/Context MD Files"/*.md docs/
    
    # Rename the files to be more descriptive
    if [ -f "docs/01_database_schema.md" ]; then
        mv "docs/01_database_schema.md" "docs/DATABASE_SCHEMA.md"
    fi
    if [ -f "docs/02_authentication_system.md" ]; then
        mv "docs/02_authentication_system.md" "docs/AUTHENTICATION_SYSTEM.md"
    fi
    if [ -f "docs/03_api_integrations.md" ]; then
        mv "docs/03_api_integrations.md" "docs/API_INTEGRATIONS.md"
    fi
    if [ -f "docs/04_file_management_system.md" ]; then
        mv "docs/04_file_management_system.md" "docs/FILE_MANAGEMENT.md"
    fi
    if [ -f "docs/05_component_architecture_user_flows.md" ]; then
        mv "docs/05_component_architecture_user_flows.md" "docs/COMPONENT_ARCHITECTURE.md"
    fi
    if [ -f "docs/06_security_compliance.md" ]; then
        mv "docs/06_security_compliance.md" "docs/SECURITY_COMPLIANCE.md"
    fi
fi

# Create comprehensive README
echo "📝 Creating project README..."
cat > README.md << 'EOF'
# AICON v3.4 - AI Content Creation Platform

> **Status: Working Prototype** 🚀  
> Canvas functionality, content components, and zoom features are operational

## 🎯 What's Built & Working

✅ **Interactive Canvas** - Drag, drop, zoom in/out functionality  
✅ **Content Components** - Built with React and TypeScript  
✅ **Professional UI** - Tailwind CSS styling  
✅ **Next.js Foundation** - Modern web app structure  

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS + PostCSS
- **Components**: Custom React components
- **Canvas**: Interactive zoom and content management

## 📁 Project Structure

```
aicon-v3.4/
├── frontend/              # 🔥 Your working Next.js application
│   ├── src/              # Source code with canvas & components
│   ├── package.json      # Dependencies and scripts
│   ├── next.config.ts    # Next.js configuration
│   └── tailwind.config.js # Styling configuration
├── docs/                 # 📋 Complete technical specifications
├── backend/              # 🔜 Future API development
├── database/             # 🔜 Database setup (schemas included in docs)
└── sample-data/          # 🔜 Demo content
```

## 🚀 Quick Start for Developers

### 1. Setup Development Environment
```bash
# Clone the repository
git clone https://github.com/yourusername/aicon-v3.4.git
cd aicon-v3.4

# Navigate to working frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. View the Working Application
- Open http://localhost:3000
- Test the canvas zoom functionality
- Explore the content components

### 3. Read the Documentation
- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete data structure
- [Authentication System](docs/AUTHENTICATION_SYSTEM.md) - User management
- [API Integrations](docs/API_INTEGRATIONS.md) - AI services integration
- [Component Architecture](docs/COMPONENT_ARCHITECTURE.md) - Frontend structure
- [File Management](docs/FILE_MANAGEMENT.md) - File handling system
- [Security & Compliance](docs/SECURITY_COMPLIANCE.md) - Security measures

## 🔧 Current Development Status

### ✅ Completed Features
- Interactive canvas with zoom controls
- Content component system
- Responsive UI with Tailwind CSS
- TypeScript setup and configuration
- Next.js project structure

### 🔄 In Development
- AI service integrations (OpenAI, Anthropic, ElevenLabs)
- User authentication system
- Database connectivity
- File upload and management
- Real-time collaboration features

### 📋 Next Development Priorities
1. **Backend API Development** - Connect to Supabase database
2. **AI Integration** - Implement content analysis features
3. **User Authentication** - Add login/signup functionality
4. **File Management** - Enable content uploads
5. **Advanced Canvas Features** - Multi-user collaboration

## 🛠️ Technology Stack

**Current Implementation:**
- Next.js 14 (React framework)
- TypeScript (type safety)
- Tailwind CSS (styling)
- PostCSS (CSS processing)

**Planned Integration:**
- Supabase (database & authentication)
- OpenAI/Anthropic (AI analysis)
- ElevenLabs (voice generation)
- HeyGen (avatar videos)
- Redis (caching & rate limiting)

## 📱 Features Overview

### Canvas System
The heart of AICON - a visual workspace where users:
- Create project canvases
- Drag and drop content elements
- Zoom in/out for detailed work
- Connect related content pieces

### Content Management
- Upload videos, images, and audio
- AI-powered content analysis
- Organize content in visual folders
- Generate insights and summaries

### AI Generation (Planned)
- Transform content into new formats
- Generate scripts from video analysis
- Create voice-overs with custom voices
- Produce avatar videos

## 🤝 Contributing

### For New Developers
1. **Start with the working code** in `/frontend/`
2. **Read the technical docs** in `/docs/`
3. **Test the current features** to understand the vision
4. **Pick a development priority** from the roadmap above

### Development Workflow
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes in the appropriate folder
3. Test your changes: `npm run dev`
4. Commit with clear messages
5. Push and create a pull request

## 📞 Support

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Questions**: Check the documentation first, then ask in Discussions
- **Emergency**: Contact the project owner directly

---

**Ready to build the future of AI-powered content creation? Let's go! 🚀**
EOF

# Create developer onboarding specifically for your project
echo "👨‍💻 Creating developer onboarding guide..."
cat > docs/DEVELOPER_ONBOARDING.md << 'EOF'
# Developer Onboarding - AICON v3.4

Welcome! You're joining a project with **working code** and a clear vision.

## 🎯 What You're Building

AICON v3.4 is "Figma for content creators" - a visual canvas where users:
1. Upload videos/images/audio
2. Analyze content with AI
3. Generate new content (scripts, voices, videos)
4. Collaborate visually on projects

## 💻 Your Development Environment

### Current Working Code
The `/frontend/` folder contains a **fully functional** Next.js application with:
- ✅ Interactive canvas with zoom
- ✅ Content components
- ✅ TypeScript setup
- ✅ Tailwind CSS styling

### Technical Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind
- **Planned Backend**: Supabase (PostgreSQL)
- **Planned AI**: OpenAI, Anthropic, ElevenLabs, HeyGen

## 🚀 Getting Started (30 minutes)

### Step 1: Run the Working Code (10 min)
```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:3000
```

**Test these features:**
- Canvas zoom in/out
- Content components display
- Responsive design

### Step 2: Explore the Codebase (10 min)
```bash
# Key files to understand:
frontend/src/           # Main source code
frontend/package.json   # Dependencies
frontend/next.config.ts # Configuration
```

### Step 3: Read Documentation (10 min)
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Data structure
- [COMPONENT_ARCHITECTURE.md](COMPONENT_ARCHITECTURE.md) - UI structure
- [API_INTEGRATIONS.md](API_INTEGRATIONS.md) - AI services plan

## 🎯 Development Priorities

### Week 1: Understand & Extend
1. **Get familiar** with existing canvas code
2. **Identify** what components need backend data
3. **Plan** database integration approach
4. **Start** with simple API connections

### Week 2-3: Backend Foundation
1. **Set up** Supabase database
2. **Implement** user authentication
3. **Create** file upload system
4. **Build** basic API routes

### Week 4+: AI Integration
1. **Connect** OpenAI for content analysis
2. **Add** script generation features
3. **Integrate** voice/video generation
4. **Build** collaboration features

## 🔧 Code Organization

### What's Already Built
```
frontend/src/
├── components/     # Canvas & content components
├── pages/         # Next.js pages
├── styles/        # Tailwind CSS
└── lib/          # Utilities
```

### What You'll Add
```
backend/
├── api/          # API endpoints
├── database/     # DB connection & models
├── services/     # Business logic
└── middleware/   # Authentication, etc.
```

## 🤝 Working with the Project Owner

### Communication
- **GitHub Issues** for features and bugs
- **Pull Requests** for code review
- **Regular check-ins** on progress

### What They Provide
- ✅ Complete technical specifications
- ✅ Working frontend foundation
- ✅ Clear feature requirements
- ✅ AI service accounts & API keys

### What They Need From You
- Regular progress updates
- Questions when you're stuck
- Clean, documented code
- Working features they can test

## 🚨 Important Notes

### API Keys & Security
- **Never commit** API keys to GitHub
- **Use environment variables** for all secrets
- **Ask for credentials** for AI services

### Code Quality
- **Follow existing patterns** in the frontend code
- **Use TypeScript** for all new code
- **Write clear commit messages**
- **Test features** before submitting

### Development Philosophy
- **Build on what works** (the canvas is solid)
- **Add features incrementally**
- **Keep the UI/UX vision intact**
- **Focus on user experience**

## 🎉 You're Ready!

The foundation is solid, the vision is clear, and the working code gives you a great starting point. Let's build something amazing! 🚀
EOF

# Create GitHub issue templates
echo "🐛 Creating GitHub templates..."
cat > .github/ISSUE_TEMPLATE/bug_report.md << 'EOF'
---
name: 🐛 Bug Report
about: Report a bug in the AICON platform
title: '[BUG] '
labels: bug
assignees: ''
---

## 🐛 Bug Description
A clear description of what the bug is.

## 🔄 Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. See error

## ✅ Expected Behavior
What you expected to happen.

## 📱 Environment
- Browser: [e.g. Chrome, Safari]
- Device: [e.g. Desktop, iPhone]
- Canvas Feature: [e.g. zoom, drag-drop]

## 📸 Screenshots
If applicable, add screenshots to help explain the problem.
EOF

cat > .github/ISSUE_TEMPLATE/feature_request.md << 'EOF'
---
name: ✨ Feature Request
about: Suggest a new feature for AICON
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## ✨ Feature Description
A clear description of what you want to happen.

## 🎯 Problem It Solves
What problem does this feature solve for users?

## 💡 Proposed Solution
How should this feature work?

## 🔄 Alternative Solutions
Other ways we could solve this problem.

## 📋 Additional Context
Any other context or screenshots about the feature.
EOF

# Create pull request template
cat > .github/PULL_REQUEST_TEMPLATE.md << 'EOF'
## 📋 Description
Brief description of changes made.

## 🔧 Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💥 Breaking change
- [ ] 📝 Documentation update
- [ ] 🎨 UI/Canvas improvement

## ✅ Testing
- [ ] Tested locally in development
- [ ] Canvas functionality works
- [ ] No console errors
- [ ] Mobile responsive (if UI changes)

## 📸 Screenshots (if applicable)
Add screenshots of your changes, especially for UI updates.

## 📋 Checklist
- [ ] Code follows existing patterns
- [ ] TypeScript types are correct
- [ ] No sensitive data committed
- [ ] Self-review completed
EOF

# Create environment template
echo "🔐 Creating environment template..."
cat > .env.example << 'EOF'
# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Supabase)
DATABASE_URL=your_supabase_database_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Services (ask project owner for these)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
HEYGEN_API_KEY=your_heygen_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# Security
NEXTAUTH_SECRET=your_nextauth_secret
ENCRYPTION_PASSPHRASE=your_encryption_passphrase_32_chars_min
ENCRYPTION_SALT=your_encryption_salt_16_chars_min

# Redis (for rate limiting)
REDIS_URL=your_redis_url

# Development
NODE_ENV=development
EOF

# Create project setup script
echo "⚡ Creating setup script for developers..."
mkdir -p scripts
cat > scripts/setup.sh << 'EOF'
#!/bin/bash

echo "🚀 Setting up AICON v3.4 development environment..."

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Please run this from the project root directory"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Copy environment file
if [ ! -f ".env.local" ]; then
    echo "🔐 Creating environment file..."
    cp ../.env.example .env.local
    echo "⚠️  Please update .env.local with actual values"
fi

# Start development server
echo "🚀 Starting development server..."
echo "Visit http://localhost:3000 to see your working canvas!"
npm run dev
EOF

chmod +x scripts/setup.sh

# Create gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "🙈 Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.npm
.yarn/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Next.js
.next/
out/
build/

# Database
*.db
*.sqlite

# Logs
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Temporary
tmp/
temp/
EOF
fi

# Copy package.json to root if it doesn't exist
if [ ! -f "package.json" ]; then
    echo "📦 Creating root package.json..."
    cat > package.json << 'EOF'
{
  "name": "aicon-v3.4",
  "version": "1.0.0",
  "description": "AI-powered content creation platform with working canvas",
  "private": true,
  "scripts": {
    "dev": "cd frontend && npm run dev",
    "build": "cd frontend && npm run build",
    "start": "cd frontend && npm run start",
    "setup": "bash scripts/setup.sh",
    "test": "cd frontend && npm run test"
  },
  "keywords": ["ai", "content", "canvas", "next.js"],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/aicon-v3.4.git"
  }
}
EOF
fi

echo ""
echo "🎉 Migration Complete!"
echo ""
echo "📁 Your working code is now in: ./frontend/"
echo "📚 Your documentation is in: ./docs/"
echo "🔧 Developer setup script: ./scripts/setup.sh"
echo ""
echo "✅ Next steps:"
echo "1. Check that your code copied correctly: ls frontend/"
echo "2. Commit and push: git add . && git commit -m 'Migrate working canvas from Cursor'"
echo "3. Test the setup: cd frontend && npm run dev"
echo "4. Share repository with your developer"
echo ""
echo "🚀 Your developer can now run: npm run setup"
