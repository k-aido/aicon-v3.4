'use client';

import React, { useState, useEffect } from 'react';
import { databaseDebugger } from '@/utils/databaseDebug';
import { canvasPersistence } from '@/services/canvasPersistence';

export default function DatabaseDebugPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [connectionTest, setConnectionTest] = useState<any>(null);
  const [rlsTest, setRlsTest] = useState<any>(null);
  const [demoQueryTest, setDemoQueryTest] = useState<any>(null);

  const runDiagnostics = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      const results = await databaseDebugger.runDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testPersistenceConnection = async () => {
    try {
      const connTest = await canvasPersistence.testConnection();
      setConnectionTest(connTest);
      
      const rlsCheck = await canvasPersistence.checkRLS();
      setRlsTest(rlsCheck);
      
      const demoTest = await canvasPersistence.testDemoProjectQuery();
      setDemoQueryTest(demoTest);
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  const testCanvasPersistence = async () => {
    const results: string[] = [];
    const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440002';
    const DEMO_ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440001';
    const DEMO_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440003';
    
    try {
      // First run connection tests
      results.push('Running connection diagnostics...');
      await testPersistenceConnection();
      
      // Test 0: Get demo project specifically
      results.push('Testing getDemoProject...');
      const demoProject = await canvasPersistence.getDemoProject();
      if (demoProject) {
        results.push(`✅ Found demo project: ${demoProject.id} - ${demoProject.title}`);
      } else {
        results.push('❌ Demo project not found');
      }
      // Test 1: Create workspace
      results.push('Testing createWorkspace...');
      const workspace = await canvasPersistence.createWorkspace(
        DEMO_USER_ID,
        `Test Canvas ${new Date().toISOString()}`
      );
      
      if (workspace) {
        results.push(`✅ Created workspace: ${workspace.id}`);
        
        // Test 2: Get user workspaces
        results.push('Testing getUserWorkspaces...');
        const workspaces = await canvasPersistence.getUserWorkspaces(DEMO_USER_ID);
        results.push(`✅ Found ${workspaces.length} workspace(s)`);
        
        // Test 3: Save elements
        results.push('Testing saveElements...');
        const testElements = [{
          id: 1,
          type: 'content' as const,
          x: 100,
          y: 100,
          width: 300,
          height: 200,
          title: 'Test Element'
        }];
        
        const saveSuccess = await canvasPersistence.saveElements(workspace.id, testElements);
        results.push(saveSuccess ? '✅ Elements saved' : '❌ Failed to save elements');
        
        // Test 4: Load elements
        results.push('Testing loadElements...');
        const loadedElements = await canvasPersistence.loadElements(workspace.id);
        results.push(`✅ Loaded ${loadedElements.length} element(s)`);
        
        // Test 5: Delete workspace
        results.push('Testing deleteWorkspace...');
        const deleteSuccess = await canvasPersistence.deleteWorkspace(workspace.id);
        results.push(deleteSuccess ? '✅ Workspace deleted' : '❌ Failed to delete workspace');
      } else {
        results.push('❌ Failed to create workspace');
      }
    } catch (error) {
      results.push(`❌ Error during tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setTestResults(results);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Diagnostics</h1>
        
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={runDiagnostics}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Running...' : 'Run Diagnostics'}
            </button>
            
            <button
              onClick={testCanvasPersistence}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Canvas Persistence
            </button>
            
            <button
              onClick={testPersistenceConnection}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Test Persistence Connection
            </button>
          </div>

          {/* Diagnostics Results */}
          {diagnostics && (
            <div className="space-y-4">
              {/* Connection Status */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
                <div className="space-y-2">
                  <p className={diagnostics.connection.connected ? 'text-green-600' : 'text-red-600'}>
                    {diagnostics.connection.connected ? '✅ Connected' : '❌ Not Connected'}
                  </p>
                  {diagnostics.connection.url && (
                    <p className="text-sm text-gray-600">URL: {diagnostics.connection.url}</p>
                  )}
                  {diagnostics.connection.error && (
                    <p className="text-sm text-red-600">Error: {diagnostics.connection.error}</p>
                  )}
                </div>
              </div>

              {/* Table Status */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Table Status</h2>
                <div className="space-y-2">
                  {Object.entries(diagnostics.tables.tables).map(([table, exists]) => (
                    <div key={table} className="flex justify-between">
                      <span>{table}</span>
                      <span className={exists ? 'text-green-600' : 'text-red-600'}>
                        {exists ? '✅ Exists' : '❌ Missing'}
                      </span>
                    </div>
                  ))}
                </div>
                {diagnostics.tables.errors.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 rounded">
                    <h3 className="font-semibold text-red-700 mb-2">Errors:</h3>
                    <ul className="list-disc list-inside text-sm text-red-600">
                      {diagnostics.tables.errors.map((error: string, i: number) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Auth Status */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
                <div className="space-y-2">
                  <p className={diagnostics.auth.authenticated ? 'text-green-600' : 'text-yellow-600'}>
                    {diagnostics.auth.authenticated ? '✅ Authenticated' : '⚠️ Not Authenticated (using demo mode)'}
                  </p>
                  {diagnostics.auth.user && (
                    <p className="text-sm text-gray-600">User ID: {diagnostics.auth.user.id}</p>
                  )}
                  {diagnostics.auth.error && (
                    <p className="text-sm text-red-600">Error: {diagnostics.auth.error}</p>
                  )}
                </div>
              </div>

              {/* Demo Workspace */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Demo Workspace</h2>
                <div className="space-y-2">
                  <p className={diagnostics.demo.success ? 'text-green-600' : 'text-red-600'}>
                    {diagnostics.demo.success ? '✅ Ready' : '❌ Failed'}
                  </p>
                  {diagnostics.demo.workspace && (
                    <div className="text-sm text-gray-600">
                      <p>ID: {diagnostics.demo.workspace.id}</p>
                      <p>Title: {diagnostics.demo.workspace.title}</p>
                    </div>
                  )}
                  {diagnostics.demo.error && (
                    <p className="text-sm text-red-600">Error: {diagnostics.demo.error}</p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Summary</h2>
                <pre className="whitespace-pre-wrap text-sm">{diagnostics.summary}</pre>
              </div>
            </div>
          )}

          {/* Connection Test Results */}
          {connectionTest && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Persistence Connection Test</h2>
              <div className="space-y-2">
                <p className={connectionTest.connected ? 'text-green-600' : 'text-red-600'}>
                  {connectionTest.connected ? '✅ All tables accessible' : '❌ Some tables not accessible'}
                </p>
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Table Access:</h3>
                  {Object.entries(connectionTest.tables).map(([table, accessible]) => (
                    <div key={table} className="flex justify-between">
                      <span>{table}</span>
                      <span className={accessible ? 'text-green-600' : 'text-red-600'}>
                        {accessible ? '✅ Accessible' : '❌ Not Accessible'}
                      </span>
                    </div>
                  ))}
                </div>
                {connectionTest.errors.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 rounded">
                    <h3 className="font-semibold text-red-700 mb-2">Errors:</h3>
                    <ul className="list-disc list-inside text-sm text-red-600">
                      {connectionTest.errors.map((error: string, i: number) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RLS Test Results */}
          {rlsTest && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Row Level Security (RLS) Test</h2>
              <div className="space-y-2">
                {Object.entries(rlsTest).map(([table, status]: [string, any]) => (
                  <div key={table} className="border-b pb-2">
                    <div className="font-semibold">{table}</div>
                    <div className="text-sm">
                      <span>RLS Enabled: </span>
                      <span className={status.enabled ? 'text-yellow-600' : 'text-gray-600'}>
                        {status.enabled ? 'Yes' : 'No'}
                      </span>
                      <span className="ml-4">Accessible: </span>
                      <span className={status.accessible ? 'text-green-600' : 'text-red-600'}>
                        {status.accessible ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demo Query Test Results */}
          {demoQueryTest && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Demo Project Query Tests</h2>
              <p className={demoQueryTest.success ? 'text-green-600 mb-4' : 'text-red-600 mb-4'}>
                {demoQueryTest.success ? '✅ Demo project queries successful' : '❌ Demo project queries failed'}
              </p>
              <div className="space-y-4">
                {demoQueryTest.queries.map((query: any, i: number) => (
                  <div key={i} className="border-l-4 border-blue-500 pl-4">
                    <div className="font-semibold">{query.test}</div>
                    <div className="text-xs text-gray-600 font-mono mb-2">{query.query}</div>
                    <div className="text-sm">
                      <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(demoQueryTest.results[i], null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canvas Persistence Test Results */}
          {testResults.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Canvas Persistence Test Results</h2>
              <div className="space-y-1">
                {testResults.map((result, i) => (
                  <p key={i} className="text-sm font-mono">{result}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}