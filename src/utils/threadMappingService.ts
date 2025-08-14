// Service to manage mapping between frontend thread IDs and database thread IDs
// This is needed because frontend uses timestamp-based IDs while database uses UUIDs

interface ThreadMapping {
  frontendId: string
  databaseId: string
  chatInterfaceId: string
  title: string
  createdAt: Date
}

class ThreadMappingService {
  private static readonly STORAGE_KEY = 'chat_thread_mappings'
  private static mappings: Map<string, ThreadMapping> = new Map()

  // Initialize mappings from localStorage
  static init() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY)
        if (stored) {
          const data = JSON.parse(stored)
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            this.mappings.set(key, {
              ...value,
              createdAt: new Date(value.createdAt)
            })
          })
        }
      } catch (err) {
        console.error('Failed to load thread mappings from localStorage:', err)
      }
    }
  }

  // Save mappings to localStorage
  private static save() {
    if (typeof window !== 'undefined') {
      try {
        const data: Record<string, any> = {}
        this.mappings.forEach((value, key) => {
          data[key] = {
            ...value,
            createdAt: value.createdAt.toISOString()
          }
        })
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
      } catch (err) {
        console.error('Failed to save thread mappings to localStorage:', err)
      }
    }
  }

  // Add a new mapping
  static addMapping(
    frontendId: string,
    databaseId: string,
    chatInterfaceId: string,
    title: string
  ) {
    const mapping: ThreadMapping = {
      frontendId,
      databaseId,
      chatInterfaceId,
      title,
      createdAt: new Date()
    }
    
    this.mappings.set(frontendId, mapping)
    this.save()
    
    console.log(`🔗 Mapped thread: ${frontendId} → ${databaseId}`)
  }

  // Get database ID from frontend ID
  static getDatabaseId(frontendId: string): string | null {
    const mapping = this.mappings.get(frontendId)
    return mapping?.databaseId || null
  }

  // Get frontend ID from database ID
  static getFrontendId(databaseId: string): string | null {
    for (const [frontendId, mapping] of this.mappings.entries()) {
      if (mapping.databaseId === databaseId) {
        return frontendId
      }
    }
    return null
  }

  // Get all mappings for a chat interface
  static getMappingsForInterface(chatInterfaceId: string): ThreadMapping[] {
    const results: ThreadMapping[] = []
    this.mappings.forEach(mapping => {
      if (mapping.chatInterfaceId === chatInterfaceId) {
        results.push(mapping)
      }
    })
    return results
  }

  // Remove a mapping
  static removeMapping(frontendId: string) {
    if (this.mappings.delete(frontendId)) {
      this.save()
      console.log(`🗑️ Removed thread mapping: ${frontendId}`)
    }
  }

  // Update mapping title
  static updateMappingTitle(frontendId: string, newTitle: string) {
    const mapping = this.mappings.get(frontendId)
    if (mapping) {
      mapping.title = newTitle
      this.save()
      console.log(`📝 Updated mapping title: ${frontendId} → "${newTitle}"`)
    }
  }

  // Clear all mappings for a chat interface (when interface is deleted)
  static clearInterfaceMappings(chatInterfaceId: string) {
    const toRemove: string[] = []
    this.mappings.forEach((mapping, frontendId) => {
      if (mapping.chatInterfaceId === chatInterfaceId) {
        toRemove.push(frontendId)
      }
    })
    
    toRemove.forEach(frontendId => {
      this.mappings.delete(frontendId)
    })
    
    if (toRemove.length > 0) {
      this.save()
      console.log(`🧹 Cleared ${toRemove.length} thread mappings for interface ${chatInterfaceId}`)
    }
  }

  // Get mapping info
  static getMapping(frontendId: string): ThreadMapping | null {
    return this.mappings.get(frontendId) || null
  }

  // Debug: get all mappings
  static getAllMappings(): ThreadMapping[] {
    return Array.from(this.mappings.values())
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  ThreadMappingService.init()
}

export { ThreadMappingService }
export type { ThreadMapping }