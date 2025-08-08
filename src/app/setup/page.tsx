'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { checkEnvironmentVariables, getSafeEnvValues } from '@/utils/envCheck';

export default function SetupPage() {
  const [envCheck, setEnvCheck] = useState<ReturnType<typeof checkEnvironmentVariables> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const result = checkEnvironmentVariables();
    setEnvCheck(result);
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const envValues = getSafeEnvValues();

  if (!envCheck) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">AICON Environment Setup</h1>

          {/* Status Summary */}
          <div className={`rounded-lg p-6 mb-8 ${
            envCheck.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {envCheck.valid ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-green-900">Environment Ready</h2>
                    <p className="text-green-700">All required environment variables are configured correctly.</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-red-900">Environment Configuration Required</h2>
                    <p className="text-red-700">Please configure the missing environment variables below.</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Missing Variables */}
          {envCheck.missing.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Missing Required Variables</h3>
              <div className="space-y-2">
                {envCheck.missing.map((varName) => (
                  <div key={varName} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="font-mono text-sm text-red-900">{varName}</span>
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup Instructions</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">1. Create .env.local file</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-sm">
                  <div className="flex items-center justify-between">
                    <span>cp .env.local.example .env.local</span>
                    <button
                      onClick={() => copyToClipboard('cp .env.local.example .env.local', 'copy-cmd')}
                      className="ml-4 p-1 hover:bg-gray-700 rounded"
                    >
                      {copied === 'copy-cmd' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">2. Get your Supabase credentials</h4>
                <a
                  href="https://app.supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  Open Supabase Dashboard
                  <ExternalLink className="w-4 h-4" />
                </a>
                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                  <li>Select your project</li>
                  <li>Go to Settings → API</li>
                  <li>Copy the Project URL and anon/public key</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">3. Update .env.local with your values</h4>
                <div className="space-y-2">
                  <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-sm">
                    <div className="space-y-1">
                      <div className="text-green-400"># Supabase Configuration</div>
                      <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
                      <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">4. Restart your development server</h4>
                <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-sm">
                  <div className="flex items-center justify-between">
                    <span>npm run dev</span>
                    <button
                      onClick={() => copyToClipboard('npm run dev', 'npm-cmd')}
                      className="ml-4 p-1 hover:bg-gray-700 rounded"
                    >
                      {copied === 'npm-cmd' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Values (masked) */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Configuration</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_URL</span>
                <span className="font-mono text-sm text-gray-600">
                  {envValues.supabaseUrl ? '✓ Set' : '✗ Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-mono text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                <span className="font-mono text-sm text-gray-600">
                  {envValues.supabaseAnonKey ? '✓ Set' : '✗ Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-mono text-sm">NEXT_PUBLIC_DEMO_MODE</span>
                <span className="font-mono text-sm text-gray-600">
                  {envValues.isDemoMode ? 'true' : 'false'}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {envCheck.warnings.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Warnings</h3>
              <div className="space-y-2">
                {envCheck.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-yellow-800">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            {envCheck.valid ? (
              <a
                href="/"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </a>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Check Again
              </button>
            )}
            
            <a
              href="https://github.com/your-repo/aicon#setup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900"
            >
              View Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}