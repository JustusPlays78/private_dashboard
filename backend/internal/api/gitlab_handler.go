package api

import (
	"net/http"
	"strconv"

	"dashboard/internal/db"
	"dashboard/internal/gitlab"

	"github.com/gin-gonic/gin"
)

type GitLabHandler struct {
	client   *gitlab.Client
	cloner   *gitlab.Cloner
	database *db.Database
}

func NewGitLabHandler(database *db.Database, workDir string) *GitLabHandler {
	return &GitLabHandler{
		database: database,
		cloner:   gitlab.NewCloner(workDir),
	}
}

// ConfigureGitLab configures the GitLab connection
func (h *GitLabHandler) ConfigureGitLab(c *gin.Context) {
	var req struct {
		BaseURL string `json:"base_url" binding:"required"`
		Token   string `json:"token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create new client
	h.client = gitlab.NewClient(req.BaseURL, req.Token)

	// Test connection
	if err := h.client.TestConnection(); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "GitLab connection failed: " + err.Error()})
		return
	}

	// Save to database
	if err := h.database.SaveGitLabConfig(req.BaseURL, req.Token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save config: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "GitLab configured successfully",
		"base_url": req.BaseURL,
	})
}

// ListGitLabProjects lists all accessible GitLab projects
func (h *GitLabHandler) ListGitLabProjects(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
		return
	}

	projects, err := h.client.ListProjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": projects,
		"count":    len(projects),
	})
}

// SearchGitLabProjects searches for GitLab projects
func (h *GitLabHandler) SearchGitLabProjects(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
		return
	}

	search := c.Query("q")
	if search == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search query required"})
		return
	}

	projects, err := h.client.SearchProjects(search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": projects,
		"count":    len(projects),
	})
}

// GetGitLabProject gets details of a specific GitLab project
func (h *GitLabHandler) GetGitLabProject(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
		return
	}

	projectIDStr := c.Param("id")

	// Try to get project by ID (can be numeric ID or path)
	project, err := h.client.GetProjectByID(projectIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, project)
}

// CloneGitLabProject clones a GitLab project to local storage
func (h *GitLabHandler) CloneGitLabProject(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
		return
	}

	var req struct {
		ProjectID int    `json:"project_id" binding:"required"`
		Token     string `json:"token"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get project details
	project, err := h.client.GetProject(req.ProjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get project: " + err.Error()})
		return
	}

	// Clone repository
	projectPath, err := h.cloner.CloneRepository(project.HTTPURL, project.PathWithNamespace, req.Token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to clone: " + err.Error()})
		return
	}

	// Get current branch and last commit
	branch, _ := h.cloner.GetCurrentBranch(projectPath)
	commitHash, commitMsg, _ := h.cloner.GetLastCommit(projectPath)

	// List Terraform files
	tfFiles, _ := h.cloner.ListTerraformFiles(projectPath)

	// Save to database
	savedProject := &db.GitLabProject{
		ProjectID:         req.ProjectID,
		Name:              project.Name,
		PathWithNamespace: project.PathWithNamespace,
		HTTPUrl:           project.HTTPURL,
		DefaultBranch:     project.DefaultBranch,
		LocalPath:         projectPath,
	}
	if err := h.database.SaveGitLabProject(savedProject); err != nil {
		// Log error but don't fail the response, cloning succeeded
		c.JSON(http.StatusOK, gin.H{
			"message":      "Project cloned successfully (save to DB failed)",
			"project_path": projectPath,
			"project_name": project.Name,
			"branch":       branch,
			"last_commit": gin.H{
				"hash":    commitHash,
				"message": commitMsg,
			},
			"terraform_files":       tfFiles,
			"terraform_files_count": len(tfFiles),
			"warning":               "failed to save to database: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Project cloned successfully",
		"project_path": projectPath,
		"project_name": project.Name,
		"branch":       branch,
		"last_commit": gin.H{
			"hash":    commitHash,
			"message": commitMsg,
		},
		"terraform_files":       tfFiles,
		"terraform_files_count": len(tfFiles),
	})
}

// PullGitLabProject pulls latest changes from a cloned project
func (h *GitLabHandler) PullGitLabProject(c *gin.Context) {
	var req struct {
		ProjectPath string `json:"project_path" binding:"required"`
		ProjectID   int    `json:"project_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Pull latest changes
	if err := h.cloner.PullLatest(req.ProjectPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to pull: " + err.Error()})
		return
	}

	// Update database pull time if project_id provided
	if req.ProjectID > 0 {
		if err := h.database.UpdateGitLabProjectPullTime(req.ProjectID); err != nil {
			// Log error but don't fail the response, pull succeeded
		}
	}

	// Get updated info
	branch, _ := h.cloner.GetCurrentBranch(req.ProjectPath)
	commitHash, commitMsg, _ := h.cloner.GetLastCommit(req.ProjectPath)
	tfFiles, _ := h.cloner.ListTerraformFiles(req.ProjectPath)

	c.JSON(http.StatusOK, gin.H{
		"message": "Project updated successfully",
		"branch":  branch,
		"last_commit": gin.H{
			"hash":    commitHash,
			"message": commitMsg,
		},
		"terraform_files":       tfFiles,
		"terraform_files_count": len(tfFiles),
	})
}

// GetRepositoryTree gets the file tree of a repository
func (h *GitLabHandler) GetRepositoryTree(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
		return
	}

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	path := c.DefaultQuery("path", "")
	ref := c.DefaultQuery("ref", "main")

	tree, err := h.client.GetRepositoryTree(projectID, path, ref)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tree":  tree,
		"count": len(tree),
	})
}

// CheckGitInstallation checks if git is installed
func (h *GitLabHandler) CheckGitInstallation(c *gin.Context) {
	err := gitlab.CheckGitInstalled()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"installed": false,
			"error":     err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"installed": true,
		"message":   "Git is installed and ready",
	})
}

// ListGroups lists all accessible GitLab groups
func (h *GitLabHandler) ListGroups(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
		return
	}

	groups, err := h.client.ListGroups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"groups": groups,
		"count":  len(groups),
	})
}

// SearchGroups searches for GitLab groups
func (h *GitLabHandler) SearchGroups(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
		return
	}

	search := c.Query("q")
	if search == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search query required"})
		return
	}

	groups, err := h.client.SearchGroups(search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"groups": groups,
		"count":  len(groups),
	})
}

// GetGroupProjects gets all projects in a specific group
func (h *GitLabHandler) GetGroupProjects(c *gin.Context) {
	if h.client == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
		return
	}

	groupID := c.Param("id")

	projects, err := h.client.GetGroupProjects(groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": projects,
		"count":    len(projects),
	})
}

// GetSavedGitLabConfig retrieves stored GitLab configuration
func (h *GitLabHandler) GetSavedGitLabConfig(c *gin.Context) {
	config, err := h.database.GetGitLabConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load config: " + err.Error()})
		return
	}

	if config == nil {
		c.JSON(http.StatusOK, gin.H{
			"configured": false,
			"message":    "No GitLab configuration saved",
		})
		return
	}

	// Initialize client with saved config
	h.client = gitlab.NewClient(config.BaseURL, config.Token)

	c.JSON(http.StatusOK, gin.H{
		"configured": true,
		"base_url":   config.BaseURL,
		"token":      "***" + config.Token[len(config.Token)-4:], // Mask token
	})
}

// GetSavedClonedProjects retrieves list of previously cloned projects
func (h *GitLabHandler) GetSavedClonedProjects(c *gin.Context) {
	projects, err := h.database.GetGitLabProjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load projects: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"projects": projects,
		"count":    len(projects),
	})
}

// DeleteSavedGitLabProject removes a saved project from database
func (h *GitLabHandler) DeleteSavedGitLabProject(c *gin.Context) {
	var req struct {
		ProjectID int `json:"project_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.database.DeleteGitLabProject(req.ProjectID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete project: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Project deleted successfully",
	})
}

// GetTerraformStates lists all Terraform states for a project
func (h *GitLabHandler) GetTerraformStates(c *gin.Context) {
	// Get GitLab config from database if client not initialized
	if h.client == nil {
		config, err := h.database.GetGitLabConfig()
		if err != nil || config == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
			return
		}
		h.client = gitlab.NewClient(config.BaseURL, config.Token)
	}

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	states, err := h.client.ListTerraformStates(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"states": states,
		"count":  len(states),
	})
}

// ListProjectBranches lists all branches for a cloned project
func (h *GitLabHandler) ListProjectBranches(c *gin.Context) {
	var req struct {
		ProjectPath string `json:"project_path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	branches, err := h.cloner.ListBranches(req.ProjectPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list branches: " + err.Error()})
		return
	}

	// Get current branch
	currentBranch, _ := h.cloner.GetCurrentBranch(req.ProjectPath)

	c.JSON(http.StatusOK, gin.H{
		"branches":       branches,
		"current_branch": currentBranch,
		"count":          len(branches),
	})
}

// SwitchProjectBranch switches to a different branch for a cloned project
func (h *GitLabHandler) SwitchProjectBranch(c *gin.Context) {
	var req struct {
		ProjectPath string `json:"project_path" binding:"required"`
		BranchName  string `json:"branch_name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.cloner.SwitchBranch(req.ProjectPath, req.BranchName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to switch branch: " + err.Error()})
		return
	}

	// Get updated info after branch switch
	currentBranch, _ := h.cloner.GetCurrentBranch(req.ProjectPath)
	commitHash, commitMsg, _ := h.cloner.GetLastCommit(req.ProjectPath)
	tfFiles, _ := h.cloner.ListTerraformFiles(req.ProjectPath)

	c.JSON(http.StatusOK, gin.H{
		"message": "Branch switched successfully",
		"branch":  currentBranch,
		"last_commit": gin.H{
			"hash":    commitHash,
			"message": commitMsg,
		},
		"terraform_files":       tfFiles,
		"terraform_files_count": len(tfFiles),
	})
}
