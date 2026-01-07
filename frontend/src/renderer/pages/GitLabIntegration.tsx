import React, { useState, useEffect } from 'react';
import { GitBranch, Download, RefreshCw, Search, FolderGit, Check, AlertCircle, Folder, Trash2, Key, ChevronDown, Server, Link2 } from 'lucide-react';

interface Secret {
  id: string;
  name: string;
  category: string;
  apiKey: string | null;
  url: string | null;
}

interface GitLabInstance {
  id: string;
  name: string;
  url: string;
}

interface GitLabProject {
  id: number;
  name: string;
  description: string;
  path_with_namespace: string;
  http_url_to_repo: string;
  default_branch: string;
  last_activity_at: string;
}

interface GitLabGroup {
  id: number;
  name: string;
  path: string;
  full_path: string;
  description: string;
  web_url: string;
}

interface ClonedProjectResponse {
  project_path: string;
  project_name: string;
  branch: string;
  last_commit: {
    hash: string;
    message: string;
  };
  terraform_files: string[];
  terraform_files_count: number;
}

interface SavedClonedProject {
  ProjectID: number;
  Name: string;
  LocalPath: string;
  DefaultBranch: string;
  ClonedAt: string;
  LastPull: string | null;
  InstanceUrl: string | null;
}

type ClonedProject = ClonedProjectResponse | SavedClonedProject;

export default function GitLabIntegration() {
  const [configured, setConfigured] = useState(false);
  const [baseURL, setBaseURL] = useState('gitlab.com');
  const [token, setToken] = useState('');
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [groups, setGroups] = useState<GitLabGroup[]>([]);
  const [clonedProjects, setClonedProjects] = useState<ClonedProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'projects' | 'groups' | 'id'>('projects');
  const [selectedGroup, setSelectedGroup] = useState<GitLabGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gitInstalled, setGitInstalled] = useState(false);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [showSecretPicker, setShowSecretPicker] = useState(false);
  const [gitlabInstances, setGitlabInstances] = useState<GitLabInstance[]>([]);
  const [selectedInstanceFilter, setSelectedInstanceFilter] = useState<string>('all');
  const [assigningProject, setAssigningProject] = useState<number | null>(null);

  useEffect(() => {
    checkGitInstallation();
    loadSavedConfig();
    loadSavedClonedProjects();
    loadSecrets();
    loadGitLabInstances();
  }, []);

  const loadGitLabInstances = async () => {
    try {
      const result = await window.electronAPI.secrets.getAll();
      if (result.success && result.secrets) {
        const instances = result.secrets
          .filter((s: Secret) => s.category === 'GitLab' && s.url)
          .map((s: Secret) => ({
            id: s.id,
            name: s.name,
            url: s.url || ''
          }));
        setGitlabInstances(instances);
      }
    } catch (err) {
      console.error('Failed to load GitLab instances:', err);
    }
  };

  const loadSecrets = async () => {
    try {
      const result = await window.electronAPI.secrets.getAll();
      if (result.success && result.secrets) {
        // Filter to only show secrets with API keys (likely GitLab tokens)
        const gitlabSecrets = result.secrets.filter(
          (s: Secret) => s.apiKey && (s.category === 'GitLab' || s.category === 'API Keys')
        );
        setSecrets(gitlabSecrets);
      }
    } catch (err) {
      console.error('Failed to load secrets:', err);
    }
  };

  const useSecretToken = (secret: Secret) => {
    if (secret.apiKey) {
      setToken(secret.apiKey);
    }
    if (secret.url) {
      // Extract domain from URL
      try {
        const url = new URL(secret.url);
        setBaseURL(url.host);
      } catch {
        // If not a valid URL, use as-is
        setBaseURL(secret.url);
      }
    }
    setShowSecretPicker(false);
  };

  const checkGitInstallation = async () => {
    try {
      const result = await window.electronAPI.gitlab.checkGit();
      setGitInstalled(result.installed);
      if (!result.installed) {
        setError('Git is not installed. Please install Git to use GitLab integration.');
      }
    } catch (err) {
      console.error('Failed to check Git installation:', err);
    }
  };

  const loadSavedConfig = async () => {
    try {
      const data = await window.electronAPI.gitlab.getConfig();
      if (data && data.configured) {
        setConfigured(true);
        setBaseURL(data.base_url);
      }
    } catch (err) {
      console.error('Failed to load saved config:', err);
    }
  };

  const loadSavedClonedProjects = async () => {
    try {
      const result = await window.electronAPI.gitlab.getClonedProjects();
      if (result.projects && Array.isArray(result.projects)) {
        setClonedProjects(result.projects);
      }
    } catch (err) {
      console.error('Failed to load saved cloned projects:', err);
    }
  };

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await window.electronAPI.gitlab.configure(baseURL, token);

      if (!result.success) {
        throw new Error(result.error || 'Failed to configure GitLab');
      }

      setConfigured(true);
      setSuccess('GitLab configured successfully!');
      setToken('');
      loadProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.gitlab.listProjects();
      if (!result.success) throw new Error(result.error || 'Failed to load projects');
      setProjects(result.projects || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) {
      if (selectedGroup) setSelectedGroup(null);
      loadProjects();
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (searchMode === 'id') {
        const result = await window.electronAPI.gitlab.getProject(searchTerm);
        if (!result.success) throw new Error('Project not found');
        setProjects([result.project]);
        setSelectedGroup(null);
      } else if (searchMode === 'groups') {
        const result = await window.electronAPI.gitlab.searchGroups(searchTerm);
        if (!result.success) throw new Error('Group search failed');
        setGroups(result.groups || []);
        setProjects([]);
        setSelectedGroup(null);
      } else {
        const result = await window.electronAPI.gitlab.searchProjects(searchTerm);
        if (!result.success) throw new Error('Search failed');
        setProjects(result.projects || []);
        setSelectedGroup(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupProjects = async (group: GitLabGroup) => {
    setLoading(true);
    setError('');
    setSelectedGroup(group);

    try {
      const result = await window.electronAPI.gitlab.getGroupProjects(group.id);
      if (!result.success) throw new Error('Failed to load group projects');
      setProjects(result.projects || []);
      setGroups([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (project: GitLabProject) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await window.electronAPI.gitlab.clone(project.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to clone project');
      }

      // Create a properly typed ClonedProjectResponse
      const clonedProject: ClonedProjectResponse = {
        project_path: result.project_path || '',
        project_name: result.project_name || project.name,
        branch: result.branch || project.default_branch,
        last_commit: result.last_commit || { hash: '', message: '' },
        terraform_files: result.terraform_files || [],
        terraform_files_count: result.terraform_files_count || 0,
      };

      setClonedProjects([...clonedProjects, clonedProject]);
      setSuccess(`Successfully cloned ${project.name} with ${result.terraform_files_count} Terraform files`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async (projectPath: string, projectName: string, projectId?: number) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await window.electronAPI.gitlab.pull(projectId || 0);

      if (!result.success) {
        throw new Error(result.error || 'Failed to pull updates');
      }

      setSuccess(`Successfully pulled latest changes for ${projectName}`);
      setClonedProjects(clonedProjects.map(p => 
        ('project_path' in p && p.project_path === projectPath) ? { ...p, ...result } : p
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClonedProject = async (projectId: number, projectName: string) => {
    if (!confirm(`Are you sure you want to remove ${projectName} from saved projects?`)) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await window.electronAPI.gitlab.deleteClonedProject(projectId);

      if (!result.success) {
        throw new Error('Failed to delete project');
      }

      await loadSavedClonedProjects();
      setSuccess(`Successfully removed ${projectName}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignInstance = async (projectId: number, instanceUrl: string) => {
    setAssigningProject(projectId);
    try {
      const result = await window.electronAPI.gitlab.assignProjectToInstance(projectId, instanceUrl);
      if (result.success) {
        await loadSavedClonedProjects();
        setSuccess('Project assigned to instance');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigningProject(null);
    }
  };

  const getInstanceName = (instanceUrl: string | null): string => {
    if (!instanceUrl) return 'Unassigned';
    const instance = gitlabInstances.find(i => i.url === instanceUrl);
    return instance?.name || instanceUrl;
  };

  const filteredClonedProjects = clonedProjects.filter(p => {
    if (selectedInstanceFilter === 'all') return true;
    if (selectedInstanceFilter === 'unassigned') {
      return !('InstanceUrl' in p) || !(p as SavedClonedProject).InstanceUrl;
    }
    if ('InstanceUrl' in p) {
      return (p as SavedClonedProject).InstanceUrl === selectedInstanceFilter;
    }
    return false;
  });

  if (!gitInstalled) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-red-400 font-medium mb-1">Git Not Installed</h3>
            <p className="text-slate-300 text-sm mb-2">
              GitLab integration requires Git to be installed on your system.
            </p>
            <a href="https://git-scm.com/downloads" target="_blank" rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Download Git
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Configure GitLab</h2>
          <p className="text-slate-400">Connect to your GitLab instance to import Terraform projects</p>
        </div>

        {/* Import from Secrets */}
        {secrets.length > 0 && (
          <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">Import credentials from Secrets Manager</span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSecretPicker(!showSecretPicker)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
                >
                  Select Secret
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showSecretPicker && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                    {secrets.map(secret => (
                      <button
                        key={secret.id}
                        type="button"
                        onClick={() => useSecretToken(secret)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm text-slate-300 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="font-medium">{secret.name}</div>
                        <div className="text-xs text-slate-500">{secret.category}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleConfigure} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              GitLab URL
            </label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="gitlab.com"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              For self-hosted: your-gitlab.example.com
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Required scopes: api, read_api, read_repository
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Connecting...' : 'Connect to GitLab'}
          </button>
        </form>
      </div>
    );
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from GitLab? This will not delete cloned projects.')) return;
    
    setLoading(true);
    try {
      const result = await window.electronAPI.gitlab.disconnect();
      if (result.success) {
        setConfigured(false);
        setProjects([]);
        setGroups([]);
        setSuccess('Disconnected from GitLab');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">GitLab Projects</h2>
          <p className="text-slate-400">Connected to: <span className="text-purple-400">{baseURL}</span></p>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          Disconnect
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSearchMode('projects')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchMode === 'projects'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setSearchMode('groups')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchMode === 'groups'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setSearchMode('id')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchMode === 'id'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Project ID
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={
                searchMode === 'id'
                  ? 'Enter project ID (e.g., 12345)'
                  : searchMode === 'groups'
                  ? 'Search groups...'
                  : 'Search projects...'
              }
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            Search
          </button>
          <button
            onClick={loadProjects}
            disabled={loading}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {selectedGroup && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">
                Showing projects from group: <strong>{selectedGroup.name}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedGroup(null);
                loadProjects();
              }}
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {clonedProjects.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FolderGit className="w-5 h-5 text-green-400" />
              Cloned Projects ({filteredClonedProjects.length})
            </h3>
            {gitlabInstances.length > 0 && (
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedInstanceFilter}
                  onChange={(e) => setSelectedInstanceFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Instances</option>
                  <option value="unassigned">Unassigned</option>
                  {gitlabInstances.map(instance => (
                    <option key={instance.id} value={instance.url}>{instance.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {filteredClonedProjects.map((project, idx) => {
              const isResponseProject = 'project_path' in project;
              const isDbProject = 'ProjectID' in project;
              
              if (isResponseProject) {
                const p = project as ClonedProjectResponse;
                return (
                  <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-medium">{p.project_name}</h4>
                        <p className="text-sm text-slate-400 mt-1">{p.project_path}</p>
                      </div>
                      <button
                        onClick={() => handlePull(p.project_path, p.project_name)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded transition-colors flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Pull
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-4 h-4" />
                        {p.branch}
                      </span>
                      <span>{p.terraform_files_count} .tf files</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {p.last_commit.hash.slice(0, 7)}: {p.last_commit.message}
                    </p>
                  </div>
                );
              } else if (isDbProject) {
                const p = project as SavedClonedProject;
                return (
                  <div key={idx} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-white font-medium">{p.Name}</h4>
                        <p className="text-sm text-slate-400 mt-1">{p.LocalPath}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePull(p.LocalPath, p.Name, p.ProjectID)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded transition-colors flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Pull
                        </button>
                        <button
                          onClick={() => handleDeleteClonedProject(p.ProjectID, p.Name)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 text-sm rounded transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-4 h-4" />
                        {p.DefaultBranch || 'main'}
                      </span>
                      <span>Cloned: {new Date(p.ClonedAt).toLocaleDateString()}</span>
                    </div>
                    {/* Instance Assignment */}
                    <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Server className="w-4 h-4 text-slate-500" />
                        <span className={p.InstanceUrl ? 'text-green-400' : 'text-yellow-400'}>
                          {getInstanceName(p.InstanceUrl)}
                        </span>
                      </div>
                      {gitlabInstances.length > 0 && (
                        <div className="relative">
                          <select
                            value={p.InstanceUrl || ''}
                            onChange={(e) => handleAssignInstance(p.ProjectID, e.target.value)}
                            disabled={assigningProject === p.ProjectID}
                            className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                          >
                            <option value="">Assign to instance...</option>
                            {gitlabInstances.map(instance => (
                              <option key={instance.id} value={instance.url}>{instance.name}</option>
                            ))}
                          </select>
                          {assigningProject === p.ProjectID && (
                            <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-purple-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Folder className="w-5 h-5 text-purple-400" />
            Groups ({groups.length})
          </h3>
          <div className="grid gap-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500/50 transition-colors cursor-pointer"
                onClick={() => loadGroupProjects(group)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{group.name}</h4>
                    <p className="text-sm text-slate-400 mt-1">{group.full_path}</p>
                    {group.description && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{group.description}</p>
                    )}
                  </div>
                  <Folder className="w-5 h-5 text-purple-400 ml-4 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          {selectedGroup ? `Projects in ${selectedGroup.name}` : 'Available Projects'} ({projects.length})
        </h3>
        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">{project.name}</h4>
                  <p className="text-sm text-slate-400 mt-1">{project.path_with_namespace}</p>
                  {project.description && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" />
                      {project.default_branch}
                    </span>
                    <span>
                      Updated {new Date(project.last_activity_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleClone(project)}
                  disabled={loading}
                  className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Clone
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && projects.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p>Loading projects...</p>
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No projects found</p>
        </div>
      )}
    </div>
  );
}
