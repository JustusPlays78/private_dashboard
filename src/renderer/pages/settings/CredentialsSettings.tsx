import { useState, useEffect } from 'react';
import { Key, Save, CheckCircle, AlertCircle, Shield, ChevronDown, Cloud, Trash2 } from 'lucide-react';

interface Secret {
  id: string;
  name: string;
  category: string;
  username: string | null;
  password: string | null;
  apiKey: string | null;
  url: string | null;
}

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

export default function CredentialsSettings() {
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

  useEffect(() => {
    loadAwsCredentials();
    loadAwsSecrets();
  }, []);

  const loadAwsSecrets = async () => {
    try {
      const result = await window.electronAPI.secrets.getAll();
      if (result.success && result.secrets) {
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
    try {
      const result = await window.electronAPI.secrets.getAll();
      if (result.success && result.secrets) {
        const awsCreds = result.secrets.find((s: Secret) => s.id === 'aws-default-credentials');
        if (awsCreds) {
          if (awsCreds.username) setAwsAccessKeyId(awsCreds.username);
          if (awsCreds.password) setAwsSecretAccessKey(awsCreds.password);
          if (awsCreds.apiKey) setAwsSessionToken(awsCreds.apiKey);
          if (awsCreds.url) setAwsDefaultRegion(awsCreds.url);
          setSelectedSecretId(awsCreds.id);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load from encrypted storage:', err);
    }
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
      const allSecrets = await window.electronAPI.secrets.getAll();
      if (allSecrets.success && allSecrets.secrets) {
        const existing = allSecrets.secrets.filter(
          (s: Secret) => s.id === 'aws-default-credentials'
        );
        for (const secret of existing) {
          await window.electronAPI.secrets.delete(secret.id);
        }
      }

      await window.electronAPI.secrets.create({
        id: 'aws-default-credentials',
        name: 'AWS Default Credentials',
        category: 'AWS',
        username: awsAccessKeyId,
        password: awsSecretAccessKey,
        apiKey: awsSessionToken || undefined,
        url: awsDefaultRegion,
        notes: 'Default AWS credentials used for Terraform operations'
      });

      setSelectedSecretId('aws-default-credentials');
      setSuccess('AWS credentials saved securely!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to save credentials: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all AWS credentials?')) {
      try {
        await window.electronAPI.secrets.delete('aws-default-credentials');
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
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Key className="w-7 h-7 text-amber-400" />
          Cloud Credentials
        </h1>
        <p className="text-muted-foreground mt-1">
          Verwalte deine Cloud-Zugangsdaten für AWS, Azure und andere Dienste
        </p>
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

      {/* AWS Credentials */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">AWS Credentials</h2>
          </div>
          <button
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {showBulkPaste ? 'Manual Input' : 'Bulk Paste'}
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Diese Credentials werden für alle Terraform-Operationen verwendet. Sie werden <strong>verschlüsselt</strong> in deiner lokalen Datenbank gespeichert.
        </p>

        {/* Import from Secrets */}
        {awsSecrets.length > 0 && (
          <div className="mb-4 p-3 bg-muted/50 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Import from Secrets Manager</span>
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
                  <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-10">
                    {awsSecrets.map(secret => (
                      <button
                        key={secret.id}
                        type="button"
                        onClick={() => useSecretCredentials(secret)}
                        className="w-full text-left px-4 py-2 hover:bg-muted text-sm text-foreground first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="font-medium">{secret.name}</div>
                        <div className="text-xs text-muted-foreground">{secret.category}</div>
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
              <label className="block text-sm font-medium text-foreground mb-2">
                Paste AWS Credentials (export format)
              </label>
              <textarea
                value={awsCredentialsText}
                onChange={(e) => setAwsCredentialsText(e.target.value)}
                placeholder="export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=..."
                rows={8}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary font-mono text-xs"
              />
            </div>
            <button
              onClick={() => parseAwsCredentials(awsCredentialsText)}
              disabled={!awsCredentialsText}
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors"
            >
              Parse Credentials
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                AWS Access Key ID *
              </label>
              <input
                type="text"
                value={awsAccessKeyId}
                onChange={(e) => setAwsAccessKeyId(e.target.value)}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                AWS Secret Access Key *
              </label>
              <input
                type="password"
                value={awsSecretAccessKey}
                onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                AWS Session Token (optional)
              </label>
              <textarea
                value={awsSessionToken}
                onChange={(e) => setAwsSessionToken(e.target.value)}
                placeholder="For temporary credentials..."
                rows={3}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Default AWS Region
              </label>
              <select
                value={awsDefaultRegion}
                onChange={(e) => setAwsDefaultRegion(e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              >
                {AWS_REGIONS.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label} ({region.value})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
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
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-400">
            💡 <strong>Tip:</strong> Du kannst deine AWS Credentials direkt über "Bulk Paste" einfügen.
            Hole sie von AWS SSO → Command line or programmatic access.
          </p>
        </div>
      </div>
    </div>
  );
}
