import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, AlertCircle, FolderOpen, GitBranch, ArrowRight, Download, CheckCircle, Terminal, Loader2
} from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { useToast } from '../components/ToastProvider';

interface ClonedProject {
  ProjectID: number;
  Name: string;
  PathWithNamespace: string;
  LocalPath: string;
  DefaultBranch: string;
  ClonedAt: string;
}

export default function TerraformDeployer() {
  const navigate = useNavigate();
  const appState = useAppState();
  const toast = useToast();
  const [projects, setProjects] = useState<ClonedProject[]>([]);
  const [terraformInstalled, setTerraformInstalled] = useState<boolean | null>(null);
  const [terraformVersion, setTerraformVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    // Use preloaded state if available
    if (appState.terraform.checked) {
      setTerraformInstalled(appState.terraform.installed);
      setTerraformVersion(appState.terraform.version || null);
      setIsChecking(false);
    } else {
      checkTerraform();
    }
    loadClonedProjects();
  }, [appState.terraform]);

  const checkTerraform = async () => {
    setIsChecking(true);
    try {
      const result = await window.electronAPI.terraform.check();
      setTerraformInstalled(result.installed);
      setTerraformVersion(result.version || null);
    } catch (err) {
      console.error('Failed to check Terraform:', err);
      setTerraformInstalled(false);
    } finally {
      setIsChecking(false);
    }
  };

  const loadClonedProjects = async () => {
    try {
      const result = await window.electronAPI.gitlab.getClonedProjects();
      if (result.projects && Array.isArray(result.projects)) {
        setProjects(result.projects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const downloadTerraform = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    
    // Show progress toast
    toast.showProgress('terraform-download', 'Installing Terraform');
    toast.updateProgress('terraform-download', 'downloading', 10, 'Downloading Terraform CLI...');
    
    try {
      const result = await window.electronAPI.tools.download('terraform');
      if (result.success) {
        toast.updateProgress('terraform-download', 'extracting', 80, 'Extracting files...');
        // Small delay to show extracting state
        await new Promise(r => setTimeout(r, 500));
        toast.completeProgress('terraform-download', true, 'Terraform installed successfully!');
        // Re-check after download
        await checkTerraform();
      } else {
        toast.completeProgress('terraform-download', false, result.error || 'Download failed');
        setDownloadError(result.error || 'Download failed');
      }
    } catch (err: any) {
      toast.completeProgress('terraform-download', false, err.message);
      setDownloadError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          <span>Checking Terraform installation...</span>
        </div>
      </div>
    );
  }

  if (!terraformInstalled) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Rocket className="w-7 h-7 text-primary" />
            Terraform Deployer
          </h2>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 rounded-lg">
              <Terminal className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-amber-400 font-semibold text-lg mb-2">Terraform CLI Not Found</h3>
              <p className="text-muted-foreground mb-4">
                This app uses the Terraform CLI installed on your system to deploy infrastructure.
                Terraform was not found in your system PATH.
              </p>
              
              <div className="bg-card/50 border border-border rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Installation Options:</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <p className="text-sm text-foreground">Download from HashiCorp</p>
                      <a 
                        href="https://developer.hashicorp.com/terraform/downloads" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex items-center gap-1 mt-1"
                      >
                        <Download className="w-3 h-3" />
                        terraform.io/downloads
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <p className="text-sm text-foreground">Using Chocolatey (Windows)</p>
                      <code className="text-xs bg-background px-2 py-1 rounded text-muted-foreground mt-1 block">
                        choco install terraform
                      </code>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <p className="text-sm text-foreground">Using Winget (Windows)</p>
                      <code className="text-xs bg-background px-2 py-1 rounded text-muted-foreground mt-1 block">
                        winget install HashiCorp.Terraform
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {downloadError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
                  {downloadError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={downloadTerraform}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Auto-Install Terraform
                    </>
                  )}
                </button>
                <button
                  onClick={checkTerraform}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-primary-foreground rounded-lg transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Check Again
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Auto-Install downloads a portable version of Terraform that works with this app only.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Rocket className="w-7 h-7 text-primary" />
          Terraform Deployer
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Terraform installed</span>
          {terraformVersion && (
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs">
              {terraformVersion}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-purple-400" />
              Your Terraform Projects
            </h3>
            {!localStorage.getItem('aws_access_key_id') && (
              <button
                onClick={() => navigate('/settings')}
                className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1"
              >
                <AlertCircle className="w-4 h-4" />
                Configure AWS Credentials
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400 mb-2">
                No cloned projects found. Clone a project from GitLab first.
              </p>
              <button
                onClick={() => navigate('/gitlab')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                Go to GitLab
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.ProjectID}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors border border-slate-600 group"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex-1">
                      <div className="font-medium text-white mb-2">{project.Name}</div>
                      <div className="text-xs text-slate-400 mb-3">{project.PathWithNamespace}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mb-3">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          {project.DefaultBranch || 'main'}
                        </span>
                        <span>• ID: {project.ProjectID}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/terraform/project/${project.ProjectID}`)}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Open Project</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
