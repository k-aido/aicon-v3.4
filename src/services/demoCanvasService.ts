// src/services/demoCanvasService.ts
// QUICK FIX: Replace or create this file to bypass database calls

export class DemoCanvasService {
  static async getAllCanvases(): Promise<any[]> {
    // BYPASSED: Return empty array instead of trying to connect to database
    console.log('[DemoCanvasService] Bypassed database call - returning empty canvases');
    return [];
  }

  static async getCanvas(id: string): Promise<any | null> {
    // BYPASSED: Return null instead of trying to connect to database  
    console.log('[DemoCanvasService] Bypassed database call - returning null canvas');
    return null;
  }

  static async createCanvas(canvas: any): Promise<any> {
    // BYPASSED: Return mock canvas instead of trying to save to database
    console.log('[DemoCanvasService] Bypassed database call - returning mock canvas');
    return {
      id: Date.now().toString(),
      ...canvas,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async updateCanvas(id: string, updates: any): Promise<any> {
    // BYPASSED: Return mock updated canvas 
    console.log('[DemoCanvasService] Bypassed database call - returning mock update');
    return {
      id,
      ...updates,
      updatedAt: new Date()
    };
  }

  static async deleteCanvas(id: string): Promise<void> {
    // BYPASSED: Do nothing instead of trying to delete from database
    console.log('[DemoCanvasService] Bypassed database call - mock delete');
  }
}