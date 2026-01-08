import { EC2Client, DescribeInstancesCommand, DescribeVpcsCommand, DescribeSecurityGroupsCommand, DescribeSubnetsCommand } from '@aws-sdk/client-ec2'
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda'
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { ECSClient, ListClustersCommand, DescribeClustersCommand, ListServicesCommand, DescribeServicesCommand, ListTasksCommand, DescribeTasksCommand } from '@aws-sdk/client-ecs'
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'
import { ElasticLoadBalancingV2Client, DescribeLoadBalancersCommand, DescribeTargetGroupsCommand } from '@aws-sdk/client-elastic-load-balancing-v2'

export interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
  region?: string
}

export interface EC2Instance {
  instanceId: string
  name: string
  type: string
  state: string
  publicIp: string | null
  privateIp: string | null
  launchTime: Date | null
  az: string
}

export interface S3Bucket {
  name: string
  creationDate: Date | null
}

export interface LambdaFunction {
  name: string
  runtime: string
  memory: number
  timeout: number
  lastModified: string
}

export interface RDSInstance {
  identifier: string
  engine: string
  status: string
  class: string
  endpoint: string | null
}

export interface ECSCluster {
  clusterArn: string
  clusterName: string
  status: string
  runningTasksCount: number
  pendingTasksCount: number
  activeServicesCount: number
  registeredContainerInstancesCount: number
}

export interface ECSService {
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

export interface ECSTask {
  taskArn: string
  taskDefinitionArn: string
  clusterArn: string
  lastStatus: string
  desiredStatus: string
  cpu: string
  memory: string
  launchType: string
  startedAt: Date | null
  containers: ECSContainer[]
}

export interface ECSContainer {
  name: string
  image: string
  lastStatus: string
  healthStatus: string
  cpu: number
  memory: number
}

export interface LoadBalancer {
  arn: string
  name: string
  dnsName: string
  type: string
  state: string
  scheme: string
  vpcId: string
}

export interface TargetGroup {
  arn: string
  name: string
  protocol: string
  port: number
  targetType: string
  healthCheckPath: string
  vpcId: string
}

export interface SecurityGroup {
  groupId: string
  groupName: string
  description: string
  vpcId: string
  inboundRulesCount: number
  outboundRulesCount: number
}

export interface Subnet {
  subnetId: string
  vpcId: string
  cidrBlock: string
  availabilityZone: string
  state: string
  availableIpCount: number
  name: string
}

export interface AWSResourceSummary {
  identity: {
    account: string
    arn: string
    userId: string
  } | null
  ec2Instances: EC2Instance[]
  s3Buckets: S3Bucket[]
  lambdaFunctions: LambdaFunction[]
  rdsInstances: RDSInstance[]
  ecsClusters: ECSCluster[]
  ecsServices: ECSService[]
  ecsTasks: ECSTask[]
  loadBalancers: LoadBalancer[]
  targetGroups: TargetGroup[]
  securityGroups: SecurityGroup[]
  subnets: Subnet[]
  vpcs: number
  errors: string[]
}

export class AWSClient {
  private credentials: AWSCredentials
  private region: string

  constructor(credentials: AWSCredentials) {
    this.credentials = credentials
    this.region = credentials.region || 'eu-central-1'
  }

  private getClientConfig() {
    return {
      region: this.region,
      credentials: {
        accessKeyId: this.credentials.accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey,
        sessionToken: this.credentials.sessionToken
      }
    }
  }

  async testConnection(): Promise<{ success: boolean; identity?: any; error?: string }> {
    try {
      const sts = new STSClient(this.getClientConfig())
      const response = await sts.send(new GetCallerIdentityCommand({}))
      return {
        success: true,
        identity: {
          account: response.Account,
          arn: response.Arn,
          userId: response.UserId
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async getEC2Instances(): Promise<EC2Instance[]> {
    try {
      const ec2 = new EC2Client(this.getClientConfig())
      const response = await ec2.send(new DescribeInstancesCommand({}))
      
      const instances: EC2Instance[] = []
      for (const reservation of response.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          const nameTag = instance.Tags?.find(t => t.Key === 'Name')
          instances.push({
            instanceId: instance.InstanceId || '',
            name: nameTag?.Value || instance.InstanceId || '',
            type: instance.InstanceType || '',
            state: instance.State?.Name || 'unknown',
            publicIp: instance.PublicIpAddress || null,
            privateIp: instance.PrivateIpAddress || null,
            launchTime: instance.LaunchTime || null,
            az: instance.Placement?.AvailabilityZone || ''
          })
        }
      }
      return instances
    } catch (error) {
      console.error('Failed to get EC2 instances:', error)
      return []
    }
  }

  async getS3Buckets(): Promise<S3Bucket[]> {
    try {
      const s3 = new S3Client(this.getClientConfig())
      const response = await s3.send(new ListBucketsCommand({}))
      
      return (response.Buckets || []).map(bucket => ({
        name: bucket.Name || '',
        creationDate: bucket.CreationDate || null
      }))
    } catch (error) {
      console.error('Failed to get S3 buckets:', error)
      return []
    }
  }

  async getLambdaFunctions(): Promise<LambdaFunction[]> {
    try {
      const lambda = new LambdaClient(this.getClientConfig())
      const response = await lambda.send(new ListFunctionsCommand({}))
      
      return (response.Functions || []).map(fn => ({
        name: fn.FunctionName || '',
        runtime: fn.Runtime || '',
        memory: fn.MemorySize || 0,
        timeout: fn.Timeout || 0,
        lastModified: fn.LastModified || ''
      }))
    } catch (error) {
      console.error('Failed to get Lambda functions:', error)
      return []
    }
  }

  async getRDSInstances(): Promise<RDSInstance[]> {
    try {
      const rds = new RDSClient(this.getClientConfig())
      const response = await rds.send(new DescribeDBInstancesCommand({}))
      
      return (response.DBInstances || []).map(db => ({
        identifier: db.DBInstanceIdentifier || '',
        engine: `${db.Engine || ''} ${db.EngineVersion || ''}`,
        status: db.DBInstanceStatus || '',
        class: db.DBInstanceClass || '',
        endpoint: db.Endpoint?.Address || null
      }))
    } catch (error) {
      console.error('Failed to get RDS instances:', error)
      return []
    }
  }

  async getVPCCount(): Promise<number> {
    try {
      const ec2 = new EC2Client(this.getClientConfig())
      const response = await ec2.send(new DescribeVpcsCommand({}))
      return response.Vpcs?.length || 0
    } catch (error) {
      console.error('Failed to get VPCs:', error)
      return 0
    }
  }

  async getECSClusters(): Promise<ECSCluster[]> {
    try {
      const ecs = new ECSClient(this.getClientConfig())
      const listResponse = await ecs.send(new ListClustersCommand({}))
      
      if (!listResponse.clusterArns || listResponse.clusterArns.length === 0) {
        return []
      }

      const describeResponse = await ecs.send(new DescribeClustersCommand({
        clusters: listResponse.clusterArns
      }))

      return (describeResponse.clusters || []).map(cluster => ({
        clusterArn: cluster.clusterArn || '',
        clusterName: cluster.clusterName || '',
        status: cluster.status || 'UNKNOWN',
        runningTasksCount: cluster.runningTasksCount || 0,
        pendingTasksCount: cluster.pendingTasksCount || 0,
        activeServicesCount: cluster.activeServicesCount || 0,
        registeredContainerInstancesCount: cluster.registeredContainerInstancesCount || 0
      }))
    } catch (error) {
      console.error('Failed to get ECS clusters:', error)
      return []
    }
  }

  async getECSServices(clusterArn?: string): Promise<ECSService[]> {
    try {
      const ecs = new ECSClient(this.getClientConfig())
      let clusterArns: string[] = []
      if (clusterArn) {
        clusterArns = [clusterArn]
      } else {
        const clusters = await this.getECSClusters()
        clusterArns = clusters.map(c => c.clusterArn)
      }
      
      const allServices: ECSService[] = []
      
      for (const arn of clusterArns) {
        const listResponse = await ecs.send(new ListServicesCommand({ cluster: arn }))
        
        if (listResponse.serviceArns && listResponse.serviceArns.length > 0) {
          const describeResponse = await ecs.send(new DescribeServicesCommand({
            cluster: arn,
            services: listResponse.serviceArns
          }))

          const services = (describeResponse.services || []).map(service => ({
            serviceArn: service.serviceArn || '',
            serviceName: service.serviceName || '',
            clusterArn: service.clusterArn || '',
            status: service.status || 'UNKNOWN',
            desiredCount: service.desiredCount || 0,
            runningCount: service.runningCount || 0,
            pendingCount: service.pendingCount || 0,
            launchType: service.launchType || 'EC2',
            taskDefinition: service.taskDefinition || ''
          }))
          allServices.push(...services)
        }
      }
      
      return allServices
    } catch (error) {
      console.error('Failed to get ECS services:', error)
      return []
    }
  }

  async getECSTasks(clusterArn?: string): Promise<ECSTask[]> {
    try {
      const ecs = new ECSClient(this.getClientConfig())
      let clusterArns: string[] = []
      if (clusterArn) {
        clusterArns = [clusterArn]
      } else {
        const clusters = await this.getECSClusters()
        clusterArns = clusters.map(c => c.clusterArn)
      }
      
      const allTasks: ECSTask[] = []
      
      for (const arn of clusterArns) {
        const listResponse = await ecs.send(new ListTasksCommand({ cluster: arn }))
        
        if (listResponse.taskArns && listResponse.taskArns.length > 0) {
          const describeResponse = await ecs.send(new DescribeTasksCommand({
            cluster: arn,
            tasks: listResponse.taskArns
          }))

          const tasks = (describeResponse.tasks || []).map(task => ({
            taskArn: task.taskArn || '',
            taskDefinitionArn: task.taskDefinitionArn || '',
            clusterArn: task.clusterArn || '',
            lastStatus: task.lastStatus || 'UNKNOWN',
            desiredStatus: task.desiredStatus || 'UNKNOWN',
            cpu: task.cpu || '0',
            memory: task.memory || '0',
            launchType: task.launchType || 'EC2',
            startedAt: task.startedAt || null,
            containers: (task.containers || []).map(container => ({
              name: container.name || '',
              image: container.image || '',
              lastStatus: container.lastStatus || 'UNKNOWN',
              healthStatus: String(container.healthStatus || 'UNKNOWN'),
              cpu: Number(container.cpu) || 0,
              memory: Number(container.memory) || 0
            }))
          }))
          allTasks.push(...tasks)
        }
      }
      
      return allTasks
    } catch (error) {
      console.error('Failed to get ECS tasks:', error)
      return []
    }
  }

  async getLoadBalancers(): Promise<LoadBalancer[]> {
    try {
      const elbv2 = new ElasticLoadBalancingV2Client(this.getClientConfig())
      const response = await elbv2.send(new DescribeLoadBalancersCommand({}))
      
      return (response.LoadBalancers || []).map(lb => ({
        arn: lb.LoadBalancerArn || '',
        name: lb.LoadBalancerName || '',
        dnsName: lb.DNSName || '',
        type: lb.Type || 'application',
        state: lb.State?.Code || 'unknown',
        scheme: lb.Scheme || 'internal',
        vpcId: lb.VpcId || ''
      }))
    } catch (error) {
      console.error('Failed to get Load Balancers:', error)
      return []
    }
  }

  async getTargetGroups(): Promise<TargetGroup[]> {
    try {
      const elbv2 = new ElasticLoadBalancingV2Client(this.getClientConfig())
      const response = await elbv2.send(new DescribeTargetGroupsCommand({}))
      
      return (response.TargetGroups || []).map(tg => ({
        arn: tg.TargetGroupArn || '',
        name: tg.TargetGroupName || '',
        protocol: tg.Protocol || '',
        port: tg.Port || 0,
        targetType: tg.TargetType || 'instance',
        healthCheckPath: tg.HealthCheckPath || '/',
        vpcId: tg.VpcId || ''
      }))
    } catch (error) {
      console.error('Failed to get Target Groups:', error)
      return []
    }
  }

  async getSecurityGroups(): Promise<SecurityGroup[]> {
    try {
      const ec2 = new EC2Client(this.getClientConfig())
      const response = await ec2.send(new DescribeSecurityGroupsCommand({}))
      
      return (response.SecurityGroups || []).map(sg => ({
        groupId: sg.GroupId || '',
        groupName: sg.GroupName || '',
        description: sg.Description || '',
        vpcId: sg.VpcId || '',
        inboundRulesCount: sg.IpPermissions?.length || 0,
        outboundRulesCount: sg.IpPermissionsEgress?.length || 0
      }))
    } catch (error) {
      console.error('Failed to get Security Groups:', error)
      return []
    }
  }

  async getSubnets(): Promise<Subnet[]> {
    try {
      const ec2 = new EC2Client(this.getClientConfig())
      const response = await ec2.send(new DescribeSubnetsCommand({}))
      
      return (response.Subnets || []).map(subnet => ({
        subnetId: subnet.SubnetId || '',
        vpcId: subnet.VpcId || '',
        cidrBlock: subnet.CidrBlock || '',
        availabilityZone: subnet.AvailabilityZone || '',
        state: subnet.State || 'unknown',
        availableIpCount: subnet.AvailableIpAddressCount || 0,
        name: subnet.Tags?.find(t => t.Key === 'Name')?.Value || subnet.SubnetId || ''
      }))
    } catch (error) {
      console.error('Failed to get Subnets:', error)
      return []
    }
  }

  async getAllResources(): Promise<AWSResourceSummary> {
    const errors: string[] = []
    let identity = null

    // Test connection first
    const testResult = await this.testConnection()
    if (!testResult.success) {
      return {
        identity: null,
        ec2Instances: [],
        s3Buckets: [],
        lambdaFunctions: [],
        rdsInstances: [],
        ecsClusters: [],
        ecsServices: [],
        ecsTasks: [],
        loadBalancers: [],
        targetGroups: [],
        securityGroups: [],
        subnets: [],
        vpcs: 0,
        errors: [testResult.error || 'Failed to connect to AWS']
      }
    }
    identity = testResult.identity

    // Fetch all resources in parallel
    const [
      ec2Instances, 
      s3Buckets, 
      lambdaFunctions, 
      rdsInstances, 
      ecsClusters,
      ecsServices,
      ecsTasks,
      loadBalancers,
      targetGroups,
      securityGroups,
      subnets,
      vpcs
    ] = await Promise.all([
      this.getEC2Instances().catch(e => { errors.push(`EC2: ${e.message}`); return [] }),
      this.getS3Buckets().catch(e => { errors.push(`S3: ${e.message}`); return [] }),
      this.getLambdaFunctions().catch(e => { errors.push(`Lambda: ${e.message}`); return [] }),
      this.getRDSInstances().catch(e => { errors.push(`RDS: ${e.message}`); return [] }),
      this.getECSClusters().catch(e => { errors.push(`ECS Clusters: ${e.message}`); return [] }),
      this.getECSServices().catch(e => { errors.push(`ECS Services: ${e.message}`); return [] }),
      this.getECSTasks().catch(e => { errors.push(`ECS Tasks: ${e.message}`); return [] }),
      this.getLoadBalancers().catch(e => { errors.push(`Load Balancers: ${e.message}`); return [] }),
      this.getTargetGroups().catch(e => { errors.push(`Target Groups: ${e.message}`); return [] }),
      this.getSecurityGroups().catch(e => { errors.push(`Security Groups: ${e.message}`); return [] }),
      this.getSubnets().catch(e => { errors.push(`Subnets: ${e.message}`); return [] }),
      this.getVPCCount().catch(e => { errors.push(`VPC: ${e.message}`); return 0 })
    ])

    return {
      identity,
      ec2Instances,
      s3Buckets,
      lambdaFunctions,
      rdsInstances,
      ecsClusters,
      ecsServices,
      ecsTasks,
      loadBalancers,
      targetGroups,
      securityGroups,
      subnets,
      vpcs,
      errors
    }
  }
}
