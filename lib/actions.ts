'use server'

import { supabaseAdmin } from './db'
import { revalidatePath } from 'next/cache'

// Server actions for canvas operations
export async function saveCanvasState(canvasData: any) {
  try {
    const { data, error } = await supabaseAdmin
      .from('canvas_states')
      .upsert(canvasData)
      .select()
    
    if (error) throw error
    
    revalidatePath('/')
    return { success: true, data }
  } catch (error) {
    console.error('Error saving canvas state:', error)
    return { success: false, error: 'Failed to save canvas state' }
  }
}

export async function loadCanvasState(canvasId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('canvas_states')
      .select('*')
      .eq('id', canvasId)
      .single()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Error loading canvas state:', error)
    return { success: false, error: 'Failed to load canvas state' }
  }
}

export async function saveContentAnalysis(elementId: string, analysis: any) {
  try {
    const { data, error } = await supabaseAdmin
      .from('content_analysis')
      .upsert({
        element_id: elementId,
        analysis,
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (error) throw error
    
    return { success: true, data }
  } catch (error) {
    console.error('Error saving content analysis:', error)
    return { success: false, error: 'Failed to save analysis' }
  }
}