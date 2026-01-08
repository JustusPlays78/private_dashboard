import { useState, useEffect } from 'react'
import {
  Cloud,
  Server,
  Database,
  Folder,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Globe,
  Settings,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Boxes,
  Activity,
  Network,
  Shield,
  TrendingUp,
  Clock,
  Box,
  Play
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppState } from '../hooks/useAppState'

interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region: string
}

interface EC2Instance {
  instanceId: string
  name: string
  type: string
  state: string
  publicIp: string | null
  privateIp: string | null
  launchTime: Date | null
  az: string
}

interface S3Bucket {
  name: string
  creationDate: Date | null
}

interface LambdaFunction {
  name: string
  runtime: string
  memory: number
  timeout: number
  lastModified: string
}

interface RDSInstance {
  identifier: string
  engine: string
  status: string
  class: string
  endpoint: string | null
}

interface ECSCluster {
  clusterArn: string
  clusterName: string
  status: string
  runningTasksCount: number
  pendingTasksCount: number
  activeServicesCount: number
  registeredContainerInstancesCount: number
}

interface ECSService {
  serviceArn: string
  serviceName: string
  clusterArn: string
  status: string
  desiredCount: number
  runningCount: number
  pendingCount: number
  launchType: string
  taskDefinition: string
}

interface ECSTask {
  taskArn: string
  taskDefinitionArn: string
  clusterArn: string
  lastStatus: string
  desiredStatus: string
  cpu: string
  memory: string
  launchType: string
  startedAt: Date | null
  containers: { name: string; lastStatus: string; healthStatus: string }[]
}

interface LoadBalancer {
  arn: string
  name: string
  dnsName: string
  type: string
  state: string
  scheme: string
}

interface SecurityGroup {
  groupId: string
  groupName: string
  description: string
  vpcId: string
  inboundRulesCount: number
  outboundRulesCount: number
}

interface AWSResources {
  identity: { account: string; arn: string; userId: string } | null
  ec2Instances: EC2Instance[]
  s3Buckets: S3Bucket[]
  lambdaFunctions: LambdaFunction[]
  rdsInstances: RDSInstance[]
  ecsClusters: ECSCluster[]
  ecsServices: ECSService[]
  ecsTasks: ECSTask[]
  loadBalancers: LoadBalancer[]
  securityGroups: SecurityGroup[]
  vpcs: number
  errors: string[]
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
]

type TabType = 'overview' | 'compute' | 'containers' | 'storage' | 'database' | 'network'

export default function AWSResources() {
  const appState = useAppState()
  const [credentials, setCredentials] = useState<AWSCredentials | null>(null)
  const [resources, setResources] = useState<AWSResources | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('eu-central-1')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Use preloaded credentials from app state
  useEffect(() => {
    if (appState.awsCredentials.checked && appState.awsCredentials.configured) {
      setCredentials({
        accessKeyId: appState.awsCredentials.accessKeyId!,
        secretAccessKey: appState.awsCredentials.secretAccessKey!,
        sessionToken: appState.awsCredentials.sessionToken,
        region: appState.awsCredentials.region || 'eu-central-1'
      })
      if (appState.awsCredentials.region) {
        setSelectedRegion(appState.awsCredentials.region)
      }
    } else if (!appState.awsCredentials.checked) {
      // Fallback: load credentials if not preloaded
      loadAWSCredentials()
    }
  }, [appState.awsCredentials])

  useEffect(() => {
    if (credentials) {
      loadResources()
    }
  }, [credentials, selectedRegion])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh || !credentials) return

    const interval = setInterval(() => {
      loadResources()
    }, 60000)

    return () => clearInterval(interval)
  }, [autoRefresh, credentials, selectedRegion])

  const loadAWSCredentials = async () => {
    try {
      const result = await window.electronAPI.secrets.getAll()
      if (result.success && result.secrets) {
        const awsCreds = result.secrets.find((s: any) => 
          s.id === 'aws-default-credentials' || 
          (s.category === 'AWS' && s.username && s.password)
        )
        
        if (awsCreds && awsCreds.username && awsCreds.password) {
          if (awsCreds.url) {
            setSelectedRegion(awsCreds.url)
          }
          
          setCredentials({
            accessKeyId: awsCreds.username,
            secretAccessKey: awsCreds.password,
            sessionToken: awsCreds.apiKey || undefined,
            region: awsCreds.url || selectedRegion
          })
        }
      }
    } catch (err) {
      console.error('Failed to load AWS credentials:', err)
    }
  }

  const loadResources = async () => {
    if (!credentials) return

    setLoading(true)
    setError('')

    try {
      const result = await window.electronAPI.aws.getResources({
        ...credentials,
        region: selectedRegion
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to load AWS resources')
      }

      setResources(result.resources)
      setLastRefresh(new Date())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
      case 'available':
      case 'active':
        return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'stopped':
      case 'stopping':
      case 'inactive':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'pending':
      case 'starting':
      case 'modifying':
      case 'draining':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    }
  }

  if (!credentials) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Cloud className="w-7 h-7 text-orange-400" />
            AWS Resources
          </h2>
          <p className="text-slate-400">View and monitor your AWS infrastructure</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-xl p-8 max-w-xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
            <div>
              <h3 className="text-orange-400 font-semibold text-lg mb-2">AWS Credentials Not Configured</h3>
              <p className="text-slate-300 text-sm mb-6">
                To view your AWS resources, please configure your AWS credentials in the Secrets Manager first.
              </p>
              <Link
                to="/secrets"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors font-medium"
              >
                <Settings className="w-4 h-4" />
                Configure AWS Credentials
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'compute', label: 'Compute', icon: <Server className="w-4 h-4" />, count: (resources?.ec2Instances.length || 0) + (resources?.lambdaFunctions.length || 0) },
    { id: 'containers', label: 'Containers', icon: <Box className="w-4 h-4" />, count: resources?.ecsClusters.length || 0 },
    { id: 'storage', label: 'Storage', icon: <Folder className="w-4 h-4" />, count: resources?.s3Buckets.length || 0 },
    { id: 'database', label: 'Database', icon: <Database className="w-4 h-4" />, count: resources?.rdsInstances.length || 0 },
    { id: 'network', label: 'Network', icon: <Network className="w-4 h-4" />, count: (resources?.loadBalancers.length || 0) + (resources?.securityGroups.length || 0) },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Cloud className="w-7 h-7 text-orange-400" />
              AWS Resources
            </h2>
            <p className="text-slate-400">
              {resources?.identity ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Account: <span className="text-orange-400 font-mono">{resources.identity.account}</span>
                </span>
              ) : (
                'View and monitor your AWS infrastructure'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-sm text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                autoRefresh 
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
              Auto
            </button>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
            >
              {AWS_REGIONS.map(region => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>

            <button
              onClick={loadResources}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {resources?.errors && resources.errors.length > 0 && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            Some resources could not be loaded:
          </div>
          <ul className="text-sm text-yellow-300/80 ml-6 list-disc">
            {resources.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-orange-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-slate-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && !resources ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading AWS resources...</p>
          </div>
        </div>
      ) : resources ? (
        <>
          {activeTab === 'overview' && <OverviewTab resources={resources} getStateColor={getStateColor} />}
          {activeTab === 'compute' && <ComputeTab resources={resources} getStateColor={getStateColor} />}
          {activeTab === 'containers' && <ContainersTab resources={resources} getStateColor={getStateColor} />}
          {activeTab === 'storage' && <StorageTab resources={resources} />}
          {activeTab === 'database' && <DatabaseTab resources={resources} getStateColor={getStateColor} />}
          {activeTab === 'network' && <NetworkTab resources={resources} getStateColor={getStateColor} />}
        </>
      ) : null}
    </div>
  )
}

// ===== Overview Tab =====
function OverviewTab({ resources, getStateColor }: { resources: AWSResources; getStateColor: (state: string) => string }) {
  const totalRunningEC2 = resources.ec2Instances.filter(i => i.state === 'running').length
  const totalRunningTasks = resources.ecsTasks.filter(t => t.lastStatus === 'RUNNING').length
  
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <OverviewCard
          icon={<Server className="w-6 h-6" />}
          label="EC2 Instances"
          value={resources.ec2Instances.length}
          subValue={`${totalRunningEC2} running`}
          color="blue"
        />
        <OverviewCard
          icon={<Boxes className="w-6 h-6" />}
          label="ECS Clusters"
          value={resources.ecsClusters.length}
          subValue={`${resources.ecsServices.length} services`}
          color="cyan"
        />
        <OverviewCard
          icon={<Box className="w-6 h-6" />}
          label="ECS Tasks"
          value={resources.ecsTasks.length}
          subValue={`${totalRunningTasks} running`}
          color="teal"
        />
        <OverviewCard
          icon={<Folder className="w-6 h-6" />}
          label="S3 Buckets"
          value={resources.s3Buckets.length}
          subValue="Global"
          color="green"
        />
        <OverviewCard
          icon={<Zap className="w-6 h-6" />}
          label="Lambda Functions"
          value={resources.lambdaFunctions.length}
          subValue="Serverless"
          color="yellow"
        />
        <OverviewCard
          icon={<Database className="w-6 h-6" />}
          label="RDS Databases"
          value={resources.rdsInstances.length}
          subValue="Managed"
          color="purple"
        />
      </div>

      {/* Quick Glance Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Running EC2 Instances */}
        <QuickGlanceSection title="Running EC2 Instances" icon={<Server className="w-5 h-5 text-blue-400" />}>
          {resources.ec2Instances.filter(i => i.state === 'running').length === 0 ? (
            <EmptyState message="No running instances" />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {resources.ec2Instances.filter(i => i.state === 'running').slice(0, 5).map(instance => (
                <div key={instance.instanceId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div>
                      <div className="text-white font-medium">{instance.name}</div>
                      <div className="text-xs text-slate-400">{instance.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-300 font-mono">{instance.privateIp || '-'}</div>
                    <div className="text-xs text-slate-500">{instance.az}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </QuickGlanceSection>

        {/* ECS Services Health */}
        <QuickGlanceSection title="ECS Services" icon={<Activity className="w-5 h-5 text-cyan-400" />}>
          {resources.ecsServices.length === 0 ? (
            <EmptyState message="No ECS services" />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {resources.ecsServices.slice(0, 5).map(service => (
                <div key={service.serviceArn} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${service.runningCount === service.desiredCount ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                    <div>
                      <div className="text-white font-medium">{service.serviceName}</div>
                      <div className="text-xs text-slate-400">{service.launchType}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="text-green-400">{service.runningCount}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-slate-300">{service.desiredCount}</span>
                    </div>
                    <div className="text-xs text-slate-500">running/desired</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </QuickGlanceSection>

        {/* Recent S3 Buckets */}
        <QuickGlanceSection title="S3 Buckets" icon={<Folder className="w-5 h-5 text-green-400" />}>
          {resources.s3Buckets.length === 0 ? (
            <EmptyState message="No S3 buckets" />
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {resources.s3Buckets.slice(0, 6).map(bucket => (
                <div key={bucket.name} className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
                  <Folder className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{bucket.name}</div>
                    <div className="text-xs text-slate-500">
                      {bucket.creationDate ? new Date(bucket.creationDate).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </QuickGlanceSection>

        {/* Load Balancers */}
        <QuickGlanceSection title="Load Balancers" icon={<Network className="w-5 h-5 text-indigo-400" />}>
          {resources.loadBalancers.length === 0 ? (
            <EmptyState message="No load balancers" />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {resources.loadBalancers.slice(0, 5).map(lb => (
                <div key={lb.arn} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${lb.state === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                    <div>
                      <div className="text-white font-medium">{lb.name}</div>
                      <div className="text-xs text-slate-400">{lb.type.toUpperCase()}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStateColor(lb.state)}`}>
                    {lb.state}
                  </span>
                </div>
              ))}
            </div>
          )}
        </QuickGlanceSection>
      </div>
    </div>
  )
}

// ===== Compute Tab =====
function ComputeTab({ resources, getStateColor }: { resources: AWSResources; getStateColor: (state: string) => string }) {
  return (
    <div className="space-y-6">
      {/* EC2 Instances */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">EC2 Instances</h3>
            <span className="text-sm text-slate-400">({resources.ec2Instances.length})</span>
          </div>
        </div>
        <div className="p-4">
          {resources.ec2Instances.length === 0 ? (
            <EmptyState message="No EC2 instances found in this region" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-3 px-3 font-medium">Name</th>
                    <th className="text-left py-3 px-3 font-medium">Instance ID</th>
                    <th className="text-left py-3 px-3 font-medium">Type</th>
                    <th className="text-left py-3 px-3 font-medium">State</th>
                    <th className="text-left py-3 px-3 font-medium">Public IP</th>
                    <th className="text-left py-3 px-3 font-medium">Private IP</th>
                    <th className="text-left py-3 px-3 font-medium">AZ</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.ec2Instances.map(instance => (
                    <tr key={instance.instanceId} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-3 text-white font-medium">{instance.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-xs">{instance.instanceId}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
                          {instance.type}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getStateColor(instance.state)}`}>
                          {instance.state}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-xs">{instance.publicIp || '-'}</td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-xs">{instance.privateIp || '-'}</td>
                      <td className="py-3 px-3 text-slate-400 text-xs">{instance.az}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Lambda Functions */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Lambda Functions</h3>
            <span className="text-sm text-slate-400">({resources.lambdaFunctions.length})</span>
          </div>
        </div>
        <div className="p-4">
          {resources.lambdaFunctions.length === 0 ? (
            <EmptyState message="No Lambda functions found in this region" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources.lambdaFunctions.map(fn => (
                <div key={fn.name} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-yellow-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-medium truncate">{fn.name}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Runtime</div>
                      <div className="text-slate-300">{fn.runtime || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Memory</div>
                      <div className="text-slate-300">{fn.memory} MB</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Timeout</div>
                      <div className="text-slate-300">{fn.timeout}s</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== Containers Tab =====
function ContainersTab({ resources, getStateColor }: { resources: AWSResources; getStateColor: (state: string) => string }) {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set())

  const toggleCluster = (arn: string) => {
    const newExpanded = new Set(expandedClusters)
    if (newExpanded.has(arn)) {
      newExpanded.delete(arn)
    } else {
      newExpanded.add(arn)
    }
    setExpandedClusters(newExpanded)
  }

  const getServicesForCluster = (clusterArn: string) => {
    return resources.ecsServices.filter(s => s.clusterArn === clusterArn)
  }

  const getTasksForCluster = (clusterArn: string) => {
    return resources.ecsTasks.filter(t => t.clusterArn === clusterArn)
  }

  return (
    <div className="space-y-6">
      {/* ECS Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Boxes className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-400 text-sm">Clusters</span>
          </div>
          <div className="text-3xl font-bold text-white">{resources.ecsClusters.length}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-teal-400" />
            <span className="text-slate-400 text-sm">Services</span>
          </div>
          <div className="text-3xl font-bold text-white">{resources.ecsServices.length}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Box className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">Tasks</span>
          </div>
          <div className="text-3xl font-bold text-white">{resources.ecsTasks.length}</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Play className="w-5 h-5 text-green-400" />
            <span className="text-slate-400 text-sm">Running</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {resources.ecsTasks.filter(t => t.lastStatus === 'RUNNING').length}
          </div>
        </div>
      </div>

      {/* ECS Clusters */}
      {resources.ecsClusters.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8">
          <EmptyState message="No ECS clusters found in this region" />
        </div>
      ) : (
        <div className="space-y-4">
          {resources.ecsClusters.map(cluster => (
            <div key={cluster.clusterArn} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCluster(cluster.clusterArn)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <Boxes className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">{cluster.clusterName}</div>
                    <div className="text-sm text-slate-400 flex items-center gap-4">
                      <span>{cluster.activeServicesCount} services</span>
                      <span>{cluster.runningTasksCount} running tasks</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStateColor(cluster.status)}`}>
                    {cluster.status}
                  </span>
                  {expandedClusters.has(cluster.clusterArn) ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {expandedClusters.has(cluster.clusterArn) && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* Services */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Services ({getServicesForCluster(cluster.clusterArn).length})
                    </h4>
                    {getServicesForCluster(cluster.clusterArn).length === 0 ? (
                      <div className="text-sm text-slate-500 italic">No services</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getServicesForCluster(cluster.clusterArn).map(service => (
                          <div key={service.serviceArn} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-white font-medium">{service.serviceName}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStateColor(service.status)}`}>
                                {service.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="text-slate-500">Running</div>
                                <div className="text-green-400 font-medium">{service.runningCount}</div>
                              </div>
                              <div>
                                <div className="text-slate-500">Desired</div>
                                <div className="text-slate-300 font-medium">{service.desiredCount}</div>
                              </div>
                              <div>
                                <div className="text-slate-500">Launch</div>
                                <div className="text-slate-300">{service.launchType}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tasks */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      Tasks ({getTasksForCluster(cluster.clusterArn).length})
                    </h4>
                    {getTasksForCluster(cluster.clusterArn).length === 0 ? (
                      <div className="text-sm text-slate-500 italic">No tasks</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-700/50">
                              <th className="text-left py-2 px-3 font-medium">Task ID</th>
                              <th className="text-left py-2 px-3 font-medium">Status</th>
                              <th className="text-left py-2 px-3 font-medium">Launch Type</th>
                              <th className="text-left py-2 px-3 font-medium">CPU/Memory</th>
                              <th className="text-left py-2 px-3 font-medium">Containers</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getTasksForCluster(cluster.clusterArn).map(task => (
                              <tr key={task.taskArn} className="border-b border-slate-700/30">
                                <td className="py-2 px-3 font-mono text-xs text-slate-400">
                                  {task.taskArn.split('/').pop()}
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStateColor(task.lastStatus)}`}>
                                    {task.lastStatus}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-300">{task.launchType}</td>
                                <td className="py-2 px-3 text-slate-400 text-xs">
                                  {task.cpu} / {task.memory}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex gap-1">
                                    {task.containers.map((c, i) => (
                                      <span
                                        key={i}
                                        className={`w-2 h-2 rounded-full ${
                                          c.lastStatus === 'RUNNING' ? 'bg-green-400' : 'bg-yellow-400'
                                        }`}
                                        title={`${c.name}: ${c.lastStatus}`}
                                      />
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== Storage Tab =====
function StorageTab({ resources }: { resources: AWSResources }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
          <Folder className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">S3 Buckets</h3>
          <span className="text-sm text-slate-400">({resources.s3Buckets.length})</span>
        </div>
        <div className="p-4">
          {resources.s3Buckets.length === 0 ? (
            <EmptyState message="No S3 buckets found" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources.s3Buckets.map(bucket => (
                <div key={bucket.name} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-green-500/30 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                      <Folder className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate" title={bucket.name}>{bucket.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Created: {bucket.creationDate ? new Date(bucket.creationDate).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                    <a
                      href={`https://s3.console.aws.amazon.com/s3/buckets/${bucket.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== Database Tab =====
function DatabaseTab({ resources, getStateColor }: { resources: AWSResources; getStateColor: (state: string) => string }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
          <Database className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">RDS Instances</h3>
          <span className="text-sm text-slate-400">({resources.rdsInstances.length})</span>
        </div>
        <div className="p-4">
          {resources.rdsInstances.length === 0 ? (
            <EmptyState message="No RDS instances found in this region" />
          ) : (
            <div className="space-y-3">
              {resources.rdsInstances.map(db => (
                <div key={db.identifier} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Database className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{db.identifier}</div>
                        <div className="text-sm text-slate-400">{db.engine}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStateColor(db.status)}`}>
                      {db.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500 text-xs mb-1">Instance Class</div>
                      <div className="text-slate-300 font-mono">{db.class}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-slate-500 text-xs mb-1">Endpoint</div>
                      <div className="text-slate-300 font-mono text-xs truncate">{db.endpoint || '-'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== Network Tab =====
function NetworkTab({ resources, getStateColor }: { resources: AWSResources; getStateColor: (state: string) => string }) {
  return (
    <div className="space-y-6">
      {/* Load Balancers */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
          <Network className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Load Balancers</h3>
          <span className="text-sm text-slate-400">({resources.loadBalancers.length})</span>
        </div>
        <div className="p-4">
          {resources.loadBalancers.length === 0 ? (
            <EmptyState message="No load balancers found in this region" />
          ) : (
            <div className="space-y-3">
              {resources.loadBalancers.map(lb => (
                <div key={lb.arn} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Network className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">{lb.name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-1">{lb.dnsName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-xs font-medium">
                        {lb.type.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStateColor(lb.state)}`}>
                        {lb.state}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Scheme: <span className="text-slate-400">{lb.scheme}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security Groups */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-3">
          <Shield className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Security Groups</h3>
          <span className="text-sm text-slate-400">({resources.securityGroups.length})</span>
        </div>
        <div className="p-4">
          {resources.securityGroups.length === 0 ? (
            <EmptyState message="No security groups found in this region" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-3 px-3 font-medium">Name</th>
                    <th className="text-left py-3 px-3 font-medium">Group ID</th>
                    <th className="text-left py-3 px-3 font-medium">VPC ID</th>
                    <th className="text-left py-3 px-3 font-medium">Inbound</th>
                    <th className="text-left py-3 px-3 font-medium">Outbound</th>
                    <th className="text-left py-3 px-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.securityGroups.map(sg => (
                    <tr key={sg.groupId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-3 text-white font-medium">{sg.groupName}</td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-xs">{sg.groupId}</td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-xs">{sg.vpcId}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs">
                          {sg.inboundRulesCount} rules
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                          {sg.outboundRulesCount} rules
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-xs truncate max-w-xs">{sg.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== Helper Components =====

function OverviewCard({ 
  icon, 
  label, 
  value, 
  subValue,
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: number
  subValue?: string
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'cyan' | 'teal' | 'indigo'
}) {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-400',
    yellow: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 text-yellow-400',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400',
    orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-400',
    cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400',
    teal: 'from-teal-500/10 to-teal-600/5 border-teal-500/20 text-teal-400',
    indigo: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400'
  }

  return (
    <div className={`p-4 rounded-xl border bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
    </div>
  )
}

function QuickGlanceSection({ 
  title, 
  icon, 
  children 
}: { 
  title: string
  icon: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-slate-400">
      <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
