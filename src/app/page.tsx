'use client';

import dynamic from 'next/dynamic';

const AiconCanvasApp = dynamic(() => import('@/components/AiconCanvas'), {
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center">Loading canvas...</div>
});

export default function Home() {
  return <AiconCanvasApp />;
}