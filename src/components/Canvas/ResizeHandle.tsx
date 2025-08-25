'use client'

import React from 'react'

interface ResizeHandleProps {
  onResizeStart: (e: React.MouseEvent) => void
  isVisible: boolean
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ onResizeStart, isVisible }) => {
  if (!isVisible) return null

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('🎯 ResizeHandle: Mouse down event triggered')
    e.stopPropagation() // Prevent triggering element drag
    e.preventDefault()
    onResizeStart(e)
  }

  return (
    <div
      data-resize-handle
      className="absolute bottom-0 right-0 w-[20px] h-[20px] cursor-se-resize"
      onMouseDown={handleMouseDown}
      style={{
        zIndex: 1000, // Increased z-index to ensure it's on top
        pointerEvents: 'auto',
        transform: 'translate(50%, 50%)', // Position half inside, half outside
        opacity: 0 // Make the handle invisible
      }}
    />
  )
}