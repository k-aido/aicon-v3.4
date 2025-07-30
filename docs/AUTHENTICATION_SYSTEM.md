# AICON v3 User Authentication & Account Management Specification

## Overview
This document defines the complete user authentication and account management system for AICON v3. The system supports multi-user accounts with role-based permissions, Supabase Auth integration, and comprehensive account lifecycle management.

## Technology Stack
- **Authentication**: Supabase Auth (handles JWT tokens, password security, email verification)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Frontend**: React with TypeScript
- **UI Components**: Shadcn/ui
- **State Management**: React Context + Zustand
- **Form Handling**: React Hook Form with Zod validation

## Core Authentication Features

### 1. User Registration Flow

#### Registration Form Fields
```typescript
interface RegistrationForm {
  // Account Information
  accountName: string;          // "John's Marketing Agency"
  billingEmail: string;         // "billing@company.com"
  planType: 'individual' | 'team' | 'agency';
  
  // User Information
  email: string;                // User's login email
  password: string;             // Min 8 chars, 1 uppercase, 1 number
  confirmPassword: string;
  firstName: string;
  lastName: string;
  
  // Legal
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}
```

#### Registration Process
1. **Form Validation**: Real-time validation with Zod schema
2. **Account Creation**: Create account record first
3. **User Creation**: Create user with 'owner' role
4. **Supabase Auth**: Register user with Supabase Auth
5. **Profile Setup**: Create default user profile
6. **Email Verification**: Send verification email via Supabase
7. **Redirect**: Send to email verification page

### 2. User Login Flow

#### Login Form
```typescript
interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}
```

#### Login Process
1. **Supabase Auth**: Authenticate with email/password
2. **User Lookup**: Get user record from database
3. **Account Validation**: Ensure account is active
4. **Session Creation**: Set up user session state
5. **Last Login Update**: Update last_login_at timestamp
6. **Redirect**: Send to dashboard or intended page

### 3. Password Management

#### Password Requirements
```typescript
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

#### Password Reset Flow
1. **Reset Request**: User enters email on `/forgot-password`
2. **Email Validation**: Check if email exists
3. **Reset Email**: Supabase sends secure reset link
4. **Reset Page**: User clicks link → goes to `/reset-password?token=xxx`
5. **New Password**: User sets new password
6. **Auto Login**: Automatically log user in after reset

## Account Management System

### 1. Account Types and Limits
```typescript
interface AccountLimits {
  individual: {
    users: 1;
    creators: 5;
    voiceModels: 10;
    storageGB: 50;
    monthlyCredits: 1000;
  };
  team: {
    users: 5;
    creators: 15;
    voiceModels: 25;
    storageGB: 200;
    monthlyCredits: 5000;
  };
  agency: {
    users: 25;
    creators: 50;
    voiceModels: 100;
    storageGB: 1000;
    monthlyCredits: 25000;
  };
}
```

### 2. Role-Based Permissions
```typescript
const permissions = {
  owner: {
    manageAccount: true,
    manageBilling: true,
    manageUsers: true,
    manageProjects: true,
    manageContent: true,
    generateContent: true,
    viewAnalytics: true,
  },
  admin: {
    manageAccount: false,
    manageBilling: false,
    manageUsers: true,
    manageProjects: true,
    manageContent: true,
    generateContent: true,
    viewAnalytics: true,
  },
  member: {
    manageAccount: false,
    manageBilling: false,
    manageUsers: false,
    manageProjects: true,
    manageContent: true,
    generateContent: true,
    viewAnalytics: false,
  },
  viewer: {
    manageAccount: false,
    manageBilling: false,
    manageUsers: false,
    manageProjects: false,
    manageContent: false,
    generateContent: false,
    viewAnalytics: false,
  }
};
```

### 3. User Invitation System

#### Invite Flow
1. **Send Invite**: Owner/Admin enters email and role
2. **Database Record**: Create user record with invite status
3. **Email Invitation**: Send custom invitation email
4. **Accept Invite**: User clicks link → registration/login flow
5. **Account Association**: Link user to inviting account
6. **Welcome Process**: Guide new user through onboarding

#### Invitation Email Template
```html
<div class="invitation-email">
  <h1>You're invited to join [Account Name] on AICON</h1>
  <p>[Inviter Name] has invited you to collaborate on content creation.</p>
  <a href="[invite-link]" class="accept-button">Accept Invitation</a>
  <p>Role: [Role Name]</p>
  <p>This invitation expires in 7 days.</p>
</div>
```

### 4. Profile Management

#### User Profile Interface
```typescript
interface UserProfile {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;          // Read-only (managed by auth)
  avatarUrl?: string;
  
  // Brand & Persona (for AI generation)
  brandName?: string;
  brandDescription?: string;
  personaDescription?: string;
  targetAudience?: string;
  contentStylePreferences: {
    tone: 'professional' | 'casual' | 'friendly' | 'authoritative';
    style: 'educational' | 'entertaining' | 'promotional' | 'inspirational';
    format: 'short' | 'medium' | 'long';
    callToAction: 'strong' | 'subtle' | 'none';
  };
  socialMediaHandles: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    linkedin?: string;
    twitter?: string;
  };
}
```

## React Components

### 1. Authentication Components

#### LoginForm Component
```typescript
interface LoginFormProps {
  onSuccess?: (user: User) => void;
  redirectTo?: string;
  showSignupLink?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  redirectTo = "/dashboard",
  showSignupLink = true
}) => {
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      
      if (error) throw error;
      
      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*, account:accounts(*)')
        .eq('id', data.user.id)
        .single();
      
      onSuccess?.(profile);
      router.push(redirectTo);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
          required
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="remember"
          checked={formData.rememberMe}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, rememberMe: checked }))}
        />
        <Label htmlFor="remember">Remember me</Label>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Sign In
      </Button>
      
      {showSignupLink && (
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      )}
    </form>
  );
};
```

#### RegisterForm Component
```typescript
const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState<RegistrationForm>({
    accountName: '',
    billingEmail: '',
    planType: 'individual',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    acceptTerms: false,
    acceptPrivacy: false
  });
  
  const [step, setStep] = useState(1);
  const [isLoading,