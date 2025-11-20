import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Play, FileCode, Terminal, AlertCircle, CheckCircle, 
  Loader2, X, GitBranch, PackageCheck, Clock, TrendingUp
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

interface ClonedProject {
  ProjectID: number;
  Name: string;
  PathWithNamespace: string;
  LocalPath: string;
  DefaultBranch: string;
  ClonedAt: string;
}

interface TerraformDeployment {
  id: number;
  project_id: number;
  project_name: string;
  action: string;
  state_name: string;
  var_file: string;
  status: string;
  output: string;
  summary_add: number;
  summary_change: number;
  summary_destroy: number;
  duration: number;
  error: string;
  started_at: string;
  completed_at: string;
  created_at: string;
}

interface TerraformState {
  name: string;
  created_at: string;
  updated_at: string;
  locked: boolean;
}

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ClonedProject | null>(null);
  const [deployments, setDeployments] = useState<TerraformDeployment[]>([]);
  const [varFiles, setVarFiles] = useState<string[]>([]);
  const [selectedVarFile, setSelectedVarFile] = useState('');
  const [terraformStates, setTerraformStates] = useState<TerraformState[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [switchingBranch, setSwitchingBranch] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [logOutput, setLogOutput] = useState<string[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [currentAction, setCurrentAction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [summary, setSummary] = useState<{add: number, change: number, destroy: number} | null>(null);
  const [resourceChanges, setResourceChanges] = useState<{action: string, resource: string, description?: string, attributes?: {name: string, value: string, changeType: string}[]}[]>([]);
  const [operationMetadata, setOperationMetadata] = useState<{startedAt?: Date, completedAt?: Date, duration?: number, status?: string}>({});
  
  // Terraform Config
  const [repositoryId, setRepositoryId] = useState('');
  const [stateName, setStateName] = useState('dev');
  const [gitlabUser] = useState('julian.schallenkammer@siemens.com');
  const [initialized, setInitialized] = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      loadProject(parseInt(projectId));
      loadDeploymentHistory(parseInt(projectId));
      loadTerraformStates(parseInt(projectId));
    }
  }, [projectId]);

  useEffect(() => {
    if (project) {
      loadVarFiles(project.LocalPath);
      setRepositoryId(project.ProjectID.toString());
      loadBranches(project.LocalPath);
    }
  }, [project]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logOutput]);

  const loadProject = async (id: number) => {
    try {
      const response = await fetch('http://localhost:8080/api/gitlab/cloned-projects');
      const data = await response.json();
      if (data.projects && Array.isArray(data.projects)) {
        const found = data.projects.find((p: ClonedProject) => p.ProjectID === id);
        if (found) setProject(found);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
    }
  };

  const loadDeploymentHistory = async (projectID: number) => {
    try {
      const response = await fetch(`http://localhost:8080/api/deployments/project/${projectID}`);
      const data = await response.json();
      if (data.deployments && Array.isArray(data.deployments)) {
        setDeployments(data.deployments);
      }
    } catch (err) {
      console.error('Failed to load deployment history:', err);
    }
  };

  const loadTerraformStates = async (projectID: number) => {
    try {
      const response = await fetch(`http://localhost:8080/api/gitlab/projects/${projectID}/terraform/states`);
      const data = await response.json();
      if (data.states && Array.isArray(data.states)) {
        setTerraformStates(data.states);
      }
    } catch (err) {
      console.error('Failed to load Terraform states:', err);
    }
  };

  const loadVarFiles = async (projectPath: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/terraform/var-files?project_path=${encodeURIComponent(projectPath)}`);
      const data = await response.json();
      if (data.var_files) {
        setVarFiles(data.var_files);
        if (data.var_files.length > 0) {
          setSelectedVarFile(data.var_files[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load var files:', err);
    }
  };

  const loadBranches = async (projectPath: string) => {
    try {
      const response = await fetch('http://localhost:8080/api/gitlab/branches/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath })
      });
      const data = await response.json();
      if (data.branches && Array.isArray(data.branches)) {
        setBranches(data.branches);
        setCurrentBranch(data.current_branch || '');
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const switchBranch = async (branchName: string) => {
    if (!project || branchName === currentBranch) return;
    
    setSwitchingBranch(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8080/api/gitlab/branches/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project_path: project.LocalPath,
          branch_name: branchName
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCurrentBranch(data.branch || branchName);
        setSuccess(`Switched to branch ${branchName}`);
        // Reload var files and deployments after branch switch
        await loadVarFiles(project.LocalPath);
        await loadDeploymentHistory(project.ProjectID);
      } else {
        setError(data.error || 'Failed to switch branch');
      }
    } catch (err) {
      setError('Failed to switch branch: ' + (err as Error).message);
    } finally {
      setSwitchingBranch(false);
    }
  };

  const getAwsCredentials = () => {
    return {
      aws_access_key_id: localStorage.getItem('aws_access_key_id') || '',
      aws_secret_access_key: localStorage.getItem('aws_secret_access_key') || '',
      aws_session_token: localStorage.getItem('aws_session_token') || ''
    };
  };

  const convertAnsiToHtml = (text: string): string => {
    const colorMap: { [key: string]: string } = {
      '30': '#000000', '31': '#e74c3c', '32': '#2ecc71', '33': '#f39c12',
      '34': '#3498db', '35': '#9b59b6', '36': '#1abc9c', '37': '#ecf0f1',
      '90': '#7f8c8d', '91': '#e74c3c', '92': '#2ecc71', '93': '#f39c12',
      '94': '#3498db', '95': '#9b59b6', '96': '#1abc9c', '97': '#ecf0f1',
    };

    let result = text;
    result = result.replace(/\x1b\[([0-9;]+)m/g, (match, codes) => {
      const codeList = codes.split(';');
      let html = '';
      for (const code of codeList) {
        if (code === '0' || code === '') {
          html += '</span>';
        } else if (code === '1') {
          html += '<span style="font-weight: bold">';
        } else if (colorMap[code]) {
          html += `<span style="color: ${colorMap[code]}">`;
        }
      }
      return html;
    });
    return result;
  };

  const parseTerraformSummary = (lines: string[]): {add: number, change: number, destroy: number} | null => {
    const fullOutput = lines.join('\n');
    const planMatch = fullOutput.match(/Plan:\s+(\d+)\s+to\s+add,\s+(\d+)\s+to\s+change,\s+(\d+)\s+to\s+destroy/);
    const applyMatch = fullOutput.match(/Apply complete!.*?(\d+)\s+added,\s+(\d+)\s+changed,\s+(\d+)\s+destroyed/);
    const destroyMatch = fullOutput.match(/Destroy complete!.*?(\d+)\s+destroyed/);

    if (planMatch) {
      return { add: parseInt(planMatch[1]), change: parseInt(planMatch[2]), destroy: parseInt(planMatch[3]) };
    } else if (applyMatch) {
      return { add: parseInt(applyMatch[1]), change: parseInt(applyMatch[2]), destroy: parseInt(applyMatch[3]) };
    } else if (destroyMatch) {
      return { add: 0, change: 0, destroy: parseInt(destroyMatch[1]) };
    }
    return null;
  };

  const parseTerraformResources = (lines: string[]): {action: string, resource: string, description?: string, attributes?: {name: string, value: string, changeType: string}[]}[] => {
    const fullOutput = lines.join('\n');
    const resources: {action: string, resource: string, description?: string, attributes?: {name: string, value: string, changeType: string}[]}[] = [];
    
    console.log('[DEBUG] Parsing terraform output, lines:', lines.length);
    
    // Remove ANSI escape codes first
    const cleanOutput = fullOutput.replace(/\x1b\[[0-9;]*m/g, '');
    console.log('[DEBUG] First 100 chars after cleaning:', cleanOutput.substring(0, 100));
    
    // Try to find the resource lines
    const outputLines = cleanOutput.split('\n');
    for (let i = 0; i < outputLines.length; i++) {
      const line = outputLines[i].trim();
      
      // Look for lines starting with # and containing "will be"
      if (line.startsWith('#') && line.includes('will be')) {
        console.log('[DEBUG] Found potential resource line:', line);
        
        // Extract resource info
        const parts = line.substring(1).trim().split(/\s+will be\s+/);
        if (parts.length === 2) {
          const fullName = parts[0].trim();
          const action = parts[1].trim();
          
          console.log('[DEBUG] Extracted - fullName:', fullName, 'action:', action);
          
          // Remove module prefix if present and get last two parts (type.name)
          const nameParts = fullName.split('.');
          let resourceType, resourceName;
          
          if (nameParts.length >= 2) {
            resourceName = nameParts[nameParts.length - 1];
            resourceType = nameParts[nameParts.length - 2];
          } else {
            continue;
          }
          
          let actionType = 'change';
          if (action.includes('created')) actionType = 'create';
          else if (action.includes('destroyed')) actionType = 'destroy';
          else if (action.includes('replaced')) actionType = 'replace';
          else if (action.includes('updated')) actionType = 'change';
          
          // Parse attributes from following lines
          const attributes: {name: string, value: string, changeType: string}[] = [];
          let j = i + 2; // Skip the resource line itself
          while (j < outputLines.length) {
            const attrLine = outputLines[j];
            
            // Stop at empty line or next resource
            if (attrLine.trim() === '' || attrLine.trim().startsWith('#') || attrLine.trim() === '}') {
              break;
            }
            
            // Parse attribute line: + description = "Allow egress to ALB"
            const attrMatch = attrLine.match(/^\s*([+~-])\s+(\w+)\s*=\s*(.+)$/);
            if (attrMatch) {
              const changeSymbol = attrMatch[1];
              const attrName = attrMatch[2];
              let attrValue = attrMatch[3].trim();
              
              // Skip IDs and computed values
              if (attrName.includes('id') && attrValue.includes('known after apply')) {
                j++;
                continue;
              }
              
              // Clean up value
              attrValue = attrValue.replace(/^"(.*)"$/, '$1'); // Remove quotes
              if (attrValue.length > 50) attrValue = attrValue.substring(0, 47) + '...';
              
              let changeType = 'add';
              if (changeSymbol === '~') changeType = 'change';
              else if (changeSymbol === '-') changeType = 'remove';
              
              attributes.push({ name: attrName, value: attrValue, changeType });
            }
            
            j++;
          }
          
          const resource = `${resourceType}.${resourceName}`;
          console.log('[DEBUG] Adding resource:', resource, 'actionType:', actionType, 'attributes:', attributes.length);
          
          resources.push({ action: actionType, resource, description: action, attributes });
        }
      }
    }
    
    console.log('[DEBUG] Total resources found:', resources.length);
    return resources;
  };

  const getReadableResourceName = (resource: string): {type: string, name: string, icon: string} => {
    // Map AWS resource types to readable names and icons
    const typeMap: {[key: string]: {name: string, icon: string}} = {
      'aws_instance': { name: 'EC2', icon: '🖥️' },
      'aws_db_instance': { name: 'RDS', icon: '🗄️' },
      'aws_security_group': { name: 'SG', icon: '🛡️' },
      'aws_security_group_rule': { name: 'SG Rule', icon: '🔐' },
      'aws_s3_bucket': { name: 'S3', icon: '📦' },
      'aws_lambda_function': { name: 'Lambda', icon: '⚡' },
      'aws_iam_role': { name: 'IAM Role', icon: '👤' },
      'aws_iam_policy': { name: 'IAM Policy', icon: '📋' },
      'aws_vpc': { name: 'VPC', icon: '🌐' },
      'aws_subnet': { name: 'Subnet', icon: '🔌' },
      'aws_route_table': { name: 'Route Table', icon: '🗺️' },
      'aws_alb': { name: 'ALB', icon: '⚖️' },
      'aws_lb': { name: 'Load Balancer', icon: '⚖️' },
      'aws_ecs_cluster': { name: 'ECS Cluster', icon: '🐳' },
      'aws_ecs_service': { name: 'ECS Service', icon: '🚀' },
      'aws_ecs_task_definition': { name: 'ECS Task', icon: '📄' },
      'aws_cloudwatch_log_group': { name: 'CloudWatch Logs', icon: '📊' },
      'aws_ssm_parameter': { name: 'SSM Parameter', icon: '⚙️' },
      'aws_secretsmanager_secret': { name: 'Secrets Manager', icon: '🔑' },
      'aws_route53_record': { name: 'Route53', icon: '🌍' },
      'aws_acm_certificate': { name: 'ACM Cert', icon: '🔒' },
    };

    // Extract resource type (e.g., aws_db_instance from aws_db_instance.rds)
    const parts = resource.split('.');
    const resourceType = parts[0].replace(/^module\.[^.]+\./, ''); // Remove module prefix
    const resourceName = parts[parts.length - 1];

    const mapped = typeMap[resourceType] || { name: resourceType.replace('aws_', '').toUpperCase(), icon: '📦' };
    
    return {
      type: mapped.name,
      name: resourceName,
      icon: mapped.icon
    };
  };

  const handleInit = async () => {
    if (!project || !repositoryId || !stateName) return;
    
    const creds = getAwsCredentials();
    if (!creds.aws_access_key_id || !creds.aws_secret_access_key) {
      setError('Please configure AWS credentials in Settings');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setLogOutput([]);
    setSummary(null);
    setResourceChanges([]);
    setOperationMetadata({ startedAt: new Date() });
    setShowLogModal(true);
    setCurrentAction('Initializing Terraform...');

    try {
      const ws = new WebSocket('ws://localhost:8080/api/terraform/stream-logs');
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: 'init',
          config: {
            project_path: project.LocalPath,
            repository_id: repositoryId,
            state_name: stateName,
            gitlab_user: gitlabUser,
            ...creds
          }
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
          setLogOutput(prev => [...prev, data.message]);
        } else if (data.type === 'complete') {
          setLoading(false);
          setCurrentAction('');
          setOperationMetadata(prev => ({ 
            ...prev, 
            completedAt: new Date(), 
            duration: data.duration,
            status: data.success ? 'success' : 'failed'
          }));
          if (data.success) {
            setSuccess('Terraform initialized successfully!');
            setInitialized(true);
            if (project) loadDeploymentHistory(project.ProjectID);
          } else {
            setError(data.error || 'Initialization failed');
          }
          ws.close();
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed');
        setLoading(false);
        setCurrentAction('');
      };

      ws.onclose = () => {
        setLoading(false);
        setCurrentAction('');
      };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setCurrentAction('');
    }
  };

  const handlePlan = async () => {
    if (!project) return;
    
    const creds = getAwsCredentials();
    if (!creds.aws_access_key_id || !creds.aws_secret_access_key) {
      setError('Please configure AWS credentials in Settings');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setLogOutput([]);
    setSummary(null);
    setResourceChanges([]);
    setOperationMetadata({ startedAt: new Date() });
    setShowLogModal(true);
    setCurrentAction('Running Terraform Plan...');

    try {
      const ws = new WebSocket('ws://localhost:8080/api/terraform/stream-logs');
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: 'plan',
          config: {
            project_path: project.LocalPath,
            repository_id: repositoryId,
            state_name: stateName,
            var_file: selectedVarFile,
            ...creds
          }
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
          setLogOutput(prev => [...prev, data.message]);
        } else if (data.type === 'complete') {
          setLoading(false);
          setCurrentAction('');
          setOperationMetadata(prev => ({ 
            ...prev, 
            completedAt: new Date(), 
            duration: data.duration,
            status: data.success ? 'success' : 'failed'
          }));
          if (data.success) {
            setSuccess('Plan completed successfully!');
            const parsedSummary = parseTerraformSummary(logOutput);
            const parsedResources = parseTerraformResources(logOutput);
            console.log('[DEBUG] Plan completed - Summary:', parsedSummary, 'Resources:', parsedResources);
            if (parsedSummary) setSummary(parsedSummary);
            if (parsedResources.length > 0) setResourceChanges(parsedResources);
            if (project) loadDeploymentHistory(project.ProjectID);
          } else {
            setError(data.error || 'Plan failed');
          }
          ws.close();
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed');
        setLoading(false);
        setCurrentAction('');
      };

      ws.onclose = () => {
        setLoading(false);
        setCurrentAction('');
      };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setCurrentAction('');
    }
  };

  const handleApply = async () => {
    if (!project) return;
    if (!confirm('Are you sure you want to APPLY these changes?')) return;
    
    const creds = getAwsCredentials();
    if (!creds.aws_access_key_id || !creds.aws_secret_access_key) {
      setError('Please configure AWS credentials in Settings');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setLogOutput([]);
    setSummary(null);
    setResourceChanges([]);
    setOperationMetadata({ startedAt: new Date() });
    setShowLogModal(true);
    setCurrentAction('Applying Terraform Changes...');

    try {
      const ws = new WebSocket('ws://localhost:8080/api/terraform/stream-logs');
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: 'apply',
          config: {
            project_path: project.LocalPath,
            repository_id: repositoryId,
            state_name: stateName,
            var_file: selectedVarFile,
            auto_approve: true,
            ...creds
          }
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
          setLogOutput(prev => [...prev, data.message]);
        } else if (data.type === 'complete') {
          setLoading(false);
          setCurrentAction('');
          setOperationMetadata(prev => ({ 
            ...prev, 
            completedAt: new Date(), 
            duration: data.duration,
            status: data.success ? 'success' : 'failed'
          }));
          if (data.success) {
            setSuccess('Apply completed successfully!');
            const parsedSummary = parseTerraformSummary(logOutput);
            const parsedResources = parseTerraformResources(logOutput);
            if (parsedSummary) setSummary(parsedSummary);
            if (parsedResources.length > 0) setResourceChanges(parsedResources);
            if (project) loadDeploymentHistory(project.ProjectID);
          } else {
            setError(data.error || 'Apply failed');
          }
          ws.close();
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed');
        setLoading(false);
        setCurrentAction('');
      };

      ws.onclose = () => {
        setLoading(false);
        setCurrentAction('');
      };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setCurrentAction('');
    }
  };

  const handleDestroy = async () => {
    if (!project) return;
    if (!confirm('Are you sure you want to DESTROY all resources? This action cannot be undone!')) return;
    
    const creds = getAwsCredentials();
    if (!creds.aws_access_key_id || !creds.aws_secret_access_key) {
      setError('Please configure AWS credentials in Settings');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setLogOutput([]);
    setSummary(null);
    setResourceChanges([]);
    setOperationMetadata({ startedAt: new Date() });
    setShowLogModal(true);
    setCurrentAction('Destroying Terraform Resources...');

    try {
      const ws = new WebSocket('ws://localhost:8080/api/terraform/stream-logs');
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: 'destroy',
          config: {
            project_path: project.LocalPath,
            repository_id: repositoryId,
            state_name: stateName,
            var_file: selectedVarFile,
            auto_approve: true,
            ...creds
          }
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
          setLogOutput(prev => [...prev, data.message]);
        } else if (data.type === 'complete') {
          setLoading(false);
          setCurrentAction('');
          setOperationMetadata(prev => ({ 
            ...prev, 
            completedAt: new Date(), 
            duration: data.duration,
            status: data.success ? 'success' : 'failed'
          }));
          if (data.success) {
            setSuccess('Destroy completed successfully!');
            const parsedSummary = parseTerraformSummary(logOutput);
            const parsedResources = parseTerraformResources(logOutput);
            if (parsedSummary) setSummary(parsedSummary);
            if (parsedResources.length > 0) setResourceChanges(parsedResources);
            if (project) loadDeploymentHistory(project.ProjectID);
          } else {
            setError(data.error || 'Destroy failed');
          }
          ws.close();
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed');
        setLoading(false);
        setCurrentAction('');
      };

      ws.onclose = () => {
        setLoading(false);
        setCurrentAction('');
      };
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      setCurrentAction('');
    }
  };

  if (!project) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/terraform')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-white">Loading project...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/terraform')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-white">{project.Name}</h2>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400 ml-14">
          <span className="flex items-center gap-1">
            <GitBranch className="w-4 h-4" />
            {project.DefaultBranch || 'main'}
          </span>
          <span>{project.PathWithNamespace}</span>
          <span>ID: {project.ProjectID}</span>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Terraform Config */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Branch
                </label>
                <select
                  value={currentBranch}
                  onChange={(e) => switchBranch(e.target.value)}
                  disabled={switchingBranch || branches.length === 0}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                >
                  {branches.length === 0 ? (
                    <option value="">{switchingBranch ? 'Switching...' : (currentBranch || 'Loading branches...')}</option>
                  ) : (
                    branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch} {branch === currentBranch ? '✓' : ''}
                      </option>
                    ))
                  )}
                </select>
                {switchingBranch && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Switching branch...
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Repository ID
                </label>
                <input
                  type="text"
                  value={repositoryId}
                  onChange={(e) => setRepositoryId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  State Name
                </label>
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select state</option>
                  {terraformStates.length > 0 ? (
                    <>
                      <optgroup label="GitLab States">
                        {terraformStates.map((state) => (
                          <option key={state.name} value={state.name}>
                            {state.name} {state.locked ? '🔒' : ''}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Common">
                        <option value="dev">dev</option>
                        <option value="prod">prod</option>
                        <option value="staging">staging</option>
                      </optgroup>
                    </>
                  ) : (
                    <>
                      <option value="dev">dev</option>
                      <option value="prod">prod</option>
                      <option value="staging">staging</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Variables File
                </label>
                <select
                  value={selectedVarFile}
                  onChange={(e) => setSelectedVarFile(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">None</option>
                  {varFiles.map((file) => (
                    <option key={file} value={file}>{file.split('/').pop()}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleInit}
                disabled={loading || !repositoryId || !stateName}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                Initialize Terraform
              </button>
            </div>
          </div>

          {/* Actions */}
          {initialized && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
              
              <div className="space-y-3">
                <button
                  onClick={handlePlan}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FileCode className="w-5 h-5" />
                  Plan
                </button>

                <button
                  onClick={handleApply}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Apply
                </button>

                <button
                  onClick={handleDestroy}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  Destroy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - History */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                History
              </h3>
              <span className="text-sm text-slate-400">{deployments.length} operations</span>
            </div>

            {deployments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No history yet</p>
                <p className="text-sm mt-1">Run Init, Plan, or Apply to see operations here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {deployments.map((deployment) => (
                  <button
                    key={deployment.id}
                    onClick={() => {
                      setLogOutput(deployment.output.split('\n'));
                      setSummary({
                        add: deployment.summary_add,
                        change: deployment.summary_change,
                        destroy: deployment.summary_destroy
                      });
                      setResourceChanges(parseTerraformResources(deployment.output.split('\n')));
                      setOperationMetadata({
                        startedAt: new Date(deployment.started_at),
                        completedAt: deployment.completed_at ? new Date(deployment.completed_at) : undefined,
                        duration: deployment.duration,
                        status: deployment.status
                      });
                      setShowLogModal(true);
                    }}
                    className="w-full text-left p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs rounded font-medium ${
                          deployment.action === 'apply' ? 'bg-green-500/20 text-green-400' :
                          deployment.action === 'destroy' ? 'bg-red-500/20 text-red-400' :
                          deployment.action === 'plan' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {deployment.action.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 text-xs rounded font-medium ${
                          deployment.status === 'success' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {deployment.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {new Date(deployment.started_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-slate-300 mb-2">
                      <span className="font-medium">State: {deployment.state_name}</span>
                      {deployment.var_file && <span>• Vars: {deployment.var_file.split('/').pop()}</span>}
                      <span>• {deployment.duration.toFixed(1)}s</span>
                    </div>
                    
                    {(deployment.summary_add > 0 || deployment.summary_change > 0 || deployment.summary_destroy > 0) && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-600">
                        {deployment.summary_add > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-green-400">+{deployment.summary_add}</span>
                            <span className="text-xs text-slate-400">to add</span>
                          </div>
                        )}
                        {deployment.summary_change > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-yellow-400">~{deployment.summary_change}</span>
                            <span className="text-xs text-slate-400">to change</span>
                          </div>
                        )}
                        {deployment.summary_destroy > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-red-400">-{deployment.summary_destroy}</span>
                            <span className="text-xs text-slate-400">to destroy</span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-5xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                {loading ? (
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                ) : (
                  <Terminal className="w-5 h-5 text-purple-400" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {currentAction || 'Terraform Output'}
                  </h3>
                  {operationMetadata.startedAt && (
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>{new Date(operationMetadata.startedAt).toLocaleString()}</span>
                      {operationMetadata.duration && (
                        <span>• {operationMetadata.duration.toFixed(1)}s</span>
                      )}
                      {operationMetadata.status && (
                        <span className={`px-2 py-0.5 rounded font-medium ${
                          operationMetadata.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {operationMetadata.status}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resource Changes Summary */}
            {resourceChanges.length > 0 && !loading && (
              <div className="p-4 border-b border-slate-700 bg-slate-850">
                <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-400" />
                  Changes Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {resourceChanges.map((change, idx) => {
                    const readable = getReadableResourceName(change.resource);
                    return (
                      <div key={idx} className="flex flex-col gap-2 p-2.5 rounded bg-slate-700/50 hover:bg-slate-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`px-2.5 py-1 rounded font-bold text-sm min-w-[36px] text-center ${
                            change.action === 'create' ? 'bg-green-500/20 text-green-400' :
                            change.action === 'destroy' ? 'bg-red-500/20 text-red-400' :
                            change.action === 'replace' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {change.action === 'create' ? '+' : change.action === 'destroy' ? '-' : change.action === 'replace' ? '±' : '~'}
                          </div>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-lg">{readable.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-100">
                                {readable.type}
                              </div>
                              <div className="text-xs text-slate-400 truncate" title={readable.name}>
                                {readable.name}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Attributes */}
                        {change.attributes && change.attributes.length > 0 && (
                          <div className="pl-12 space-y-1">
                            {change.attributes.map((attr, attrIdx) => (
                              <div key={attrIdx} className="text-xs flex items-start gap-2">
                                <span className={`font-mono font-semibold ${
                                  attr.changeType === 'add' ? 'text-green-400' :
                                  attr.changeType === 'remove' ? 'text-red-400' :
                                  'text-yellow-400'
                                }`}>
                                  {attr.changeType === 'add' ? '+' : attr.changeType === 'remove' ? '-' : '~'}
                                </span>
                                <span className="font-mono text-slate-300">{attr.name}:</span>
                                <span className="text-slate-400 truncate flex-1" title={attr.value}>
                                  {attr.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Compact change description */}
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {resourceChanges.filter(c => c.action === 'create').length > 0 && (
                      <span className="text-green-400 font-medium">
                        {resourceChanges.filter(c => c.action === 'create').length} neue Ressource(n) werden erstellt
                      </span>
                    )}
                    {resourceChanges.filter(c => c.action === 'create').length > 0 && 
                     resourceChanges.filter(c => c.action === 'change').length > 0 && (
                      <span className="text-slate-400"> • </span>
                    )}
                    {resourceChanges.filter(c => c.action === 'change').length > 0 && (
                      <span className="text-yellow-400 font-medium">
                        {resourceChanges.filter(c => c.action === 'change').length} bestehende Ressource(n) werden geändert
                      </span>
                    )}
                    {(resourceChanges.filter(c => c.action === 'create').length > 0 || 
                      resourceChanges.filter(c => c.action === 'change').length > 0) &&
                     resourceChanges.filter(c => c.action === 'destroy').length > 0 && (
                      <span className="text-slate-400"> • </span>
                    )}
                    {resourceChanges.filter(c => c.action === 'destroy').length > 0 && (
                      <span className="text-red-400 font-medium">
                        {resourceChanges.filter(c => c.action === 'destroy').length} Ressource(n) werden gelöscht
                      </span>
                    )}
                    {resourceChanges.filter(c => c.action === 'replace').length > 0 && (
                      <>
                        {(resourceChanges.filter(c => c.action === 'create').length > 0 || 
                          resourceChanges.filter(c => c.action === 'change').length > 0 ||
                          resourceChanges.filter(c => c.action === 'destroy').length > 0) && (
                          <span className="text-slate-400"> • </span>
                        )}
                        <span className="text-orange-400 font-medium">
                          {resourceChanges.filter(c => c.action === 'replace').length} Ressource(n) werden ersetzt
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div 
              ref={logContainerRef}
              className="flex-1 overflow-auto p-4 font-mono text-sm bg-slate-900"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {logOutput.length === 0 ? (
                <div className="text-slate-400">Waiting for output...</div>
              ) : (
                logOutput.map((line, idx) => (
                  <div 
                    key={idx} 
                    className="text-slate-300"
                    dangerouslySetInnerHTML={{ __html: convertAnsiToHtml(line) }}
                  />
                ))
              )}
            </div>

            {summary && !loading && (
              <div className="p-4 border-t border-slate-700 bg-slate-800">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Changes Summary</h4>
                <div className="grid grid-cols-3 gap-3">
                  {summary.add > 0 && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-400">{summary.add}</div>
                      <div className="text-xs text-green-300">to add</div>
                    </div>
                  )}
                  {summary.change > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-400">{summary.change}</div>
                      <div className="text-xs text-yellow-300">to change</div>
                    </div>
                  )}
                  {summary.destroy > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-400">{summary.destroy}</div>
                      <div className="text-xs text-red-300">to destroy</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
