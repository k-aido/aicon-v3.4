'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the demo canvas immediately
    const demoCanvasId = '550e8400-e29b-41d4-a716-446655440003';
    router.push(`/canvas/${demoCanvasId}`);
  }, [router]);
  
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your canvas...</p>
      </div>
    </div>
  );
}