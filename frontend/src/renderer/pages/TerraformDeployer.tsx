import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, AlertCircle, FolderOpen, GitBranch, ArrowRight
} from 'lucide-react';

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
  const [projects, setProjects] = useState<ClonedProject[]>([]);
  const [terraformInstalled, setTerraformInstalled] = useState(false);

  useEffect(() => {
    checkTerraform();
    loadClonedProjects();
  }, []);

  const checkTerraform = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/terraform/check');
      const data = await response.json();
      setTerraformInstalled(data.installed);
    } catch (err) {
      console.error('Failed to check Terraform:', err);
    }
  };

  const loadClonedProjects = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/gitlab/cloned-projects');
      const data = await response.json();
      if (data.projects && Array.isArray(data.projects)) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  if (!terraformInstalled) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-red-400 font-medium mb-1">Terraform Not Installed</h3>
            <p className="text-slate-300 text-sm mb-2">
              Terraform CLI is required for infrastructure deployment.
            </p>
            <a 
              href="https://developer.hashicorp.com/terraform/downloads" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Download Terraform
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Rocket className="w-7 h-7 text-purple-400" />
          Terraform Deployer
        </h2>
        <p className="text-slate-400">Select a project to manage infrastructure deployments</p>
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
