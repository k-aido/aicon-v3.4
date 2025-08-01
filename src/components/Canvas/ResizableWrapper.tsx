'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ResizeHandle } from './ResizeHandle'

interface ResizableWrapperProps {
  children: React.ReactNode
  width: number
  height: number
  minWidth: number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
  onResize: (width: number, height: number) => void
  isSelected: boolean
  isHovered: boolean
  className?: string
  elementType: 'chat' | 'content' | 'folder'
}

const SNAP_GRID = 10

export function ResizableWrapper({
  children,
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  onResize,
  isSelected,
  isHovered,
  className = '',
  elementType
}: ResizableWrapperProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [showDimensions, setShowDimensions] = useState(false)
  const [dimensions, setDimensions] = useState({ width, height })
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const snapToGrid = (value: number) => {
    return Math.round(value / SNAP_GRID) * SNAP_GRID
  }

  const startResize = useCallback((e: React.MouseEvent) => {
    console.log('🔧 Resize started', { 
      currentWidth: width, 
      currentHeight: height,
      clientX: e.clientX,
      clientY: e.clientY,
      elementType 
    })
    
    setIsResizing(true)
    setShowDimensions(true)
    
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: width,
      height: height
    }
    
    document.body.style.cursor = 'se-resize'
    document.body.style.userSelect = 'none'
  }, [width, height, elementType])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStartRef.current) return

    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // Use requestAnimationFrame for smooth resizing
    animationFrameRef.current = requestAnimationFrame(() => {
      if (!resizeStartRef.current) return

      const start = resizeStartRef.current
      const deltaX = e.clientX - start.x
      const deltaY = e.clientY - start.y
      
      let newWidth = start.width + deltaX
      let newHeight = start.height + deltaY
      
      console.log('📏 Resizing', {
        deltaX,
        deltaY,
        newWidth,
        newHeight,
        clientX: e.clientX,
        clientY: e.clientY
      })
      
      const isShiftPressed = e.shiftKey
      const isAltPressed = e.altKey
      
      // Maintain aspect ratio if Shift is pressed
      if (isShiftPressed) {
        const aspectRatio = start.width / start.height
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / aspectRatio
        } else {
          newWidth = newHeight * aspectRatio
        }
      }
      
      // Apply constraints based on element type
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const effectiveMaxWidth = maxWidth || viewportWidth * 0.8
      const effectiveMaxHeight = maxHeight || viewportHeight * 0.8
      
      newWidth = Math.max(minWidth, Math.min(newWidth, effectiveMaxWidth))
      newHeight = Math.max(minHeight, Math.min(newHeight, effectiveMaxHeight))
      
      // Snap to grid if Alt is pressed
      if (isAltPressed) {
        newWidth = snapToGrid(newWidth)
        newHeight = snapToGrid(newHeight)
      }
      
      console.log('✅ Final dimensions', { newWidth, newHeight })
      
      setDimensions({ width: Math.round(newWidth), height: Math.round(newHeight) })
      onResize(newWidth, newHeight)
    })
  }, [isResizing, minWidth, minHeight, maxWidth, maxHeight, onResize])

  const handleMouseUp = useCallback(() => {
    console.log('🛑 Resize ended')
    setIsResizing(false)
    setShowDimensions(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    // Clean up animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  useEffect(() => {
    if (isResizing) {
      console.log('🎯 Adding resize event listeners')
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        console.log('🧹 Removing resize event listeners')
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        
        // Clean up animation frame on unmount
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  useEffect(() => {
    setDimensions({ width, height })
  }, [width, height])

  const showHandle = isSelected || isHovered

  return (
    <div
      className={`relative ${className} ${isResizing ? 'ring-2 ring-purple-400' : ''}`}
      style={{ width, height, overflow: 'visible' }}
    >
      {children}
      
      <ResizeHandle 
        onResizeStart={startResize} 
        isVisible={showHandle}
      />
      
      {showDimensions && (
        <div 
          className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg"
          style={{
            top: -32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 110,
            pointerEvents: 'none'
          }}
        >
          {dimensions.width} × {dimensions.height}
        </div>
      )}
    </div>
  )
}