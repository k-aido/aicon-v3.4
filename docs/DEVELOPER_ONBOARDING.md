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
