import { useEffect, useState } from 'react'
import { 
  Activity, 
  Server, 
  Database, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react'

interface StatsCard {
  title: string
  value: string
  change?: string
  icon: any
  trend?: 'up' | 'down'
  status?: 'success' | 'warning' | 'error'
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsCard[]>([
    { title: 'AWS Resources', value: '0', icon: Server, status: 'success' },
    { title: 'Terraform States', value: '0', icon: Database, status: 'success' },
    { title: 'Active Deployments', value: '0', icon: Activity, status: 'warning' },
    { title: 'Cost This Month', value: '$0', change: '+0%', icon: TrendingUp, trend: 'up' },
  ])

  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected'>('disconnected')

  useEffect(() => {
    checkBackendHealth()
    loadDashboardData()
  }, [])

  const checkBackendHealth = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/health')
      if (response.ok) {
        setBackendStatus('connected')
      }
    } catch {
      setBackendStatus('disconnected')
    }
  }

  const loadDashboardData = async () => {
    try {
      // TODO: Load real data from backend
      // const response = await fetch('http://localhost:8080/api/dashboard/stats')
      // const data = await response.json()
      // setStats(data.stats)
      // setRecentActivity(data.recentActivity)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back! Here's your infrastructure overview.
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                className="bg-card border border-border rounded-xl p-6 card-hover cursor-pointer"
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
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
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
              <button className="w-full text-left px-4 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-all group btn-glow">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                      New Terraform Deployment
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Deploy AWS infrastructure
                    </p>
                  </div>
                </div>
              </button>

              <button className="w-full text-left px-4 py-3 bg-accent hover:bg-accent/80 border border-border rounded-lg transition-all hover-lift">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">View Resources</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage existing infrastructure
                    </p>
                  </div>
                </div>
              </button>

              <button className="w-full text-left px-4 py-3 bg-accent hover:bg-accent/80 border border-border rounded-lg transition-all opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Secrets Manager</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Coming soon...
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
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Getting Started</h3>
              <p className="text-sm text-muted-foreground">
                This is your Terraform AWS Dashboard. All your data is encrypted with your master password.
                Head over to the Terraform section to start deploying infrastructure!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
