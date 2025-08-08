'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { canvasPersistence } from '@/services/canvasPersistence';

export default function DebugCanvasCreation() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testCanvasCreation = async () => {
    setLoading(true);
    setLogs([]);
    
    try {
      addLog('🚀 Starting Canvas creation test...');
      
      // Step 1: Check authentication
      const supabase = createBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        addLog(`❌ Auth error: ${authError.message}`);
        return;
      }
      
      if (!user) {
        addLog('❌ No authenticated user found');
        return;
      }
      
      addLog(`✅ User authenticated: ${user.id} (${user.email})`);
      
      // Step 2: Check cookies/session
      addLog('🍪 Checking browser cookies...');
      const cookies = document.cookie;
      const authTokenKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
      const hasAuthToken = cookies.includes(authTokenKey);
      addLog(`Auth token cookie present: ${hasAuthToken}`);
      
      // Step 3: Test direct API call
      addLog('🔄 Testing direct API call...');
      const apiResponse = await fetch('/api/canvas/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Debug Canvas ${new Date().toISOString()}`,
          userId: user.id // Explicit fallback
        })
      });
      
      const apiResult = await apiResponse.json();
      addLog(`API Response Status: ${apiResponse.status}`);
      addLog(`API Response: ${JSON.stringify(apiResult, null, 2)}`);
      
      if (!apiResponse.ok) {
        addLog(`❌ API call failed: ${apiResult.error}`);
        return;
      }
      
      // Step 4: Test via Canvas persistence service
      addLog('🔄 Testing via Canvas persistence service...');
      const workspace = await canvasPersistence.createWorkspace(user.id, `Service Canvas ${new Date().toISOString()}`);
      
      if (workspace) {
        addLog(`✅ Canvas created via service: ${workspace.id}`);
      } else {
        addLog('❌ Canvas creation via service failed');
      }
      
      // Step 5: Test loading canvases
      addLog('📊 Testing canvas loading...');
      const userWorkspaces = await canvasPersistence.getUserWorkspaces(user.id);
      addLog(`Found ${userWorkspaces.length} canvases for user`);
      
      addLog('🎉 Test completed!');
      
    } catch (error: any) {
      addLog(`💥 Unexpected error: ${error.message}`);
      console.error('Debug test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Canvas Creation Debug</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <button
            onClick={testCanvasCreation}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Canvas Creation'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Debug Log</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Click "Test Canvas Creation" to start debugging...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">What this test does:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Checks if user is properly authenticated</li>
            <li>Verifies browser cookies and auth tokens</li>
            <li>Tests direct API call to /api/canvas/create</li>
            <li>Tests Canvas creation via persistence service</li>
            <li>Tests loading existing canvases</li>
          </ul>
        </div>
      </div>
    </div>
  );
}