# User Onboarding Flow Documentation

## Overview

The AICON user onboarding system provides a comprehensive introduction to the social media analysis toolkit through an interactive tutorial and guided experience.

## Components

### 1. Welcome Modal (`WelcomeModal.tsx`)

**Purpose**: Introduces new users to AICON's capabilities through a multi-slide presentation.

**Features**:
- 4-slide carousel explaining key features
- Visual icons for each feature category
- Progress indicator
- Skip option for experienced users

**Slides**:
1. **Welcome**: Overview of AICON's capabilities
2. **Drag & Drop**: Content analysis workflow
3. **AI Insights**: Analysis features
4. **Organization**: Canvas management tools

### 2. Interactive Tutorial (`InteractiveTutorial.tsx`)

**Purpose**: Hands-on walkthrough of core features with step-by-step guidance.

**Tutorial Steps**:
1. **Paste URL**: Add first social media content
2. **Drag Element**: Organize canvas workspace
3. **Analyze Content**: Use AI analysis features
4. **Create Folder**: Organize content collections
5. **Connect Elements**: Create visual relationships
6. **Open Chat**: Access AI assistant

**Features**:
- Real-time progress tracking
- Automatic step completion detection
- Visual indicators for current step
- Skip option available

### 3. Sample Content Library (`SampleContent.tsx`)

**Purpose**: Provides pre-selected popular content for users to experiment with.

**Content Categories**:
- Music videos
- Entertainment/Comedy
- Lifestyle content
- Food & recipes

**Sample Platforms**:
- YouTube
- TikTok
- Instagram

### 4. Help Menu (`HelpMenu.tsx`)

**Purpose**: Always-available help resources and documentation.

**Resources**:
- Restart tutorial option
- Access to sample content
- Keyboard shortcuts reference
- Support contact information
- Link to documentation

**Quick Tips**:
- Keyboard shortcuts guide
- Pro tips for advanced features

### 5. Onboarding Flow Controller (`OnboardingFlow.tsx`)

**Purpose**: Manages the overall onboarding experience and persistence.

**Features**:
- Automatic detection of new users
- Progress persistence in localStorage
- Success confirmation message
- Integration with main application

## Implementation Details

### Storage

**LocalStorage Keys**:
- `aicon_has_visited`: Tracks if user has visited before
- `aicon_onboarding_completed`: Marks tutorial completion

### User Flow

1. **New User Detection**
   - Check localStorage for previous visits
   - Show welcome modal for new users

2. **Tutorial Progression**
   - Welcome modal → Interactive tutorial
   - Sample content panel opens with tutorial
   - Each step tracked for completion

3. **Completion**
   - Success message displayed
   - Onboarding marked complete
   - Help menu remains accessible

### Integration Points

**Main Application**:
```tsx
<OnboardingFlow isNewUser={isNewUser} />
```

**Canvas Integration**:
- Tutorial monitors canvas state changes
- Detects element creation, movement, analysis
- Tracks connection creation and chat usage

## Customization

### Adding New Tutorial Steps

1. Add step definition to `InteractiveTutorial.tsx`:
```typescript
{
  id: 'new-step',
  title: 'Step Title',
  description: 'Step description',
  action: 'Required action',
  completed: false
}
```

2. Add completion detection logic in `useEffect`

### Modifying Sample Content

Edit the `sampleContent` array in `SampleContent.tsx` to add/remove sample posts.

### Styling

All components use Tailwind CSS classes and follow the design system:
- Primary color: Blue-500
- Success color: Green-500
- Background: Gray-50/100
- Borders: Gray-200

## Best Practices

1. **Progressive Disclosure**: Don't overwhelm users with all features at once
2. **Interactive Learning**: Learn by doing rather than reading
3. **Skip Options**: Always provide ways to skip for experienced users
4. **Persistent Help**: Keep help resources always accessible
5. **Visual Feedback**: Clear indicators for progress and completion

## Analytics Tracking

Recommended events to track:
- Onboarding started
- Each tutorial step completed
- Tutorial skipped
- Tutorial completed
- Help menu accessed
- Sample content used

## Future Enhancements

1. **Video Tutorials**: Add video walkthroughs for complex features
2. **Personalization**: Customize tutorial based on user role/goals
3. **A/B Testing**: Test different onboarding flows
4. **Progress Sync**: Sync progress across devices
5. **Tooltips**: Add contextual tooltips throughout the app