'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/ErrorBoundary';

const AiconCanvasApp = dynamic(
  () => import('@/components/AiconCanvas')
    .then(mod => {
      console.log('AiconCanvas module loaded successfully');
      return mod;
    })
    .catch(err => {
      console.error('Failed to load AiconCanvas:', err);
      return {
        default: () => (
          <div className="h-screen flex items-center justify-center text-red-600">
            <div className="text-center">
              <p className="text-xl font-bold">Error loading canvas</p>
              <p className="mt-2">Check console for details</p>
            </div>
          </div>
        )
      };
    }), 
  {
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center">Loading canvas...</div>
  }
);

export default function CanvasPage() {
  const params = useParams();
  const canvasId = params.canvasId as string;

  return (
    <ErrorBoundary>
      <AiconCanvasApp canvasId={canvasId} />
    </ErrorBoundary>
  );
}