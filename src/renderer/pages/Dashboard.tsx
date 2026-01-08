import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Activity, 
  Server, 
  Database, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  XCircle,
  Play,
  Trash2,
  Cloud,
  Key,
  X,
  FileText,
  Command,
  Calendar,
  Boxes,
  HardDrive,
  Container,
  Globe,
  Shield
} from 'lucide-react'
import { useAppState } from '../hooks/useAppState'

interface StatsCard {
  title: string
  value: string
  change?: string
  icon: any
  trend?: 'up' | 'down'
  status?: 'success' | 'warning' | 'error'
  href?: string
}

interface Deployment {
  id: number
  projectName: string
  action: string
  status: string
  startedAt: string
  completedAt: string | null
  summaryAdd: number
  summaryChange: number
  summaryDestroy: number
  output?: string
}

interface AWSStats {
  ec2Instances: number
  ec2Running: number
  s3Buckets: number
  lambdaFunctions: number
  rdsInstances: number
  ecsClusters: number
  ecsServices: number
  loadBalancers: number
  securityGroups: number
  loading: boolean
  error: string | null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const appState = useAppState()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState<StatsCard[]>([
    { title: 'Terraform Projects', value: '0', icon: Server, status: 'success', href: '/terraform' },
    { title: 'Total Deployments', value: '0', icon: Database, status: 'success' },
    { title: 'Secrets', value: '0', icon: Key, status: 'success', href: '/secrets' },
    { title: 'AWS Resources', value: '-', icon: Cloud, status: 'success', href: '/aws' },
  ])
  const [awsStats, setAwsStats] = useState<AWSStats>({
    ec2Instances: 0,
    ec2Running: 0,
    s3Buckets: 0,
    lambdaFunctions: 0,
    rdsInstances: 0,
    ecsClusters: 0,
    ecsServices: 0,
    loadBalancers: 0,
    securityGroups: 0,
    loading: false,
    error: null
  })

  const [recentActivity, setRecentActivity] = useState<Deployment[]>([])
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null)

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    checkBackendHealth()
    loadDashboardData()
    loadRecentActivity()
    loadAWSStats()
  }, [])

  const checkBackendHealth = async () => {
    try {
      const status = await window.electronAPI.auth.status()
      if (status.unlocked) {
        setBackendStatus('connected')
      }
    } catch {
      setBackendStatus('disconnected')
    }
  }

  const loadDashboardData = async () => {
    try {
      const data = await window.electronAPI.dashboard.stats()
      
      // Also load secrets count
      let secretsCount = 0
      try {
        const secretsResult = await window.electronAPI.secrets.getAll()
        if (secretsResult.success && secretsResult.secrets) {
          secretsCount = secretsResult.secrets.length
        }
      } catch (e) {
        console.error('Failed to load secrets count:', e)
      }

      // Try to get AWS resource count
      let awsCount = '-'
      try {
        const awsSecrets = await window.electronAPI.secrets.getAll()
        if (awsSecrets.success && awsSecrets.secrets) {
          const awsCreds = awsSecrets.secrets.find((s: any) => 
            s.id === 'aws-default-credentials' || 
            (s.category === 'AWS' && s.username && s.password)
          )
          if (awsCreds) {
            awsCount = '✓'  // Has credentials configured
          }
        }
      } catch (e) {
        console.error('Failed to check AWS:', e)
      }

      setStats([
        { title: 'Terraform Projects', value: String(data.terraform_states || 0), icon: Server, status: 'success', href: '/terraform' },
        { title: 'Total Deployments', value: String(data.total_deployments || 0), icon: Database, status: 'success' },
        { title: 'Secrets', value: String(secretsCount), icon: Key, status: 'success', href: '/secrets' },
        { title: 'AWS Resources', value: awsCount, icon: Cloud, status: awsCount === '✓' ? 'success' : 'warning', href: '/aws' },
      ])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const loadRecentActivity = async () => {
    try {
      const result = await window.electronAPI.deployments.getAll()
      if (result.success && result.deployments) {
        // Get last 10 deployments, sorted by date
        const sorted = result.deployments
          .sort((a: Deployment, b: Deployment) => 
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
          )
          .slice(0, 10)
        setRecentActivity(sorted)
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error)
    }
  }

  const loadAWSStats = async () => {
    // Use preloaded credentials if available
    if (!appState.awsCredentials.configured) {
      return
    }

    setAwsStats(prev => ({ ...prev, loading: true, error: null }))

    try {
      const credentials = {
        accessKeyId: appState.awsCredentials.accessKeyId!,
        secretAccessKey: appState.awsCredentials.secretAccessKey!,
        sessionToken: appState.awsCredentials.sessionToken,
        region: appState.awsCredentials.region || 'eu-central-1'
      }

      const result = await window.electronAPI.aws.getResources(credentials)
      
      if (result.success && result.resources) {
        const r = result.resources
        setAwsStats({
          ec2Instances: r.ec2Instances?.length || 0,
          ec2Running: r.ec2Instances?.filter((i: any) => i.state === 'running').length || 0,
          s3Buckets: r.s3Buckets?.length || 0,
          lambdaFunctions: r.lambdaFunctions?.length || 0,
          rdsInstances: r.rdsInstances?.length || 0,
          ecsClusters: r.ecsClusters?.length || 0,
          ecsServices: r.ecsServices?.length || 0,
          loadBalancers: r.loadBalancers?.length || 0,
          securityGroups: r.securityGroups?.length || 0,
          loading: false,
          error: null
        })
      } else {
        setAwsStats(prev => ({ ...prev, loading: false, error: result.error || 'Failed to load' }))
      }
    } catch (error: any) {
      setAwsStats(prev => ({ ...prev, loading: false, error: error.message }))
    }
  }

  const getActivityIcon = (deployment: Deployment) => {
    if (deployment.status === 'running') {
      return <Play className="w-4 h-4 text-blue-400" />
    }
    if (deployment.status === 'failed') {
      return <XCircle className="w-4 h-4 text-red-400" />
    }
    if (deployment.action === 'destroy') {
      return <Trash2 className="w-4 h-4 text-orange-400" />
    }
    return <CheckCircle2 className="w-4 h-4 text-green-400" />
  }

  const getActivityColor = (deployment: Deployment) => {
    if (deployment.status === 'running') return 'text-blue-400'
    if (deployment.status === 'failed') return 'text-red-400'
    if (deployment.action === 'destroy') return 'text-orange-400'
    return 'text-green-400'
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Date/Time */}
      <div className="border-b border-border bg-card">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back! Here's your infrastructure overview.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Date & Time Display */}
              <div className="text-right">
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-2xl font-mono font-bold">
                    {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {currentTime.toLocaleDateString('de-DE', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
              {/* Status Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                backendStatus === 'connected' 
                  ? 'bg-green-500/10 text-green-500' 
                  : 'bg-red-500/10 text-red-500'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  backendStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`} />
                {backendStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                onClick={() => stat.href && navigate(stat.href)}
                className={`bg-card border border-border rounded-xl p-6 card-hover ${stat.href ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    {stat.change && (
                      <p className={`text-sm mt-2 flex items-center gap-1 ${
                        stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        <TrendingUp className="w-4 h-4" />
                        {stat.change}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${
                    stat.status === 'success' ? 'bg-green-500/10 text-green-500' :
                    stat.status === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-primary/10 text-primary'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* AWS Resources Overview */}
        {appState.awsCredentials.configured && (
          <div className="bg-gradient-to-br from-orange-500/10 via-card to-amber-500/5 border border-orange-500/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Cloud className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">AWS Resources</h2>
                  <p className="text-sm text-muted-foreground">Region: {appState.awsCredentials.region || 'eu-central-1'}</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/aws')}
                className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                View All →
              </button>
            </div>

            {awsStats.loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-400 border-t-transparent" />
              </div>
            ) : awsStats.error ? (
              <div className="flex items-center gap-2 text-red-400 py-4">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{awsStats.error}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div 
                  onClick={() => navigate('/aws')}
                  className="bg-card/50 border border-border/50 rounded-lg p-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-muted-foreground">EC2 Instances</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{awsStats.ec2Instances}</p>
                  <p className="text-xs text-green-400">{awsStats.ec2Running} running</p>
                </div>

                <div 
                  onClick={() => navigate('/aws')}
                  className="bg-card/50 border border-border/50 rounded-lg p-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-muted-foreground">S3 Buckets</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{awsStats.s3Buckets}</p>
                </div>

                <div 
                  onClick={() => navigate('/aws')}
                  className="bg-card/50 border border-border/50 rounded-lg p-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">Lambda</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{awsStats.lambdaFunctions}</p>
                </div>

                <div 
                  onClick={() => navigate('/aws')}
                  className="bg-card/50 border border-border/50 rounded-lg p-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Container className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-muted-foreground">ECS</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{awsStats.ecsClusters}</p>
                  <p className="text-xs text-muted-foreground">{awsStats.ecsServices} services</p>
                </div>

                <div 
                  onClick={() => navigate('/aws')}
                  className="bg-card/50 border border-border/50 rounded-lg p-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-muted-foreground">RDS</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{awsStats.rdsInstances}</p>
                </div>

                <div 
                  onClick={() => navigate('/aws')}
                  className="bg-card/50 border border-border/50 rounded-lg p-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-muted-foreground">Load Balancers</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{awsStats.loadBalancers}</p>
                </div>

                <div 
                  onClick={() => navigate('/aws')}
                  className="bg-card/50 border border-border/50 rounded-lg p-4 cursor-pointer hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-muted-foreground">Security Groups</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{awsStats.securityGroups}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Deploy your first infrastructure to see activity here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((deployment) => (
                  <div 
                    key={deployment.id} 
                    onClick={() => setSelectedDeployment(deployment)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                  >
                    {getActivityIcon(deployment)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {deployment.projectName}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getActivityColor(deployment)} bg-current/10`}>
                          {deployment.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(deployment.startedAt)}</p>
                        {deployment.status === 'completed' && (
                          <p className="text-xs text-muted-foreground">
                            +{deployment.summaryAdd} ~{deployment.summaryChange} -{deployment.summaryDestroy}
                          </p>
                        )}
                      </div>
                    </div>
                    <FileText className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
              <Zap className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/terraform')}
                className="w-full text-left px-4 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-all group btn-glow"
              >
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                      Terraform Deployments
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Deploy AWS infrastructure
                    </p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/aws-resources')}
                className="w-full text-left px-4 py-3 bg-accent hover:bg-accent/80 border border-border rounded-lg transition-all hover-lift"
              >
                <div className="flex items-center gap-3">
                  <Cloud className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="font-medium text-foreground">AWS Resources</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      View your cloud infrastructure
                    </p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate('/secrets')}
                className="w-full text-left px-4 py-3 bg-accent hover:bg-accent/80 border border-border rounded-lg transition-all hover-lift"
              >
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="font-medium text-foreground">Secrets Manager</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage credentials &amp; API keys
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-primary/10 border border-primary/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Command className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Quick Tip</h3>
              <p className="text-sm text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-accent rounded text-xs font-mono">Ctrl+K</kbd> anywhere to open the command palette and quickly navigate or search.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Log Modal */}
      {selectedDeployment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDeployment(null)}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Deployment Log</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDeployment.projectName} • {selectedDeployment.action}
                </p>
              </div>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Deployment Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    selectedDeployment.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                    selectedDeployment.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {selectedDeployment.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Action</p>
                  <p className="text-sm font-medium text-foreground">{selectedDeployment.action}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Started</p>
                  <p className="text-sm text-foreground">
                    {new Date(selectedDeployment.startedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Completed</p>
                  <p className="text-sm text-foreground">
                    {selectedDeployment.completedAt 
                      ? new Date(selectedDeployment.completedAt).toLocaleString()
                      : 'In progress...'}
                  </p>
                </div>
                {selectedDeployment.status === 'completed' && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Summary</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-400">+{selectedDeployment.summaryAdd} added</span>
                      <span className="text-yellow-400">~{selectedDeployment.summaryChange} changed</span>
                      <span className="text-red-400">-{selectedDeployment.summaryDestroy} destroyed</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Log Output */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Output</p>
                <pre className="bg-background border border-border rounded-lg p-4 text-xs font-mono text-foreground overflow-auto max-h-[300px] whitespace-pre-wrap">
                  {selectedDeployment.output || 'No output available for this deployment.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
