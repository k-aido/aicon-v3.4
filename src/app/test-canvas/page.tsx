'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export default function TestCanvasPage() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const supabase = createBrowserClient();

  const testCanvasCreation = async () => {
    setStatus('Testing canvas creation...');
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('No authenticated user found');
        return;
      }

      setStatus(`Found user: ${user.email} (${user.id})`);

      // Try to create canvas via API
      const response = await fetch('/api/canvas/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Canvas from Test Page',
          userId: user.id // Include as fallback
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(`API Error: ${result.error}\nCode: ${result.code}\nDetails: ${JSON.stringify(result.details)}`);
        console.error('API Error:', result);
        return;
      }

      if (result.success && result.canvas) {
        setStatus(`✅ Canvas created successfully!\nCanvas ID: ${result.canvas.id}`);
        
        // Try to navigate to it
        setTimeout(() => {
          window.location.href = `/canvas/${result.canvas.id}`;
        }, 2000);
      } else {
        setError('No canvas returned from API');
      }
    } catch (err: any) {
      setError(`Exception: ${err.message}`);
      console.error('Exception:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Canvas Creation Test</h1>
        
        <button
          onClick={testCanvasCreation}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-8"
        >
          Test Canvas Creation
        </button>

        {status && (
          <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
            <pre className="whitespace-pre-wrap">{status}</pre>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <pre className="whitespace-pre-wrap text-red-600">{error}</pre>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-600">
          <p>This page tests the canvas creation flow:</p>
          <ol className="list-decimal list-inside mt-2">
            <li>Gets the current authenticated user</li>
            <li>Calls the /api/canvas/create endpoint</li>
            <li>Creates account/user records if needed</li>
            <li>Creates a new canvas project</li>
            <li>Redirects to the new canvas</li>
          </ol>
        </div>
      </div>
    </div>
  );
}