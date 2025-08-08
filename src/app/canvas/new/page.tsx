'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { canvasPersistence } from '@/services/canvasPersistence';
import { createBrowserClient } from '@/lib/supabase/client';

export default function NewCanvasPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    const createCanvas = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || '550e8400-e29b-41d4-a716-446655440002'; // Demo user fallback
        
        // Create new canvas
        const canvas = await canvasPersistence.createWorkspace(
          userId,
          `Canvas ${new Date().toLocaleDateString()}`
        );
        
        if (canvas) {
          router.replace(`/canvas/${canvas.id}`);
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Error creating new canvas:', error);
        router.replace('/');
      }
    };

    createCanvas();
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Creating new canvas...</p>
      </div>
    </div>
  );
}