'use client';

import React from 'react';
import { CanvasWorkspace } from '@/components/Canvas/CanvasWorkspace';

export default function TestToolbarPage() {
  return (
    <div className="w-full h-screen">
      <CanvasWorkspace workspaceId="test-workspace" />
    </div>
  );
}