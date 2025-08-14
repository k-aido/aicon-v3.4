import { ThreadMappingService } from './threadMappingService'

export interface ChatInterface {
  name: string
  position_x: number
  position_y: number
  width: number
  height: number
  chat_history?: any // jsonb
  connected_content?: any // jsonb  
  ai_model_preference?: string
  project_id: string // canvas ID
  created_by_user_id?: string
  created_at: string
  updated_at: string
}

export class ChatEventLogger {
  static async logChatInterfaceCreated(
    chatElementId: string,
    position: { x: number; y: number },
    dimensions: { width: number; height: number },
    canvasId: string, // project_id (canvas ID) - now required
    userId?: string,
    modelType?: string,
    name?: string
  ): Promise<{ success: boolean; chatInterfaceId?: string }> {
    try {
      console.log('🚀 [ChatEventLogger] NEW VERSION - Creating chat interface via API:', {
        chatElementId,
        position,
        dimensions,
        canvasId,
        userId,
        modelType,
        name
      })

      // First, create the actual chat interface record
      const createResponse = await fetch('/api/chat-interface/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elementId: chatElementId,
          projectId: canvasId,
          name,
          position,
          dimensions,
          modelPreference: modelType,
          userId
        })
      })

      if (!createResponse.ok) {
        console.error('❌ Failed to create chat interface:', createResponse.status)
        const error = await createResponse.text()
        console.error('Error:', error)
        
        // Fall back to just logging the event
        await fetch('/api/log-chat-interface', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create',
            chatElementId,
            position,
            dimensions,
            canvasId,
            userId,
            modelType,
            name
          })
        })
        
        return { success: false }
      }

      const createResult = await createResponse.json()
      
      if (createResult.success && createResult.chatInterface) {
        console.log(`✅ Successfully created chat interface: ${createResult.chatInterface.id} for element ${chatElementId}`)
        return { 
          success: true, 
          chatInterfaceId: createResult.chatInterface.id 
        }
      }
      
      return { success: false }
    } catch (err) {
      console.error('❌ Error creating chat interface:', err)
      return { success: false }
    }
  }

  static async logChatInterfaceDeleted(
    chatElementId: string,
    canvasId?: string
  ): Promise<void> {
    try {
      console.log('🗑️ Logging chat interface deletion via API:', { chatElementId, canvasId })

      const response = await fetch('/api/log-chat-interface', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          chatElementId,
          canvasId
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        console.error('❌ API call failed:', result.error)
      } else {
        console.log(`✅ Successfully logged chat interface deletion: ${chatElementId}`)
        
        // Clear all thread mappings for this chat interface
        ThreadMappingService.clearInterfaceMappings(chatElementId)
      }
    } catch (err) {
      console.error('❌ Error calling chat interface deletion API:', err)
    }
  }

  static async updateChatInterfacePosition(
    chatElementId: string,
    position: { x: number; y: number },
    canvasId?: string
  ): Promise<void> {
    try {
      const response = await fetch('/api/log-chat-interface', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          chatElementId,
          position,
          canvasId
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        console.error('❌ Position update API call failed:', result.error)
      }
    } catch (err) {
      console.error('❌ Error updating chat interface position:', err)
    }
  }

  static async updateChatInterfaceDimensions(
    chatElementId: string,
    dimensions: { width: number; height: number },
    canvasId?: string
  ): Promise<void> {
    try {
      const response = await fetch('/api/log-chat-interface', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          chatElementId,
          dimensions,
          canvasId
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        console.error('❌ Dimensions update API call failed:', result.error)
      }
    } catch (err) {
      console.error('❌ Error updating chat interface dimensions:', err)
    }
  }
}