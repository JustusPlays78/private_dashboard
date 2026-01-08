declare global {
  interface Window {
    electronAPI: {
      // App Info
      app: {
        getInfo: () => Promise<{
          success: boolean;
          version: string;
          name: string;
          electronVersion: string;
          nodeVersion: string;
          chromeVersion: string;
          platform: string;
          arch: string;
        }>;
      };

      // Auth
      auth: {
        checkLockStatus: () => Promise<{ success: boolean; locked: boolean; initialized: boolean; error?: string }>;
        initialize: (password: string) => Promise<{ success: boolean; error?: string }>;
        unlock: (password: string) => Promise<{ success: boolean; error?: string }>;
        lock: () => Promise<{ success: boolean; error?: string }>;
        status: () => Promise<{ unlocked: boolean; initialized: boolean }>;
        onLocked: (callback: () => void) => () => void;
        heartbeat: () => Promise<{ success: boolean; time_until_lock?: number }>;
        changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
      };

      // Dashboard
      dashboard: {
        getData: () => Promise<{ success: boolean; gitlab?: any[]; terraform?: any[]; error?: string }>;
        stats: () => Promise<{ terraform_states: number; total_deployments: number; active_deployments: number }>;
      };

      // GitLab
      gitlab: {
        configure: (baseUrl: string, token: string) => Promise<{ success: boolean; base_url?: string; error?: string }>;
        getConfig: () => Promise<{ base_url: string; configured: boolean } | null>;
        disconnect: () => Promise<{ success: boolean; error?: string }>;
        checkGit: () => Promise<{ installed: boolean }>;
        listProjects: () => Promise<{ success: boolean; projects?: any[]; count?: number; error?: string }>;
        list: () => Promise<{ success: boolean; servers?: any[]; error?: string }>;
        create: (server: any) => Promise<{ success: boolean; id?: string; error?: string }>;
        update: (id: string, server: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: string) => Promise<{ success: boolean; error?: string }>;
        test: (server: any) => Promise<{ success: boolean; user?: any; error?: string }>;
        getProject: (projectId: number | string) => Promise<{ success: boolean; project?: any; error?: string }>;
        searchGroups: (query: string) => Promise<{ success: boolean; groups?: any[]; error?: string }>;
        searchProjects: (query: string) => Promise<{ success: boolean; projects?: any[]; error?: string }>;
        getGroupProjects: (groupId: number) => Promise<{ success: boolean; projects?: any[]; error?: string }>;
        clone: (projectId: number) => Promise<{ success: boolean; project_path?: string; project_name?: string; branch?: string; last_commit?: any; terraform_files?: string[]; terraform_files_count?: number; error?: string }>;
        pull: (projectId: number) => Promise<{ success: boolean; error?: string }>;
        getClonedProjects: () => Promise<{ success: boolean; projects?: any[]; error?: string }>;
        getClonedProjectsByInstance: (instanceUrl: string) => Promise<{ success: boolean; projects?: any[]; error?: string }>;
        assignProjectToInstance: (projectId: number, instanceUrl: string) => Promise<{ success: boolean; error?: string }>;
        deleteClonedProject: (projectId: number) => Promise<{ success: boolean; error?: string }>;
        getTerraformStates: (projectId: number) => Promise<{ success: boolean; states?: any[]; error?: string }>;
        listBranches: (projectPath: string) => Promise<{ success: boolean; branches?: string[]; current?: string; error?: string }>;
        switchBranch: (projectPath: string, branch: string) => Promise<{ success: boolean; error?: string }>;
        listGroups: () => Promise<{ success: boolean; groups?: any[]; error?: string }>;
        getTree: (projectId: number, path: string, ref: string) => Promise<{ success: boolean; tree?: any[]; error?: string }>;
      };

      // Terraform
      terraform: {
        check: () => Promise<{ installed: boolean; version?: string }>;
        list: () => Promise<{ success: boolean; configs?: any[]; error?: string }>;
        create: (config: any) => Promise<{ success: boolean; id?: string; error?: string }>;
        update: (id: string, config: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: string) => Promise<{ success: boolean; error?: string }>;
        getProject: (id: string) => Promise<{ success: boolean; project?: any; error?: string }>;
        getFiles: (projectPath: string) => Promise<{ success: boolean; files?: string[]; error?: string }>;
        readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
        init: (workDir: string, varsFile: string, backend: boolean) => Promise<{ success: boolean; output?: string | string[]; error?: string }>;
        plan: (workDir: string, varsFile: string) => Promise<{ success: boolean; output?: string | string[]; error?: string }>;
        apply: (workDir: string, varsFile: string) => Promise<{ success: boolean; output?: string | string[]; error?: string }>;
        destroy: (workDir: string, varsFile: string) => Promise<{ success: boolean; output?: string | string[]; error?: string }>;
        getBranches: (projectPath: string) => Promise<{ success: boolean; branches?: string[]; currentBranch?: string; error?: string }>;
        switchBranch: (projectPath: string, branch: string) => Promise<{ success: boolean; error?: string }>;
        findVarFiles: (projectPath: string) => Promise<{ success: boolean; var_files?: string[]; error?: string }>;
      };

      // Deployments
      deployments: {
        list: (terraformId?: string) => Promise<{ success: boolean; deployments?: any[]; error?: string }>;
        create: (deployment: any) => Promise<{ success: boolean; id?: string; error?: string }>;
        getStates: (terraformId: string) => Promise<{ success: boolean; states?: any[]; error?: string }>;
        getAll: () => Promise<{ success: boolean; deployments?: any[]; error?: string }>;
        getByProject: (projectId: number) => Promise<{ success: boolean; deployments?: any[]; error?: string }>;
      };

      // Notes (Canvas-style)
      notes: {
        list: () => Promise<{ success: boolean; notes?: any[]; error?: string }>;
        save: (notes: any[]) => Promise<{ success: boolean; error?: string }>;
      };

      // Note Items (Tree-style)
      noteItems: {
        list: () => Promise<{ success: boolean; items?: any[]; error?: string }>;
        create: (item: any) => Promise<{ success: boolean; id?: string; error?: string }>;
        update: (id: string, item: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: string) => Promise<{ success: boolean; error?: string }>;
        getAll: () => Promise<{ success: boolean; items?: any[]; error?: string }>;
      };

      // IFrame Pages
      iframes: {
        list: () => Promise<{ success: boolean; pages?: any[]; error?: string }>;
        get: (id: string) => Promise<{ success: boolean; page?: any; error?: string }>;
        getAll: () => Promise<{ pages?: any[]; error?: string }>;
        create: (page: any) => Promise<{ success: boolean; id?: string; error?: string }>;
        update: (id: string, page: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: string) => Promise<{ success: boolean; error?: string }>;
      };

      // Browser View
      browserView: {
        load: (pageId: string, url: string, bounds: { x: number; y: number; width: number; height: number }) => Promise<{ success: boolean; error?: string }>;
        resize: (bounds: { x: number; y: number; width: number; height: number }) => Promise<{ success: boolean; error?: string }>;
        destroy: () => Promise<{ success: boolean; error?: string }>;
        reload: () => Promise<{ success: boolean; error?: string }>;
      };

      // Secrets Manager
      secrets: {
        getAll: () => Promise<{ success: boolean; secrets?: any[]; error?: string }>;
        get: (id: string) => Promise<{ success: boolean; secret?: any; error?: string }>;
        create: (secret: any) => Promise<{ success: boolean; id?: string; error?: string }>;
        update: (id: string, secret: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: string) => Promise<{ success: boolean; error?: string }>;
        getCategories: () => Promise<{ success: boolean; categories?: string[]; error?: string }>;
      };

      // AWS Resources
      aws: {
        configure: (credentials: any) => Promise<{ success: boolean; error?: string }>;
        testConnection: (credentials: any) => Promise<{ success: boolean; identity?: any; error?: string }>;
        getResources: (credentials: any) => Promise<{ success: boolean; resources?: any; error?: string }>;
        getEC2Instances: (credentials: any) => Promise<{ success: boolean; instances?: any[]; error?: string }>;
        getS3Buckets: (credentials: any) => Promise<{ success: boolean; buckets?: any[]; error?: string }>;
        getLambdaFunctions: (credentials: any) => Promise<{ success: boolean; functions?: any[]; error?: string }>;
        getRDSInstances: (credentials: any) => Promise<{ success: boolean; instances?: any[]; error?: string }>;
        getECSClusters: (credentials: any) => Promise<{ success: boolean; clusters?: any[]; error?: string }>;
        getECSServices: (credentials: any, clusterArn?: string) => Promise<{ success: boolean; services?: any[]; error?: string }>;
        getECSTasks: (credentials: any, clusterArn?: string) => Promise<{ success: boolean; tasks?: any[]; error?: string }>;
        getLoadBalancers: (credentials: any) => Promise<{ success: boolean; loadBalancers?: any[]; error?: string }>;
        getSecurityGroups: (credentials: any) => Promise<{ success: boolean; securityGroups?: any[]; error?: string }>;
      };

      // Portable Tools Management
      tools: {
        getStatus: () => Promise<{ success: boolean; tools?: Record<string, { installed: boolean; portable: boolean; version?: string }>; error?: string }>;
        download: (toolName: string) => Promise<{ success: boolean; path?: string; error?: string }>;
        isInstalled: (toolName: string) => Promise<{ success: boolean; installed: boolean; portable: boolean; version?: string; path?: string; error?: string }>;
      };
    };
  }
}

export {};
