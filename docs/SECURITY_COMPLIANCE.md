# AICON v3 Security & Compliance Specification

## Overview
This document defines the complete security architecture, data protection measures, privacy compliance, and security best practices for AICON v3. It covers authentication security, data encryption, privacy regulations (GDPR, CCPA), security monitoring, and incident response procedures to ensure enterprise-grade security and regulatory compliance.

## Technology Stack
- **Authentication Security**: Supabase Auth with JWT tokens
- **Data Encryption**: AES-256 encryption at rest and in transit
- **API Security**: Rate limiting, request validation, CORS policies
- **Monitoring**: Real-time security event logging
- **Compliance**: GDPR, CCPA, SOC 2 Type II readiness
- **Infrastructure**: Secure cloud hosting with regular security audits

## Authentication & Authorization Security

### 1. Multi-Factor Authentication (MFA)

```typescript
interface MFAConfig {
  enabled: boolean;
  methods: ('totp' | 'sms' | 'email')[];
  backupCodes: {
    count: 10;
    length: 8;
    singleUse: true;
  };
  gracePeriod: 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
}

class MFAService {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = createSupabaseClient();
  }
  
  async enableMFA(userId: string, method: 'totp' | 'sms' | 'email'): Promise<MFASetupResult> {
    try {
      // Generate TOTP secret for authenticator apps
      if (method === 'totp') {
        const { data, error } = await this.supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Authenticator App'
        });
        
        if (error) throw error;
        
        return {
          qrCode: data.qr_code,
          secret: data.secret,
          backupCodes: await this.generateBackupCodes(userId)
        };
      }
      
      // For SMS/Email, send verification code
      const verificationCode = this.generateVerificationCode();
      await this.sendVerificationCode(userId, method, verificationCode);
      
      return {
        verificationRequired: true,
        method
      };
      
    } catch (error) {
      await this.logSecurityEvent('mfa_setup_failed', { userId, method, error: error.message });
      throw error;
    }
  }
  
  async verifyMFA(userId: string, code: string, challengeId?: string): Promise<MFAVerificationResult> {
    try {
      const { data, error } = await this.supabase.auth.mfa.verify({
        factorId: challengeId!,
        challengeId: challengeId!,
        code
      });
      
      if (error) {
        await this.logSecurityEvent('mfa_verification_failed', { 
          userId, 
          error: error.message,
          timestamp: new Date()
        });
        throw error;
      }
      
      await this.logSecurityEvent('mfa_verification_success', { userId });
      
      return {
        verified: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };
      
    } catch (error) {
      // Implement rate limiting for failed attempts
      await this.incrementFailedAttempts(userId);
      throw error;
    }
  }
  
  private async generateBackupCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
    
    // Store hashed backup codes
    const hashedCodes = await Promise.all(
      codes.map(code => bcrypt.hash(code, 12))
    );
    
    await this.supabase
      .from('user_backup_codes')
      .insert(hashedCodes.map(hash => ({
        user_id: userId,
        code_hash: hash,
        used: false
      })));
    
    return codes;
  }
}
```

### 2. Session Management & Security

```typescript
interface SessionSecurityConfig {
  maxSessionDuration: number; // 8 hours
  idleTimeout: number; // 30 minutes
  maxConcurrentSessions: number; // 5
  requireReauth: {
    sensitiveOperations: boolean;
    accountChanges: boolean;
    billingChanges: boolean;
  };
}

class SessionSecurityService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async createSecureSession(userId: string, deviceInfo: DeviceInfo): Promise<SessionToken> {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      deviceInfo,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent
    };
    
    // Store session in Redis with expiration
    await this.redis.setex(
      `session:${sessionId}`,
      sessionSecurityConfig.maxSessionDuration,
      JSON.stringify(sessionData)
    );
    
    // Track concurrent sessions
    await this.redis.sadd(`user_sessions:${userId}`, sessionId);
    await this.enforceConcurrentSessionLimit(userId);
    
    // Log session creation
    await this.logSecurityEvent('session_created', {
      userId,
      sessionId,
      deviceInfo,
      ipAddress: deviceInfo.ipAddress
    });
    
    return {
      sessionId,
      expiresAt: new Date(Date.now() + sessionSecurityConfig.maxSessionDuration * 1000)
    };
  }
  
  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    
    if (!sessionData) {
      return { valid: false, reason: 'session_not_found' };
    }
    
    const session = JSON.parse(sessionData);
    const now = new Date();
    const lastActivity = new Date(session.lastActivity);
    
    // Check idle timeout
    if (now.getTime() - lastActivity.getTime() > sessionSecurityConfig.idleTimeout * 1000) {
      await this.invalidateSession(sessionId);
      return { valid: false, reason: 'session_expired' };
    }
    
    // Update last activity
    session.lastActivity = now;
    await this.redis.setex(
      `session:${sessionId}`,
      sessionSecurityConfig.maxSessionDuration,
      JSON.stringify(session)
    );
    
    return { 
      valid: true, 
      session: session,
      requiresReauth: this.shouldRequireReauth(session)
    };
  }
  
  async invalidateSession(sessionId: string): Promise<void> {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    
    if (sessionData) {
      const session = JSON.parse(sessionData);
      await this.redis.del(`session:${sessionId}`);
      await this.redis.srem(`user_sessions:${session.userId}`, sessionId);
      
      await this.logSecurityEvent('session_invalidated', {
        userId: session.userId,
        sessionId
      });
    }
  }
  
  async invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    
    for (const sessionId of sessionIds) {
      if (sessionId !== exceptSessionId) {
        await this.invalidateSession(sessionId);
      }
    }
    
    await this.logSecurityEvent('all_sessions_invalidated', { userId, exceptSessionId });
  }
  
  private async enforceConcurrentSessionLimit(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    
    if (sessionIds.length > sessionSecurityConfig.maxConcurrentSessions) {
      // Remove oldest sessions
      const sessionsToRemove = sessionIds.slice(0, sessionIds.length - sessionSecurityConfig.maxConcurrentSessions);
      
      for (const sessionId of sessionsToRemove) {
        await this.invalidateSession(sessionId);
      }
    }
  }
}
```

### 3. API Security & Rate Limiting

```typescript
interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: (req: Request) => string;
}

class APISecurityService {
  private rateLimitConfigs: Record<string, RateLimitConfig> = {
    authentication: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
      keyGenerator: (req) => req.ip + req.body?.email
    },
    api_general: {
      windowMs: 15 * 60 * 1000,
      max: 1000, // 1000 requests per 15 minutes
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => this.getUserId(req) || req.ip
    },
    file_upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 100, // 100 uploads per hour
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => this.getUserId(req)!
    },
    ai_generation: {
      windowMs: 60 * 60 * 1000,
      max: 50, // 50 AI generations per hour
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => this.getAccountId(req)!
    }
  };
  
  async validateRequest(req: Request, limitType: string): Promise<ValidationResult> {
    const config = this.rateLimitConfigs[limitType];
    const key = config.keyGenerator(req);
    
    // Check rate limit
    const rateLimitResult = await this.checkRateLimit(key, config);
    if (!rateLimitResult.allowed) {
      await this.logSecurityEvent('rate_limit_exceeded', {
        ip: req.ip,
        endpoint: req.url,
        limitType,
        key
      });
      
      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        retryAfter: rateLimitResult.retryAfter
      };
    }
    
    // Validate request signature for sensitive operations
    if (this.requiresSignatureValidation(req)) {
      const signatureValid = await this.validateRequestSignature(req);
      if (!signatureValid) {
        return {
          allowed: false,
          reason: 'invalid_signature'
        };
      }
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = await this.detectSuspiciousPatterns(req);
    if (suspiciousPatterns.length > 0) {
      await this.logSecurityEvent('suspicious_request_detected', {
        ip: req.ip,
        patterns: suspiciousPatterns,
        endpoint: req.url
      });
      
      return {
        allowed: false,
        reason: 'suspicious_activity'
      };
    }
    
    return { allowed: true };
  }
  
  async sanitizeInput(input: any, schema: ValidationSchema): Promise<SanitizedInput> {
    // Remove potentially dangerous characters
    const sanitized = this.recursiveSanitize(input);
    
    // Validate against schema
    const validationResult = schema.safeParse(sanitized);
    
    if (!validationResult.success) {
      throw new ValidationError('Invalid input format', validationResult.error);
    }
    
    return validationResult.data;
  }
  
  private recursiveSanitize(obj: any): any {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: urls
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.recursiveSanitize(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeKey(key)] = this.recursiveSanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  }
  
  private async detectSuspiciousPatterns(req: Request): Promise<string[]> {
    const suspiciousPatterns: string[] = [];
    
    // Check for SQL injection patterns
    const sqlPatterns = [
      /('|(\\')|(;)|(--)|(\s(OR|AND)\s)/i,
      /(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/i
    ];
    
    const requestStr = JSON.stringify(req.body) + req.url;
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(requestStr)) {
        suspiciousPatterns.push('sql_injection_attempt');
        break;
      }
    }
    
    // Check for XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(requestStr)) {
        suspiciousPatterns.push('xss_attempt');
        break;
      }
    }
    
    // Check request frequency from same IP
    const recentRequests = await this.getRecentRequestCount(req.ip, 60); // Last minute
    if (recentRequests > 100) {
      suspiciousPatterns.push('excessive_requests');
    }
    
    return suspiciousPatterns;
  }
}
```

## Data Encryption & Protection

### 1. Encryption at Rest

```typescript
interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyDerivation: 'pbkdf2';
  iterations: 100000;
  saltLength: 32;
  ivLength: 16;
  tagLength: 16;
}

class DataEncryptionService {
  private masterKey: Buffer;
  private config: EncryptionConfig;
  
  constructor() {
    this.masterKey = this.deriveMasterKey();
    this.config = {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000,
      saltLength: 32,
      ivLength: 16,
      tagLength: 16
    };
  }
  
  async encryptSensitiveData(data: string, context: string = ''): Promise<EncryptedData> {
    try {
      const salt = crypto.randomBytes(this.config.saltLength);
      const iv = crypto.randomBytes(this.config.ivLength);
      
      // Derive key with context
      const key = crypto.pbkdf2Sync(
        this.masterKey,
        Buffer.concat([salt, Buffer.from(context)]),
        this.config.iterations,
        32,
        'sha256'
      );
      
      const cipher = crypto.createCipher(this.config.algorithm, key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        data: encrypted,
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.config.algorithm
      };
      
    } catch (error) {
      await this.logSecurityEvent('encryption_failed', { context, error: error.message });
      throw new EncryptionError('Failed to encrypt data');
    }
  }
  
  async decryptSensitiveData(encryptedData: EncryptedData, context: string = ''): Promise<string> {
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      // Derive the same key
      const key = crypto.pbkdf2Sync(
        this.masterKey,
        Buffer.concat([salt, Buffer.from(context)]),
        this.config.iterations,
        32,
        'sha256'
      );
      
      const decipher = crypto.createDecipher(encryptedData.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      await this.logSecurityEvent('decryption_failed', { context, error: error.message });
      throw new DecryptionError('Failed to decrypt data');
    }
  }
  
  async encryptFile(filePath: string, outputPath: string): Promise<FileEncryptionResult> {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-cbc', key, iv);
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(outputPath);
    
    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output);
      
      output.on('finish', () => {
        resolve({
          encryptedPath: outputPath,
          key: key.toString('hex'),
          iv: iv.toString('hex')
        });
      });
      
      output.on('error', reject);
    });
  }
  
  private deriveMasterKey(): Buffer {
    const passphrase = process.env.ENCRYPTION_PASSPHRASE;
    const salt = process.env.ENCRYPTION_SALT;
    
    if (!passphrase || !salt) {
      throw new Error('Encryption passphrase and salt must be configured');
    }
    
    return crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
  }
}
```

### 2. Secure File Storage

```typescript
class SecureFileStorage {
  private encryption: DataEncryptionService;
  private supabase: SupabaseClient;
  
  constructor() {
    this.encryption = new DataEncryptionService();
    this.supabase = createSupabaseClient();
  }
  
  async storeSecureFile(
    file: File, 
    bucket: string, 
    path: string, 
    metadata: FileMetadata
  ): Promise<SecureFileResult> {
    try {
      // Scan file for malware
      const scanResult = await this.scanFileForMalware(file);
      if (!scanResult.clean) {
        throw new SecurityError('File failed malware scan');
      }
      
      // Encrypt file if it contains sensitive data
      let fileToUpload = file;
      let encryptionMetadata: EncryptionMetadata | null = null;
      
      if (this.containsSensitiveData(metadata)) {
        const encryptedFile = await this.encryptFile(file);
        fileToUpload = encryptedFile.file;
        encryptionMetadata = encryptedFile.metadata;
      }
      
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            ...metadata,
            encrypted: !!encryptionMetadata,
            scanResult: scanResult.signature
          }
        });
      
      if (error) throw error;
      
      // Store encryption metadata separately if file was encrypted
      if (encryptionMetadata) {
        await this.storeEncryptionMetadata(path, encryptionMetadata);
      }
      
      return {
        path: data.path,
        encrypted: !!encryptionMetadata,
        scanSignature: scanResult.signature
      };
      
    } catch (error) {
      await this.logSecurityEvent('secure_file_storage_failed', {
        bucket,
        path,
        error: error.message
      });
      throw error;
    }
  }
  
  async retrieveSecureFile(bucket: string, path: string, userId: string): Promise<File> {
    // Verify user has permission to access file
    const hasPermission = await this.verifyFileAccess(path, userId);
    if (!hasPermission) {
      throw new SecurityError('Access denied to file');
    }
    
    // Download file
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path);
    
    if (error) throw error;
    
    // Check if file is encrypted
    const encryptionMetadata = await this.getEncryptionMetadata(path);
    
    if (encryptionMetadata) {
      // Decrypt file
      const decryptedFile = await this.decryptFile(data, encryptionMetadata);
      return decryptedFile;
    }
    
    return data;
  }
  
  private async scanFileForMalware(file: File): Promise<MalwareScanResult> {
    // Implement ClamAV or similar malware scanning
    // For demo purposes, basic file type and size validation
    
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/m4a'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return { clean: false, reason: 'unsupported_file_type' };
    }
    
    // Check file size limits
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return { clean: false, reason: 'file_too_large' };
    }
    
    // Basic content scanning (placeholder for real malware scanning)
    const buffer = await file.arrayBuffer();
    const signature = crypto.createHash('sha256').update(buffer).digest('hex');
    
    return {
      clean: true,
      signature,
      scannedAt: new Date()
    };
  }
  
  private containsSensitiveData(metadata: FileMetadata): boolean {
    // Determine if file contains PII or sensitive data
    const sensitiveKeywords = [
      'ssn', 'social security', 'credit card', 'password',
      'api key', 'secret', 'token', 'private key'
    ];
    
    const content = JSON.stringify(metadata).toLowerCase();
    return sensitiveKeywords.some(keyword => content.includes(keyword));
  }
}
```

## Privacy Compliance (GDPR/CCPA)

### 1. Data Subject Rights Management

```typescript
interface DataSubjectRequest {
  id: string;
  userId: string;
  requestType: 'access' | 'deletion' | 'portability' | 'rectification' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  verificationMethod: 'email' | 'identity_document';
  verificationCompleted: boolean;
}

class PrivacyComplianceService {
  private supabase: SupabaseClient;
  private encryption: DataEncryptionService;
  
  constructor() {
    this.supabase = createSupabaseClient();
    this.encryption = new DataEncryptionService();
  }
  
  async submitDataSubjectRequest(
    userId: string,
    requestType: DataSubjectRequest['requestType'],
    verificationData: VerificationData
  ): Promise<DataSubjectRequest> {
    try {
      // Create request record
      const request: DataSubjectRequest = {
        id: crypto.randomUUID(),
        userId,
        requestType,
        status: 'pending',
        requestedAt: new Date(),
        verificationMethod: verificationData.method,
        verificationCompleted: false
      };
      
      // Store request
      await this.supabase
        .from('data_subject_requests')
        .insert(request);
      
      // Send verification email
      await this.sendVerificationEmail(userId, request.id);
      
      // Log the request
      await this.logPrivacyEvent('data_subject_request_submitted', {
        userId,
        requestType,
        requestId: request.id
      });
      
      return request;
      
    } catch (error) {
      await this.logPrivacyEvent('data_subject_request_failed', {
        userId,
        requestType,
        error: error.message
      });
      throw error;
    }
  }
  
  async processDataAccessRequest(requestId: string): Promise<DataExportPackage> {
    const request = await this.getDataSubjectRequest(requestId);
    
    if (!request.verificationCompleted) {
      throw new PrivacyError('Request verification required');
    }
    
    try {
      // Update status
      await this.updateRequestStatus(requestId, 'processing');
      
      // Collect all user data
      const userData = await this.collectUserData(request.userId);
      
      // Create export package
      const exportPackage = await this.createDataExportPackage(userData);
      
      // Update status to completed
      await this.updateRequestStatus(requestId, 'completed');
      
      // Log completion
      await this.logPrivacyEvent('data_access_request_completed', {
        userId: request.userId,
        requestId,
        dataSize: exportPackage.size
      });
      
      return exportPackage;
      
    } catch (error) {
      await this.updateRequestStatus(requestId, 'rejected');
      throw error;
    }
  }
  
  async processDataDeletionRequest(requestId: string): Promise<DeletionResult> {
    const request = await this.getDataSubjectRequest(requestId);
    
    if (!request.verificationCompleted) {
      throw new PrivacyError('Request verification required');
    }
    
    try {
      // Update status
      await this.updateRequestStatus(requestId, 'processing');
      
      // Get user data for deletion log
      const userData = await this.collectUserData(request.userId);
      
      // Perform soft deletion first (mark as deleted but keep for audit)
      await this.performSoftDeletion(request.userId);
      
      // Schedule hard deletion after retention period
      await this.scheduleHardDeletion(request.userId, 30); // 30 days
      
      // Delete files from storage
      await this.deleteUserFiles(request.userId);
      
      // Anonymize remaining references
      await this.anonymizeUserReferences(request.userId);
      
      // Update status
      await this.updateRequestStatus(requestId, 'completed');
      
      const deletionResult = {
        userId: request.userId,
        requestId,
        softDeletedAt: new Date(),
        hardDeletionScheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deletedDataTypes: Object.keys(userData)
      };
      
      // Log deletion
      await this.logPrivacyEvent('data_deletion_request_completed', deletionResult);
      
      return deletionResult;
      
    } catch (error) {
      await this.updateRequestStatus(requestId, 'rejected');
      throw error;
    }
  }
  
  private async collectUserData(userId: string): Promise<UserDataCollection> {
    const userData: UserDataCollection = {};
    
    // Personal information
    const { data: user } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    userData.profile = user;
    
    // User profile and brand information
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    userData.profile_data = profile;
    
    // Projects and content
    const { data: projects } = await this.supabase
      .from('projects')
      .select('*')
      .eq('created_by_user_id', userId);
    
    userData.projects = projects;
    
    // Content pieces
    const { data: content } = await this.supabase
      .from('content_pieces')
      .select('*')
      .eq('uploaded_by_user_id', userId);
    
    userData.content = content;
    
    // Generated content
    const { data: generated } = await this.supabase
      .from('generated_content')
      .select('*')
      .eq('user_id', userId);
    
    userData.generated_content = generated;
    
    // Voice and avatar models
    const { data: voiceModels } = await this.supabase
      .from('voice_models')
      .select('*')
      .eq('user_id', userId);
    
    userData.voice_models = voiceModels;
    
    const { data: avatarModels } = await this.supabase
      .from('avatar_models')
      .select('*')
      .eq('user_id', userId);
    
    userData.avatar_models = avatarModels;
    
    // API usage logs
    const { data: apiLogs } = await this.supabase
      .from('api_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000); // Last 1000 API calls
    
    userData.api_usage = apiLogs;
    
    return userData;
  }
  
  private async createDataExportPackage(userData: UserDataCollection): Promise<DataExportPackage> {
    // Create JSON export
    const dataJson = JSON.stringify(userData, null, 2);
    
    // Create ZIP package with data and explanations
    const zip = new JSZip();
    
    // Add main data file
    zip.file('user_data.json', dataJson);
    
    // Add human-readable explanations
    zip.file('README.txt', this.generateDataExplanation());
    
    // Add individual data type files for easier reading
    if (userData.profile) {
      zip.file('profile.json', JSON.stringify(userData.profile, null, 2));
    }
    
    if (userData.projects) {
      zip.file('projects.json', JSON.stringify(userData.projects, null, 2));
    }
    
    if (userData.content) {
      zip.file('content.json', JSON.stringify(userData.content, null, 2));
    }
    
    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // Upload to secure temporary storage
    const fileName = `data_export_${Date.now()}.zip`;
    const { data } = await this.supabase.storage
      .from('temp-exports')
      .upload(fileName, zipBuffer, {
        cacheControl: '3600',
        upsert: false
      });
    
    // Generate signed URL with 24-hour expiration
    const { data: signedUrl } = await this.supabase.storage
      .from('temp-exports')
      .createSignedUrl(fileName, 24 * 60 * 60); // 24 hours
    
    return {
      downloadUrl: signedUrl.signedUrl!,
      fileName,
      size: zipBuffer.length,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }
  
  private generateDataExplanation(): string {
    return `
AICON Data Export Package
========================

This package contains all personal data associated with your AICON account.

Files included:
- user_data.json: Complete data export in machine-readable format
- profile.json: Your user profile and brand information
- projects.json: All projects you've created
- content.json: Content pieces you've uploaded or created
- README.txt: This explanation file

Data Categories:
1. Account Information: Email, name, account settings
2. Profile Data: Brand description, target audience, content preferences
3. Projects: Canvas projects and their configurations
4. Content: Uploaded files, analysis results, and metadata
5. Generated Content: AI-generated scripts, audio, and video
6. Voice/Avatar Models: Your personalized AI models
7. Usage Data: API usage logs and activity history

For questions about this data export, contact privacy@aicon.com

Generated on: ${new Date().toISOString()}
    `.trim();
  }
  
  private async performSoftDeletion(userId: string): Promise<void> {
    const deletionTimestamp = new Date();
    
    // Mark user as deleted
    await this.supabase
      .from('users')
      .update({ 
        deleted_at: deletionTimestamp,
        email: `deleted_${userId}@aicon.deleted`,
        is_active: false
      })
      .eq('id', userId);
    
    // Mark all user data as deleted
    const tables = [
      'user_profiles',
      'projects', 
      'content_pieces',
      'generated_content',
      'voice_models',
      'avatar_models'
    ];
    
    for (const table of tables) {
      await this.supabase
        .from(table)
        .update({ deleted_at: deletionTimestamp })
        .eq('user_id', userId);
    }
  }
}
```

### 2. Cookie Management & Consent

```typescript
interface CookieConsentSettings {
  necessary: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  consentDate: Date;
  consentVersion: string;
}

class CookieConsentService {
  private currentConsentVersion = '1.0';
  
  async recordConsent(userId: string, settings: CookieConsentSettings): Promise<void> {
    const consentRecord = {
      user_id: userId,
      necessary: settings.necessary,
      analytics: settings.analytics,
      marketing: settings.marketing,
      preferences: settings.preferences,
      consent_date: settings.consentDate,
      consent_version: this.currentConsentVersion,
      ip_address: this.getClientIP(),
      user_agent: this.getUserAgent()
    };
    
    await supabase
      .from('cookie_consents')
      .insert(consentRecord);
    
    // Set appropriate cookies based on consent
    this.setCookiesBasedOnConsent(settings);
    
    await this.logPrivacyEvent('cookie_consent_recorded', {
      userId,
      settings,
      version: this.currentConsentVersion
    });
  }
  
  async updateConsent(userId: string, newSettings: Partial<CookieConsentSettings>): Promise<void> {
    const existingConsent = await this.getLatestConsent(userId);
    
    const updatedSettings = {
      ...existingConsent,
      ...newSettings,
      consentDate: new Date(),
      consentVersion: this.currentConsentVersion
    };
    
    await this.recordConsent(userId, updatedSettings);
  }
  
  async checkConsentRequired(userId: string): Promise<boolean> {
    const latestConsent = await this.getLatestConsent(userId);
    
    if (!latestConsent) {
      return true; // No consent recorded
    }
    
    // Check if consent version is outdated
    if (latestConsent.consentVersion !== this.currentConsentVersion) {
      return true;
    }
    
    // Check if consent is older than 12 months
    const consentAge = Date.now() - latestConsent.consentDate.getTime();
    const twelveMonths = 12 * 30 * 24 * 60 * 60 * 1000;
    
    return consentAge > twelveMonths;
  }
  
  private setCookiesBasedOnConsent(settings: CookieConsentSettings): void {
    // Necessary cookies (always set)
    this.setNecessaryCookies();
    
    if (settings.analytics) {
      this.setAnalyticsCookies();
    } else {
      this.removeAnalyticsCookies();
    }
    
    if (settings.marketing) {
      this.setMarketingCookies();
    } else {
      this.removeMarketingCookies();
    }
    
    if (settings.preferences) {
      this.setPreferenceCookies();
    } else {
      this.removePreferenceCookies();
    }
  }
}
```

## Security Monitoring & Incident Response

### 1. Security Event Monitoring

```typescript
interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  accountId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  data: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

type SecurityEventType = 
  | 'authentication_failure'
  | 'suspicious_login'
  | 'mfa_bypass_attempt'
  | 'rate_limit_exceeded'
  | 'suspicious_file_upload'
  | 'unauthorized_access_attempt'
  | 'data_export_request'
  | 'account_takeover_attempt'
  | 'api_abuse'
  | 'malware_detected';

class SecurityMonitoringService {
  private redis: Redis;
  private alertThresholds: Record<SecurityEventType, AlertThreshold>;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.alertThresholds = {
      authentication_failure: { count: 5, window: 300 }, // 5 failures in 5 minutes
      suspicious_login: { count: 3, window: 3600 }, // 3 suspicious logins in 1 hour
      rate_limit_exceeded: { count: 10, window: 300 }, // 10 rate limits in 5 minutes
      unauthorized_access_attempt: { count: 3, window: 600 }, // 3 attempts in 10 minutes
      api_abuse: { count: 100, window: 3600 }, // 100 abusive requests in 1 hour
      // ... other thresholds
    };
  }
  
  async logSecurityEvent(
    type: SecurityEventType,
    data: Record<string, any>,
    request?: Request
  ): Promise<void> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      severity: this.calculateSeverity(type, data),
      userId: data.userId,
      accountId: data.accountId,
      ipAddress: request?.ip || data.ipAddress || 'unknown',
      userAgent: request?.get('User-Agent') || data.userAgent || 'unknown',
      timestamp: new Date(),
      data,
      resolved: false
    };
    
    // Store event in database
    await supabase
      .from('security_events')
      .insert(event);
    
    // Store in Redis for real-time analysis
    await this.redis.lpush(
      `security_events:${type}`,
      JSON.stringify(event)
    );
    
    // Set expiration for Redis list
    await this.redis.expire(`security_events:${type}`, 3600);
    
    // Check if this triggers an alert
    await this.checkAlertThresholds(type, event);
    
    // Auto-response for high severity events
    if (event.severity === 'high' || event.severity === 'critical') {
      await this.initiateAutoResponse(event);
    }
  }
  
  private async checkAlertThresholds(type: SecurityEventType, event: SecurityEvent): Promise<void> {
    const threshold = this.alertThresholds[type];
    if (!threshold) return;
    
    // Count recent events of this type
    const recentEvents = await this.redis.lrange(`security_events:${type}`, 0, threshold.count);
    const recentCount = recentEvents.filter(eventStr => {
      const recentEvent = JSON.parse(eventStr);
      const eventTime = new Date(recentEvent.timestamp).getTime();
      const thresholdTime = Date.now() - (threshold.window * 1000);
      return eventTime > thresholdTime;
    }).length;
    
    if (recentCount >= threshold.count) {
      await this.triggerSecurityAlert({
        type: `${type}_threshold_exceeded`,
        severity: 'high',
        affectedUser: event.userId,
        affectedAccount: event.accountId,
        eventCount: recentCount,
        timeWindow: threshold.window,
        triggeringEvent: event
      });
    }
  }
  
  private async initiateAutoResponse(event: SecurityEvent): Promise<void> {
    switch (event.type) {
      case 'account_takeover_attempt':
        // Lock account and require password reset
        if (event.userId) {
          await this.lockUserAccount(event.userId, 'Suspected account takeover attempt');
          await this.requirePasswordReset(event.userId);
          await this.notifyUser(event.userId, 'security_alert', {
            type: 'Account Security Alert',
            message: 'Suspicious activity detected. Your account has been temporarily locked.'
          });
        }
        break;
        
      case 'malware_detected':
        // Quarantine file and alert user
        if (event.data.filePath) {
          await this.quarantineFile(event.data.filePath);
          await this.notifyUser(event.userId!, 'malware_detected', {
            fileName: event.data.fileName,
            action: 'File quarantined for security'
          });
        }
        break;
        
      case 'suspicious_login':
        // Require MFA for next login
        if (event.userId) {
          await this.requireMFAForNextLogin(event.userId);
          await this.notifyUser(event.userId, 'suspicious_login', {
            ipAddress: event.ipAddress,
            location: await this.getLocationFromIP(event.ipAddress),
            timestamp: event.timestamp
          });
        }
        break;
        
      case 'api_abuse':
        // Temporarily rate limit the source
        await this.applyTemporaryRateLimit(event.ipAddress, 3600); // 1 hour
        break;
    }
  }
  
  private calculateSeverity(type: SecurityEventType, data: Record<string, any>): SecurityEvent['severity'] {
    const severityMap: Record<SecurityEventType, SecurityEvent['severity']> = {
      authentication_failure: 'low',
      suspicious_login: 'medium',
      mfa_bypass_attempt: 'high',
      rate_limit_exceeded: 'low',
      suspicious_file_upload: 'medium',
      unauthorized_access_attempt: 'high',
      data_export_request: 'medium',
      account_takeover_attempt: 'critical',
      api_abuse: 'medium',
      malware_detected: 'critical'
    };
    
    let baseSeverity = severityMap[type] || 'low';
    
    // Increase severity based on context
    if (data.repeated === true) {
      baseSeverity = this.escalateSeverity(baseSeverity);
    }
    
    if (data.privilegedUser === true) {
      baseSeverity = this.escalateSeverity(baseSeverity);
    }
    
    return baseSeverity;
  }
  
  private escalateSeverity(currentSeverity: SecurityEvent['severity']): SecurityEvent['severity'] {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityLevels.indexOf(currentSeverity);
    return severityLevels[Math.min(currentIndex + 1, severityLevels.length - 1)] as SecurityEvent['severity'];
  }
}
```

### 2. Incident Response System

```typescript
interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  assignedTo?: string;
  affectedUsers: string[];
  affectedSystems: string[];
  triggeringEvents: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  timeline: IncidentTimelineEntry[];
  mitigation: string[];
  rootCause?: string;
  prevention?: string[];
}

class IncidentResponseService {
  private supabase: SupabaseClient;
  private notification: NotificationService;
  
  constructor() {
    this.supabase = createSupabaseClient();
    this.notification = new NotificationService();
  }
  
  async createIncident(
    title: string,
    description: string,
    severity: SecurityIncident['severity'],
    triggeringEvents: string[]
  ): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      id: crypto.randomUUID(),
      title,
      description,
      severity,
      status: 'open',
      affectedUsers: [],
      affectedSystems: [],
      triggeringEvents,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [{
        timestamp: new Date(),
        action: 'incident_created',
        description: 'Security incident created',
        performedBy: 'system'
      }],
      mitigation: []
    };
    
    // Store incident
    await this.supabase
      .from('security_incidents')
      .insert(incident);
    
    // Auto-assign based on severity
    if (severity === 'critical' || severity === 'high') {
      await this.autoAssignIncident(incident.id);
    }
    
    // Send alerts
    await this.sendIncidentAlert(incident);
    
    return incident;
  }
  
  async updateIncidentStatus(
    incidentId: string,
    newStatus: SecurityIncident['status'],
    notes: string,
    performedBy: string
  ): Promise<void> {
    const timelineEntry: IncidentTimelineEntry = {
      timestamp: new Date(),
      action: 'status_updated',
      description: `Status changed to ${newStatus}. ${notes}`,
      performedBy
    };
    
    await this.supabase
      .from('security_incidents')
      .update({
        status: newStatus,
        updated_at: new Date(),
        resolved_at: newStatus === 'resolved' ? new Date() : null
      })
      .eq('id', incidentId);
    
    // Add timeline entry
    await this.addTimelineEntry(incidentId, timelineEntry);
    
    // Send status update notifications
    await this.sendStatusUpdateNotification(incidentId, newStatus, notes);
  }
  
  async addMitigationAction(
    incidentId: string,
    action: string,
    performedBy: string
  ): Promise<void> {
    const timelineEntry: IncidentTimelineEntry = {
      timestamp: new Date(),
      action: 'mitigation_applied',
      description: action,
      performedBy
    };
    
    // Get current incident
    const { data: incident } = await this.supabase
      .from('security_incidents')
      .select('mitigation')
      .eq('id', incidentId)
      .single();
    
    const updatedMitigation = [...(incident?.mitigation || []), action];
    
    await this.supabase
      .from('security_incidents')
      .update({
        mitigation: updatedMitigation,
        updated_at: new Date()
      })
      .eq('id', incidentId);
    
    await this.addTimelineEntry(incidentId, timelineEntry);
  }
  
  async generateIncidentReport(incidentId: string): Promise<IncidentReport> {
    const { data: incident } = await this.supabase
      .from('security_incidents')
      .select('*')
      .eq('id', incidentId)
      .single();
    
    if (!incident) {
      throw new Error('Incident not found');
    }
    
    // Get related security events
    const { data: events } = await this.supabase
      .from('security_events')
      .select('*')
      .in('id', incident.triggeringEvents);
    
    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(incident, events);
    
    // Generate technical details
    const technicalDetails = this.generateTechnicalDetails(incident, events);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(incident, events);
    
    const report: IncidentReport = {
      incidentId,
      title: incident.title,
      severity: incident.severity,
      executiveSummary,
      technicalDetails,
      timeline: incident.timeline,
      affectedSystems: incident.affectedSystems,
      affectedUsers: incident.affectedUsers.length,
      mitigation: incident.mitigation,
      rootCause: incident.rootCause,
      recommendations,
      generatedAt: new Date(),
      generatedBy: 'system'
    };
    
    return report;
  }
  
  private generateExecutiveSummary(incident: SecurityIncident, events: SecurityEvent[]): string {
    return `
Security Incident Summary
========================

Incident: ${incident.title}
Severity: ${incident.severity.toUpperCase()}
Duration: ${this.calculateIncidentDuration(incident)}
Status: ${incident.status.toUpperCase()}

Impact:
- ${incident.affectedUsers.length} users affected
- ${incident.affectedSystems.length} systems impacted
- ${events.length} security events triggered

The incident was ${incident.status === 'resolved' ? 'successfully resolved' : 'is ongoing'} with ${incident.mitigation.length} mitigation actions implemented.
    `.trim();
  }
  
  private generateRecommendations(incident: SecurityIncident, events: SecurityEvent[]): string[] {
    const recommendations: string[] = [];
    
    // Analysis-based recommendations
    const eventTypes = events.map(e => e.type);
    
    if (eventTypes.includes('authentication_failure')) {
      recommendations.push('Implement stricter password policies and account lockout mechanisms');
    }
    
    if (eventTypes.includes('suspicious_login')) {
      recommendations.push('Consider mandatory MFA for all users');
      recommendations.push('Implement geolocation-based login alerts');
    }
    
    if (eventTypes.includes('malware_detected')) {
      recommendations.push('Enhance file scanning capabilities');
      recommendations.push('Implement file type restrictions');
    }
    
    // Severity-based recommendations
    if (incident.severity === 'critical') {
      recommendations.push('Conduct security audit of affected systems');
      recommendations.push('Review and update incident response procedures');
    }
    
    return recommendations;
  }
}
```

## Security Testing & Validation

### 1. Automated Security Testing

```typescript
class SecurityTestSuite {
  async runSecurityTests(): Promise<SecurityTestResults> {
    const results: SecurityTestResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    
    // Authentication tests
    await this.testAuthenticationSecurity(results);
    
    // Authorization tests
    await this.testAuthorizationControls(results);
    
    // Input validation tests
    await this.testInputValidation(results);
    
    // Session security tests
    await this.testSessionSecurity(results);
    
    // File upload security tests
    await this.testFileUploadSecurity(results);
    
    // API security tests
    await this.testAPISecurityControls(results);
    
    return results;
  }
  
  private async testAuthenticationSecurity(results: SecurityTestResults): Promise<void> {
    const tests = [
      {
        name: 'Password complexity requirements',
        test: () => this.testPasswordComplexity()
      },
      {
        name: 'Account lockout after failed attempts',
        test: () => this.testAccountLockout()
      },
      {
        name: 'MFA bypass prevention',
        test: () => this.testMFABypassPrevention()
      },
      {
        name: 'Session fixation protection',
        test: () => this.testSessionFixationProtection()
      }
    ];
    
    for (const test of tests) {
      try {
        const testResult = await test.test();
        results.tests.push({
          category: 'Authentication',
          name: test.name,
          status: testResult.passed ? 'passed' : 'failed',
          details: testResult.details
        });
        
        if (testResult.passed) {
          results.passed++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.tests.push({
          category: 'Authentication',
          name: test.name,
          status: 'failed',
          details: `Test execution failed: ${error.message}`
        });
        results.failed++;
      }
    }
  }
  
  private async testPasswordComplexity(): Promise<TestResult> {
    const weakPasswords = [
      'password',
      '12345678',
      'qwerty123',
      'admin123'
    ];
    
    for (const password of weakPasswords) {
      // Attempt to create account with weak password
      const result = await this.attemptRegistration({
        email: 'test@example.com',
        password,
        accountName: 'Test Account'
      });
      
      if (result.success) {
        return {
          passed: false,
          details: `Weak password "${password}" was accepted`
        };
      }
    }
    
    return {
      passed: true,
      details: 'All weak passwords were properly rejected'
    };
  }
  
  private async testFileUploadSecurity(): Promise<TestResult> {
    const maliciousFiles = [
      { name: 'test.exe', content: 'MZ\x90\x00', mimeType: 'application/octet-stream' },
      { name: 'script.js', content: 'alert("xss")', mimeType: 'application/javascript' },
      { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>', mimeType: 'application/x-php' }
    ];
    
    for (const file of maliciousFiles) {
      const uploadResult = await this.attemptFileUpload(file);
      
      if (uploadResult.success) {
        return {
          passed: false,
          details: `Malicious file ${file.name} was accepted`
        };
      }
    }
    
    return {
      passed: true,
      details: 'All malicious files were properly rejected'
    };
  }
}
```

## Security Configuration

### 1. Environment Security Configuration

```typescript
// security.config.ts
export const securityConfig = {
  // Authentication
  auth: {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
    mfaRequired: process.env.NODE_ENV === 'production'
  },
  
  // API Security
  api: {
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per window
      standardHeaders: true,
      legacyHeaders: false
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      optionsSuccessStatus: 200
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", process.env.NEXT_PUBLIC_SUPABASE_URL],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  },
  
  // File Security
  files: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/m4a'
    ],
    scanForMalware: true,
    quarantineSuspiciousFiles: true
  },
  
  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivationIterations: 100000,
    saltLength: 32,
    ivLength: 16
  },
  
  // Monitoring
  monitoring: {
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enableSecurityEventLogging: true,
    enablePerformanceMonitoring: true,
    alertWebhookUrl: process.env.SECURITY_ALERT_WEBHOOK_URL
  }
};

// Validate security configuration on startup
export function validateSecurityConfig(): void {
  const requiredEnvVars = [
    'ENCRYPTION_PASSPHRASE',
    'ENCRYPTION_SALT',
    'NEXTAUTH_SECRET',
    'SECURITY_ALERT_WEBHOOK_URL'
  ];
  
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required security environment variables: ${missing.join(', ')}`);
  }
  
  // Validate encryption configuration
  if (process.env.ENCRYPTION_PASSPHRASE!.length < 32) {
    throw new Error('Encryption passphrase must be at least 32 characters');
  }
  
  if (process.env.ENCRYPTION_SALT!.length < 16) {
    throw new Error('Encryption salt must be at least 16 characters');
  }
}
```

This comprehensive Security & Compliance specification provides Claude Code and Cursor with everything needed to implement enterprise-grade security, data protection, and regulatory compliance for AICON v3.