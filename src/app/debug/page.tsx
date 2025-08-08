'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { canvasPersistence } from '@/services/canvasPersistence';

export default function DebugPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runTests() {
      const testResults = [];

      // Test 1: Environment variables
      testResults.push({
        test: 'Environment Variables',
        status: 'info',
        details: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
          anonKeyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
        }
      });

      // Test 2: Browser client creation
      try {
        const supabase = createBrowserClient();
        testResults.push({
          test: 'Browser Client Creation',
          status: 'success',
          details: 'Supabase client created successfully'
        });

        // Test 3: Simple query
        try {
          const { data, error } = await supabase.from('projects').select('count').limit(1);
          if (error) {
            testResults.push({
              test: 'Basic Query Test',
              status: 'error',
              details: {
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
              }
            });
          } else {
            testResults.push({
              test: 'Basic Query Test',
              status: 'success',
              details: 'Query executed successfully'
            });
          }
        } catch (queryError: any) {
          testResults.push({
            test: 'Basic Query Test',
            status: 'error',
            details: {
              error: queryError.message,
              stack: queryError.stack
            }
          });
        }

        // Test 4: Auth check
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          testResults.push({
            test: 'Authentication Check',
            status: authError ? 'error' : 'success',
            details: {
              hasUser: !!user,
              userId: user?.id,
              email: user?.email,
              error: authError?.message
            }
          });
        } catch (authError: any) {
          testResults.push({
            test: 'Authentication Check',
            status: 'error',
            details: {
              error: authError.message
            }
          });
        }

      } catch (clientError: any) {
        testResults.push({
          test: 'Browser Client Creation',
          status: 'error',
          details: {
            error: clientError.message,
            stack: clientError.stack
          }
        });
      }

      // Test 5: Canvas persistence service
      try {
        const connectionTest = await canvasPersistence.testConnection();
        testResults.push({
          test: 'Canvas Persistence Test',
          status: connectionTest.connected ? 'success' : 'error',
          details: {
            connected: connectionTest.connected,
            tables: connectionTest.tables,
            errors: connectionTest.errors
          }
        });
      } catch (persistenceError: any) {
        testResults.push({
          test: 'Canvas Persistence Test',
          status: 'error',
          details: {
            error: persistenceError.message,
            stack: persistenceError.stack
          }
        });
      }

      setResults(testResults);
      setLoading(false);
    }

    runTests();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Database Debug Page</h1>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="ml-4 inline-block">Running tests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Debug Page</h1>
        
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <div className={`w-4 h-4 rounded-full mr-3 ${
                  result.status === 'success' ? 'bg-green-500' :
                  result.status === 'error' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}></div>
                <h3 className="text-xl font-semibold">{result.test}</h3>
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-yellow-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Check if environment variables are properly loaded</li>
            <li>Verify Supabase client can be created</li>
            <li>Test basic database connectivity</li>
            <li>Check authentication status</li>
            <li>Test canvas persistence service</li>
          </ul>
        </div>
      </div>
    </div>
  );
}