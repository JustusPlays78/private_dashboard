import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Save, CheckCircle, AlertCircle, ExternalLink, Shield, ChevronDown, GitBranch, Plus, Trash2, Edit2, X, Eye, EyeOff, Download, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Secret {
  id: string;
  name: string;
  category: string;
  username: string | null;
  password: string | null;
  apiKey: string | null;
  url: string | null;
}

interface GitLabInstance {
  id: string;
  name: string;
  url: string;
  token: string;
}

export default function Settings() {
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [awsDefaultRegion, setAwsDefaultRegion] = useState('eu-central-1');
  const [awsCredentialsText, setAwsCredentialsText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [awsSecrets, setAwsSecrets] = useState<Secret[]>([]);
  const [showSecretPicker, setShowSecretPicker] = useState(false);
  const [selectedSecretId, setSelectedSecretId] = useState<string | null>(null);

  const AWS_REGIONS = [
    { value: 'eu-central-1', label: 'EU (Frankfurt)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'eu-west-2', label: 'EU (London)' },
    { value: 'eu-west-3', label: 'EU (Paris)' },
    { value: 'eu-north-1', label: 'EU (Stockholm)' },
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  ];

  // GitLab State
  const [gitlabInstances, setGitlabInstances] = useState<GitLabInstance[]>([]);
  const [showGitLabModal, setShowGitLabModal] = useState(false);
  const [editingGitLab, setEditingGitLab] = useState<GitLabInstance | null>(null);
  const [gitlabForm, setGitlabForm] = useState({ name: '', url: '', token: '' });
  const [showGitLabToken, setShowGitLabToken] = useState(false);

  useEffect(() => {
    loadAwsCredentials();
    loadAwsSecrets();
    loadGitLabInstances();
  }, []);

  const loadGitLabInstances = async () => {
    try {
      const result = await window.electronAPI.secrets.getAll();
      if (result.success && result.secrets) {
        // Filter GitLab secrets
        const gitlabSecrets = result.secrets.filter(
          (s: Secret) => s.category === 'GitLab' && s.url
        );
        setGitlabInstances(gitlabSecrets.map((s: Secret) => ({
          id: s.id,
          name: s.name,
          url: s.url || '',
          token: s.apiKey || s.password || ''
        })));
      }
    } catch (err) {
      console.error('Failed to load GitLab instances:', err);
    }
  };

  const handleSaveGitLab = async () => {
    if (!gitlabForm.name.trim() || !gitlabForm.url.trim() || !gitlabForm.token.trim()) {
      setError('All GitLab fields are required');
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      if (editingGitLab) {
        // Update existing
        await window.electronAPI.secrets.update(editingGitLab.id, {
          name: gitlabForm.name.trim(),
          category: 'GitLab',
          url: gitlabForm.url.trim().replace(/\/$/, ''), // Remove trailing slash
          apiKey: gitlabForm.token.trim(),
          notes: `GitLab instance: ${gitlabForm.url.trim()}`
        });
        setSuccess(`GitLab instance "${gitlabForm.name}" updated!`);
      } else {
        // Create new
        await window.electronAPI.secrets.create({
          name: gitlabForm.name.trim(),
          category: 'GitLab',
          url: gitlabForm.url.trim().replace(/\/$/, ''),
          apiKey: gitlabForm.token.trim(),
          notes: `GitLab instance: ${gitlabForm.url.trim()}`
        });
        setSuccess(`GitLab instance "${gitlabForm.name}" added!`);
      }

      await loadGitLabInstances();
      resetGitLabForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to save GitLab instance: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDeleteGitLab = async (instance: GitLabInstance) => {
    if (!confirm(`Delete GitLab instance "${instance.name}"?`)) return;

    try {
      await window.electronAPI.secrets.delete(instance.id);
      await loadGitLabInstances();
      setSuccess(`GitLab instance "${instance.name}" deleted`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete GitLab instance:', err);
    }
  };

  const editGitLab = (instance: GitLabInstance) => {
    setEditingGitLab(instance);
    setGitlabForm({
      name: instance.name,
      url: instance.url,
      token: instance.token
    });
    setShowGitLabModal(true);
  };

  const resetGitLabForm = () => {
    setGitlabForm({ name: '', url: '', token: '' });
    setEditingGitLab(null);
    setShowGitLabModal(false);
    setShowGitLabToken(false);
  };

  const loadAwsSecrets = async () => {
    try {
      const result = await window.electronAPI.secrets.getAll();
      if (result.success && result.secrets) {
        // Filter to only show secrets with AWS category or containing access keys
        const filtered = result.secrets.filter(
          (s: Secret) => s.category === 'AWS' || s.name.toLowerCase().includes('aws')
        );
        setAwsSecrets(filtered);
      }
    } catch (err) {
      console.error('Failed to load AWS secrets:', err);
    }
  };

  const loadAwsCredentials = async () => {
    // First, try to load from encrypted database
    try {
      const result = await window.electronAPI.secrets.getAll();
      if (result.success && result.secrets) {
        // Look for an AWS credentials secret with special name
        const awsCreds = result.secrets.find((s: Secret) => s.id === 'aws-default-credentials');
        if (awsCreds) {
          if (awsCreds.username) setAwsAccessKeyId(awsCreds.username);
          if (awsCreds.password) setAwsSecretAccessKey(awsCreds.password);
          if (awsCreds.apiKey) setAwsSessionToken(awsCreds.apiKey);
          // Load region from notes field (JSON)
          if (awsCreds.url) setAwsDefaultRegion(awsCreds.url); // Store region in url field
          setSelectedSecretId(awsCreds.id);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load from encrypted storage:', err);
    }

    // Fallback: Load from localStorage (migrate old data)
    const savedAccessKey = localStorage.getItem('aws_access_key_id');
    const savedSecretKey = localStorage.getItem('aws_secret_access_key');
    const savedSessionToken = localStorage.getItem('aws_session_token');

    if (savedAccessKey) setAwsAccessKeyId(savedAccessKey);
    if (savedSecretKey) setAwsSecretAccessKey(savedSecretKey);
    if (savedSessionToken) setAwsSessionToken(savedSessionToken);
  };

  const useSecretCredentials = (secret: Secret) => {
    if (secret.username) setAwsAccessKeyId(secret.username);
    if (secret.password) setAwsSecretAccessKey(secret.password);
    if (secret.apiKey) setAwsSessionToken(secret.apiKey);
    setSelectedSecretId(secret.id);
    setShowSecretPicker(false);
    setSuccess(`Using credentials from "${secret.name}"`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const parseAwsCredentials = (text: string) => {
    const lines = text.split('\n');
    let accessKey = '';
    let secretKey = '';
    let sessionToken = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('export AWS_ACCESS_KEY_ID=')) {
        accessKey = trimmed.replace('export AWS_ACCESS_KEY_ID=', '').replace(/['"]/g, '');
      } else if (trimmed.startsWith('export AWS_SECRET_ACCESS_KEY=')) {
        secretKey = trimmed.replace('export AWS_SECRET_ACCESS_KEY=', '').replace(/['"]/g, '');
      } else if (trimmed.startsWith('export AWS_SESSION_TOKEN=')) {
        sessionToken = trimmed.replace('export AWS_SESSION_TOKEN=', '').replace(/['"]/g, '');
      }
    }

    if (accessKey && secretKey) {
      setAwsAccessKeyId(accessKey);
      setAwsSecretAccessKey(secretKey);
      setAwsSessionToken(sessionToken);
      setAwsCredentialsText('');
      setShowBulkPaste(false);
      setSuccess('AWS credentials parsed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Failed to parse AWS credentials. Make sure they are in export format.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleSave = async () => {
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      setError('Access Key ID and Secret Access Key are required');
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      // First, delete any existing AWS credentials secrets (cleanup duplicates)
      const allSecrets = await window.electronAPI.secrets.getAll();
      if (allSecrets.success && allSecrets.secrets) {
        const awsSecrets = allSecrets.secrets.filter(
          (s: Secret) => s.id === 'aws-default-credentials' || 
          (s.category === 'AWS' && s.name === 'AWS Default Credentials')
        );
        for (const secret of awsSecrets) {
          await window.electronAPI.secrets.delete(secret.id);
        }
      }

      // Create new with fixed ID
      await window.electronAPI.secrets.create({
        id: 'aws-default-credentials',
        name: 'AWS Default Credentials',
        category: 'AWS',
        username: awsAccessKeyId,
        password: awsSecretAccessKey,
        apiKey: awsSessionToken || undefined,
        url: awsDefaultRegion, // Store region in url field
        notes: 'Default AWS credentials used for Terraform operations'
      });

      // Clear old localStorage data (migration)
      localStorage.removeItem('aws_access_key_id');
      localStorage.removeItem('aws_secret_access_key');
      localStorage.removeItem('aws_session_token');

      setSelectedSecretId('aws-default-credentials');
      setSuccess('AWS credentials saved securely!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to save credentials: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Export all settings to JSON
  const handleExportSettings = async () => {
    try {
      const secretsResult = await window.electronAPI.secrets.getAll();
      const iframesResult = await window.electronAPI.iframes.getAll();
      
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: {
          awsDefaultRegion: awsDefaultRegion,
        },
        gitlabInstances: gitlabInstances.map(i => ({
          name: i.name,
          url: i.url,
          // Note: tokens are not exported for security
        })),
        iframePages: iframesResult.pages || [],
        secrets: (secretsResult.secrets || []).map((s: Secret) => ({
          name: s.name,
          category: s.category,
          url: s.url,
          // Note: passwords/apiKeys are not exported for security
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Settings exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to export settings: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Import settings from JSON
  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.version || data.version !== 1) {
          throw new Error('Invalid settings file format');
        }

        let imported = 0;

        // Import iframe pages
        if (data.iframePages && Array.isArray(data.iframePages)) {
          for (const page of data.iframePages) {
            if (!page.name || !page.url) continue;
            await window.electronAPI.iframes.create({
              name: page.name,
              url: page.url,
              category: page.category || 'General',
              icon: page.icon || 'Monitor',
              position: page.position || 0,
            });
            imported++;
          }
        }

        // Import AWS region setting
        if (data.settings?.awsDefaultRegion) {
          setAwsDefaultRegion(data.settings.awsDefaultRegion);
        }

        setSuccess(`Successfully imported ${imported} items!`);
        setTimeout(() => setSuccess(''), 3000);

        // Reload data
        await loadGitLabInstances();
        window.dispatchEvent(new CustomEvent('iframesUpdated'));
      } catch (err: any) {
        setError('Failed to import settings: ' + err.message);
        setTimeout(() => setError(''), 5000);
      }
    };
    input.click();
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all AWS credentials?')) {
      try {
        // Remove from encrypted database
        await window.electronAPI.secrets.delete('aws-default-credentials');
        
        // Clear localStorage (cleanup)
        localStorage.removeItem('aws_access_key_id');
        localStorage.removeItem('aws_secret_access_key');
        localStorage.removeItem('aws_session_token');
        
        setAwsAccessKeyId('');
        setAwsSecretAccessKey('');
        setAwsSessionToken('');
        setSelectedSecretId(null);
        setSuccess('AWS credentials cleared');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Failed to clear credentials:', err);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-purple-400" />
          Settings
        </h2>
        <p className="text-slate-400">Configure global AWS credentials and other settings</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Link
          to="/settings/iframes"
          className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:bg-slate-750 hover:border-blue-500/50 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <ExternalLink className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">IFrame Seiten</h3>
              <p className="text-sm text-slate-400">Verwalte eigene IFrame-Seiten</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="max-w-2xl">
        {/* AWS Credentials Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">AWS Credentials</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkPaste(!showBulkPaste)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {showBulkPaste ? 'Manual Input' : 'Bulk Paste'}
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-400 mb-4">
            These credentials will be used for all Terraform operations. They are stored <strong>encrypted</strong> in your local database.
          </p>

          {/* Import from Secrets */}
          {awsSecrets.length > 0 && (
            <div className="mb-4 p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-300">Import from Secrets Manager</span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSecretPicker(!showSecretPicker)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Select Secret
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showSecretPicker && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                      {awsSecrets.map(secret => (
                        <button
                          key={secret.id}
                          type="button"
                          onClick={() => useSecretCredentials(secret)}
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

          {showBulkPaste ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Paste AWS Credentials (export format)
                </label>
                <textarea
                  value={awsCredentialsText}
                  onChange={(e) => setAwsCredentialsText(e.target.value)}
                  placeholder="export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=..."
                  rows={8}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-xs"
                />
              </div>
              <button
                onClick={() => parseAwsCredentials(awsCredentialsText)}
                disabled={!awsCredentialsText}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Parse Credentials
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  AWS Access Key ID *
                </label>
                <input
                  type="text"
                  value={awsAccessKeyId}
                  onChange={(e) => setAwsAccessKeyId(e.target.value)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  AWS Secret Access Key *
                </label>
                <input
                  type="password"
                  value={awsSecretAccessKey}
                  onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  AWS Session Token (optional)
                </label>
                <textarea
                  value={awsSessionToken}
                  onChange={(e) => setAwsSessionToken(e.target.value)}
                  placeholder="For temporary credentials..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Default AWS Region
                </label>
                <select
                  value={awsDefaultRegion}
                  onChange={(e) => setAwsDefaultRegion(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  {AWS_REGIONS.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label} ({region.value})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  This region will be used as default for AWS resources and Terraform operations.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-700">
            <button
              onClick={handleSave}
              disabled={!awsAccessKeyId || !awsSecretAccessKey}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Credentials
            </button>
            
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              💡 <strong>Tip:</strong> You can paste your AWS credentials export directly using the "Bulk Paste" option.
              Get them from AWS SSO → Command line or programmatic access.
            </p>
          </div>
        </div>

        {/* GitLab Instances Section */}
        <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">GitLab Instances</h3>
            </div>
            <button
              onClick={() => {
                resetGitLabForm();
                setShowGitLabModal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Instance
            </button>
          </div>

          <p className="text-sm text-slate-400 mb-4">
            Configure GitLab instances with permanent access tokens. Tokens are stored <strong>encrypted</strong> in your Secrets Manager.
          </p>

          {gitlabInstances.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No GitLab instances configured</p>
              <p className="text-sm mt-1">Add your first GitLab instance to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {gitlabInstances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 border border-slate-600 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <GitBranch className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{instance.name}</h4>
                      <p className="text-sm text-slate-400">{instance.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => editGitLab(instance)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGitLab(instance)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <p className="text-xs text-orange-300">
              💡 <strong>Tip:</strong> Create a Personal Access Token in GitLab with <code>read_api</code>, <code>read_repository</code> scopes.
              Go to GitLab → Settings → Access Tokens.
            </p>
          </div>
        </div>

        {/* Export/Import Settings */}
        <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Export / Import Settings</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Export your settings (IFrame pages, GitLab instances) to a JSON file for backup or transfer to another machine.
            Note: Sensitive data like passwords and API tokens are <strong>not</strong> exported for security.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportSettings}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Settings
            </button>
            <button
              onClick={handleImportSettings}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import Settings
            </button>
          </div>
        </div>
      </div>

      {/* GitLab Modal */}
      {showGitLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetGitLabForm} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                {editingGitLab ? 'Edit GitLab Instance' : 'Add GitLab Instance'}
              </h3>
              <button onClick={resetGitLabForm} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Instance Name *
                </label>
                <input
                  type="text"
                  value={gitlabForm.name}
                  onChange={(e) => setGitlabForm({ ...gitlabForm, name: e.target.value })}
                  placeholder="e.g., Company GitLab"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  GitLab URL *
                </label>
                <input
                  type="url"
                  value={gitlabForm.url}
                  onChange={(e) => setGitlabForm({ ...gitlabForm, url: e.target.value })}
                  placeholder="https://gitlab.example.com"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Personal Access Token *
                </label>
                <div className="relative">
                  <input
                    type={showGitLabToken ? 'text' : 'password'}
                    value={gitlabForm.token}
                    onChange={(e) => setGitlabForm({ ...gitlabForm, token: e.target.value })}
                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGitLabToken(!showGitLabToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showGitLabToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={resetGitLabForm}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGitLab}
                disabled={!gitlabForm.name || !gitlabForm.url || !gitlabForm.token}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingGitLab ? 'Update' : 'Add Instance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
