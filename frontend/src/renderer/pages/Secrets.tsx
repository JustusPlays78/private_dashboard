import { useState, useEffect } from 'react'
import {
  Key,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Edit,
  X,
  Check,
  Folder,
  Globe,
  User,
  Lock,
  FileText,
  ChevronDown,
  ChevronRight,
  Shield,
  Download,
  Upload
} from 'lucide-react'

interface Secret {
  id: string
  name: string
  category: string
  username: string | null
  password: string | null
  apiKey: string | null
  notes: string | null
  url: string | null
  createdAt: string
  updatedAt: string
}

const DEFAULT_CATEGORIES = [
  'General',
  'AWS',
  'GitLab',
  'Terraform',
  'Database',
  'API Keys',
  'SSH Keys',
  'Certificates'
]

export default function Secrets() {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null)
  const [showUsername, setShowUsername] = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(DEFAULT_CATEGORIES))
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    username: '',
    password: '',
    apiKey: '',
    notes: '',
    url: ''
  })

  useEffect(() => {
    loadSecrets()

    // Listen for command palette events
    const handleCreateNew = () => {
      resetForm()
      setShowCreateModal(true)
    }
    const handleSelectSecret = (e: CustomEvent) => {
      const secret = secrets.find(s => s.id === e.detail)
      if (secret) setSelectedSecret(secret)
    }

    window.addEventListener('createNewSecret', handleCreateNew)
    window.addEventListener('selectSecret', handleSelectSecret as EventListener)
    
    return () => {
      window.removeEventListener('createNewSecret', handleCreateNew)
      window.removeEventListener('selectSecret', handleSelectSecret as EventListener)
    }
  }, [secrets])

  const loadSecrets = async () => {
    try {
      const result = await window.electronAPI.secrets.getAll()
      if (result.success && result.secrets) {
        setSecrets(result.secrets)
      }
    } catch (error) {
      console.error('Failed to load secrets:', error)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) return

    try {
      const result = await window.electronAPI.secrets.create({
        name: formData.name,
        category: formData.category,
        username: formData.username || undefined,
        password: formData.password || undefined,
        apiKey: formData.apiKey || undefined,
        notes: formData.notes || undefined,
        url: formData.url || undefined
      })

      if (result.success) {
        await loadSecrets()
        setShowCreateModal(false)
        resetForm()
      }
    } catch (error) {
      console.error('Failed to create secret:', error)
    }
  }

  const handleUpdate = async () => {
    if (!selectedSecret || !formData.name.trim()) return

    try {
      const result = await window.electronAPI.secrets.update(selectedSecret.id, {
        name: formData.name,
        category: formData.category,
        username: formData.username || null,
        password: formData.password || null,
        apiKey: formData.apiKey || null,
        notes: formData.notes || null,
        url: formData.url || null
      })

      if (result.success) {
        await loadSecrets()
        setShowEditModal(false)
        setSelectedSecret(null)
        resetForm()
      }
    } catch (error) {
      console.error('Failed to update secret:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await window.electronAPI.secrets.delete(id)
      if (result.success) {
        await loadSecrets()
        if (selectedSecret?.id === id) {
          setSelectedSecret(null)
        }
        setShowDeleteConfirm(null)
      }
    } catch (error) {
      console.error('Failed to delete secret:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'General',
      username: '',
      password: '',
      apiKey: '',
      notes: '',
      url: ''
    })
  }

  const openEditModal = (secret: Secret) => {
    setSelectedSecret(secret)
    setFormData({
      name: secret.name,
      category: secret.category,
      username: secret.username || '',
      password: secret.password || '',
      apiKey: secret.apiKey || '',
      notes: secret.notes || '',
      url: secret.url || ''
    })
    setShowEditModal(true)
  }

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldId)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Group secrets by category
  const groupedSecrets = secrets.reduce((acc, secret) => {
    if (!acc[secret.category]) acc[secret.category] = []
    acc[secret.category].push(secret)
    return acc
  }, {} as Record<string, Secret[]>)

  // Export secrets to JSON file
  const handleExport = () => {
    try {
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        secrets: secrets.map(s => ({
          name: s.name,
          category: s.category,
          username: s.username,
          password: s.password,
          apiKey: s.apiKey,
          notes: s.notes,
          url: s.url
        }))
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `secrets-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export secrets:', error)
    }
  }

  // Import secrets from JSON file
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        if (!data.secrets || !Array.isArray(data.secrets)) {
          throw new Error('Invalid export file format')
        }

        let imported = 0
        for (const secret of data.secrets) {
          if (!secret.name) continue
          
          await window.electronAPI.secrets.create({
            name: secret.name,
            category: secret.category || 'General',
            username: secret.username || undefined,
            password: secret.password || undefined,
            apiKey: secret.apiKey || undefined,
            notes: secret.notes || undefined,
            url: secret.url || undefined
          })
          imported++
        }

        await loadSecrets()
        alert(`Successfully imported ${imported} secrets`)
      } catch (error) {
        console.error('Failed to import secrets:', error)
        alert('Failed to import secrets. Please check the file format.')
      }
    }
    input.click()
  }

  // Filter secrets by search
  const filteredSecrets = searchQuery
    ? secrets.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.url?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                Secrets Manager
              </h1>
              <p className="text-muted-foreground mt-1">
                Securely store and manage your credentials
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={secrets.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
                title="Export Secrets"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-3 py-2 bg-accent text-foreground rounded-lg hover:bg-accent/80 transition-colors"
                title="Import Secrets"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  resetForm()
                  setShowCreateModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Secret
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar - Categories & List */}
        <div className="w-80 border-r border-border bg-card flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search secrets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Secrets List */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredSecrets ? (
              // Search results
              <div className="space-y-1">
                {filteredSecrets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No secrets found</p>
                ) : (
                  filteredSecrets.map(secret => (
                    <SecretListItem
                      key={secret.id}
                      secret={secret}
                      isSelected={selectedSecret?.id === secret.id}
                      onClick={() => setSelectedSecret(secret)}
                    />
                  ))
                )}
              </div>
            ) : (
              // Grouped by category
              <div className="space-y-2">
                {Object.entries(groupedSecrets).map(([category, categorySecrets]) => (
                  <div key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <Folder className="w-4 h-4" />
                      {category}
                      <span className="ml-auto text-xs bg-accent px-2 py-0.5 rounded">
                        {categorySecrets.length}
                      </span>
                    </button>
                    {expandedCategories.has(category) && (
                      <div className="ml-4 space-y-1">
                        {categorySecrets.map(secret => (
                          <SecretListItem
                            key={secret.id}
                            secret={secret}
                            isSelected={selectedSecret?.id === secret.id}
                            onClick={() => setSelectedSecret(secret)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {Object.keys(groupedSecrets).length === 0 && (
                  <div className="text-center py-12">
                    <Key className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No secrets stored yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Add Secret" to get started
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Secret Details */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedSecret ? (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">{selectedSecret.name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(selectedSecret)}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(selectedSecret.id)}
                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Category */}
                <div className="flex items-center gap-3 text-sm">
                  <Folder className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Category:</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded">{selectedSecret.category}</span>
                </div>

                {/* URL */}
                {selectedSecret.url && (
                  <SecretField
                    icon={<Globe className="w-4 h-4" />}
                    label="URL"
                    value={selectedSecret.url}
                    onCopy={() => copyToClipboard(selectedSecret.url!, `url-${selectedSecret.id}`)}
                    copied={copiedField === `url-${selectedSecret.id}`}
                    isLink
                  />
                )}

                {/* Username */}
                {selectedSecret.username && (
                  <SecretField
                    icon={<User className="w-4 h-4" />}
                    label="Username"
                    value={selectedSecret.username}
                    isSecret
                    showValue={showUsername[selectedSecret.id]}
                    onToggleShow={() => setShowUsername(prev => ({ ...prev, [selectedSecret.id]: !prev[selectedSecret.id] }))}
                    onCopy={() => copyToClipboard(selectedSecret.username!, `username-${selectedSecret.id}`)}
                    copied={copiedField === `username-${selectedSecret.id}`}
                  />
                )}

                {/* Password */}
                {selectedSecret.password && (
                  <SecretField
                    icon={<Lock className="w-4 h-4" />}
                    label="Password"
                    value={selectedSecret.password}
                    isSecret
                    showValue={showPassword[selectedSecret.id]}
                    onToggleShow={() => setShowPassword(prev => ({ ...prev, [selectedSecret.id]: !prev[selectedSecret.id] }))}
                    onCopy={() => copyToClipboard(selectedSecret.password!, `password-${selectedSecret.id}`)}
                    copied={copiedField === `password-${selectedSecret.id}`}
                  />
                )}

                {/* API Key */}
                {selectedSecret.apiKey && (
                  <SecretField
                    icon={<Key className="w-4 h-4" />}
                    label="API Key"
                    value={selectedSecret.apiKey}
                    isSecret
                    showValue={showApiKey[selectedSecret.id]}
                    onToggleShow={() => setShowApiKey(prev => ({ ...prev, [selectedSecret.id]: !prev[selectedSecret.id] }))}
                    onCopy={() => copyToClipboard(selectedSecret.apiKey!, `apikey-${selectedSecret.id}`)}
                    copied={copiedField === `apikey-${selectedSecret.id}`}
                  />
                )}

                {/* Notes */}
                {selectedSecret.notes && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <FileText className="w-4 h-4" />
                      Notes
                    </div>
                    <div className="p-4 bg-accent rounded-lg whitespace-pre-wrap text-sm">
                      {selectedSecret.notes}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="pt-6 border-t border-border text-xs text-muted-foreground">
                  <p>Created: {new Date(selectedSecret.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedSecret.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <Key className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">Select a secret to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                {showCreateModal ? 'Add New Secret' : 'Edit Secret'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
                className="p-1 hover:bg-accent rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., AWS Production"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DEFAULT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Username or email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">API Key / Token</label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="API key or access token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={showCreateModal ? handleCreate : handleUpdate}
                disabled={!formData.name.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {showCreateModal ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Secret</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this secret? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper Components

function SecretListItem({ 
  secret, 
  isSelected, 
  onClick 
}: { 
  secret: Secret
  isSelected: boolean
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
        isSelected 
          ? 'bg-primary text-primary-foreground' 
          : 'hover:bg-accent'
      }`}
    >
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{secret.name}</span>
      </div>
    </button>
  )
}

function SecretField({
  icon,
  label,
  value,
  isSecret = false,
  showValue = true,
  onToggleShow,
  onCopy,
  copied,
  isLink = false
}: {
  icon: React.ReactNode
  label: string
  value: string
  isSecret?: boolean
  showValue?: boolean
  onToggleShow?: () => void
  onCopy: () => void
  copied: boolean
  isLink?: boolean
}) {
  const displayValue = isSecret && !showValue ? '••••••••••••' : value

  return (
    <div className="flex items-center gap-3 p-3 bg-accent rounded-lg group">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {isLink ? (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate block"
          >
            {value}
          </a>
        ) : (
          <div className="font-mono text-sm truncate">{displayValue}</div>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isSecret && onToggleShow && (
          <button
            onClick={onToggleShow}
            className="p-1.5 hover:bg-background rounded"
            title={showValue ? 'Hide' : 'Show'}
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={onCopy}
          className="p-1.5 hover:bg-background rounded"
          title="Copy"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
