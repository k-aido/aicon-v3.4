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
      className="absolute bottom-0 right-0 w-[20px] h-[20px] cursor-se-resize group"
      onMouseDown={handleMouseDown}
      style={{
        zIndex: 1000, // Increased z-index to ensure it's on top
        pointerEvents: 'auto',
        transform: 'translate(50%, 50%)' // Position half inside, half outside
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        className="absolute top-0 left-0"
        style={{ overflow: 'visible', pointerEvents: 'none' }} // Make SVG not capture events
      >
        <path
          d="M 0 0 L 0 20 A 20 20 0 0 0 20 0 Z"
          fill="#E9D5FF"
          fillOpacity="0.8"
          className="group-hover:fill-opacity-100 transition-all"
        />
        <path
          d="M 0 0 L 0 20 A 20 20 0 0 0 20 0 Z"
          fill="none"
          stroke="#DDD6FE"
          strokeWidth="1"
          strokeOpacity="0.5"
          className="group-hover:stroke-opacity-80 transition-all"
        />
      </svg>
    </div>
  )
}