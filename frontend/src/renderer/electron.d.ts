declare global {
  interface Window {
    electronAPI: {
      checkBackendHealth: () => Promise<any>;
      browserView: {
        load: (pageId: string, url: string, bounds: { x: number; y: number; width: number; height: number }) => Promise<{ success: boolean; error?: string }>;
        resize: (bounds: { x: number; y: number; width: number; height: number }) => Promise<{ success: boolean; error?: string }>;
        destroy: () => Promise<{ success: boolean; error?: string }>;
        reload: () => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

export {};
