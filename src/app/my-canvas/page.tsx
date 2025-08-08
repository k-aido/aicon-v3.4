'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { canvasPersistence } from '@/services/canvasPersistence';

export default function MyCanvasPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Finding your canvas...');
  
  useEffect(() => {
    const loadCanvas = async () => {
      try {
        // First try to get the demo canvas
        const demoCanvasId = '550e8400-e29b-41d4-a716-446655440003';
        setStatus('Loading demo canvas...');
        
        // Try to load it directly
        const elements = await canvasPersistence.loadElements(demoCanvasId);
        if (elements !== null) {
          // Canvas exists, redirect to it
          router.push(`/canvas/${demoCanvasId}`);
          return;
        }
        
        // If demo canvas doesn't exist, try to get user workspaces
        setStatus('Demo canvas not found, checking for other canvases...');
        const demoUserId = '550e8400-e29b-41d4-a716-446655440002';
        const workspaces = await canvasPersistence.getUserWorkspaces(demoUserId);
        
        if (workspaces && workspaces.length > 0) {
          // Use the first available workspace
          router.push(`/canvas/${workspaces[0].id}`);
          return;
        }
        
        // No canvases found, create a new one
        setStatus('No canvases found, creating a new one...');
        const newCanvas = await canvasPersistence.createWorkspace(
          demoUserId,
          'My Canvas'
        );
        
        if (newCanvas) {
          router.push(`/canvas/${newCanvas.id}`);
        } else {
          setStatus('Failed to create canvas. Please check your database connection.');
        }
        
      } catch (error) {
        console.error('Error loading canvas:', error);
        setStatus('Error loading canvas. Please check the console for details.');
      }
    };
    
    loadCanvas();
  }, [router]);
  
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-700 text-lg">{status}</p>
        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-500">
            Quick links while you wait:
          </p>
          <div className="space-y-2">
            <a 
              href="/canvas/550e8400-e29b-41d4-a716-446655440003" 
              className="block text-blue-600 hover:text-blue-700 underline"
            >
              Go directly to demo canvas →
            </a>
            <a 
              href="/canvas/new" 
              className="block text-blue-600 hover:text-blue-700 underline"
            >
              Create a new canvas →
            </a>
            <a 
              href="/debug/database" 
              className="block text-blue-600 hover:text-blue-700 underline"
            >
              Check database status →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}