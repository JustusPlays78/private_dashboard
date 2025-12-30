import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Save, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [awsCredentialsText, setAwsCredentialsText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Load saved credentials from localStorage
    const savedAccessKey = localStorage.getItem('aws_access_key_id');
    const savedSecretKey = localStorage.getItem('aws_secret_access_key');
    const savedSessionToken = localStorage.getItem('aws_session_token');

    if (savedAccessKey) setAwsAccessKeyId(savedAccessKey);
    if (savedSecretKey) setAwsSecretAccessKey(savedSecretKey);
    if (savedSessionToken) setAwsSessionToken(savedSessionToken);
  }, []);

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

  const handleSave = () => {
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      setError('Access Key ID and Secret Access Key are required');
      setTimeout(() => setError(''), 5000);
      return;
    }

    // Save to localStorage
    localStorage.setItem('aws_access_key_id', awsAccessKeyId);
    localStorage.setItem('aws_secret_access_key', awsSecretAccessKey);
    localStorage.setItem('aws_session_token', awsSessionToken);

    setSuccess('AWS credentials saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all AWS credentials?')) {
      localStorage.removeItem('aws_access_key_id');
      localStorage.removeItem('aws_secret_access_key');
      localStorage.removeItem('aws_session_token');
      setAwsAccessKeyId('');
      setAwsSecretAccessKey('');
      setAwsSessionToken('');
      setSuccess('AWS credentials cleared');
      setTimeout(() => setSuccess(''), 3000);
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
            <button
              onClick={() => setShowBulkPaste(!showBulkPaste)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showBulkPaste ? 'Manual Input' : 'Bulk Paste'}
            </button>
          </div>

          <p className="text-sm text-slate-400 mb-4">
            These credentials will be used for all Terraform operations. They are stored locally in your browser.
          </p>

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

        {/* Additional Settings (Placeholder) */}
        <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Other Settings</h3>
          <p className="text-sm text-slate-400">
            Additional configuration options will be available here soon.
          </p>
        </div>
      </div>
    </div>
  );
}
