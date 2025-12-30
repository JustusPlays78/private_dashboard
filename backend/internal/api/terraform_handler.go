package api

import (
	"dashboard/internal/db"
	"dashboard/internal/terraform"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func parseTerraformSummary(output string) (add, change, destroy int) {
	// Parse "Plan: X to add, Y to change, Z to destroy"
	planRegex := regexp.MustCompile(`Plan:\s+(\d+)\s+to\s+add,\s+(\d+)\s+to\s+change,\s+(\d+)\s+to\s+destroy`)

	// Parse "Apply complete! Resources: X added, Y changed, Z destroyed"
	applyRegex := regexp.MustCompile(`Apply complete!.*?(\d+)\s+added,\s+(\d+)\s+changed,\s+(\d+)\s+destroyed`)

	// Parse "Destroy complete! Resources: X destroyed"
	destroyRegex := regexp.MustCompile(`Destroy complete!.*?(\d+)\s+destroyed`)

	if matches := planRegex.FindStringSubmatch(output); len(matches) == 4 {
		add, _ = strconv.Atoi(matches[1])
		change, _ = strconv.Atoi(matches[2])
		destroy, _ = strconv.Atoi(matches[3])
	} else if matches := applyRegex.FindStringSubmatch(output); len(matches) == 4 {
		add, _ = strconv.Atoi(matches[1])
		change, _ = strconv.Atoi(matches[2])
		destroy, _ = strconv.Atoi(matches[3])
	} else if matches := destroyRegex.FindStringSubmatch(output); len(matches) == 2 {
		destroy, _ = strconv.Atoi(matches[1])
	}

	return add, change, destroy
}

type TerraformHandler struct {
	database      *db.Database
	upgrader      websocket.Upgrader
	activeStreams map[string]*websocket.Conn
	streamMutex   sync.Mutex
}

func NewTerraformHandler(database *db.Database) *TerraformHandler {
	return &TerraformHandler{
		database: database,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins in development
			},
		},
		activeStreams: make(map[string]*websocket.Conn),
	}
}

// CheckTerraformInstalled checks if Terraform CLI is available
func (h *TerraformHandler) CheckTerraformInstalled(c *gin.Context) {
	installed := terraform.CheckInstalled()

	if installed {
		version, _ := terraform.GetVersion()
		c.JSON(http.StatusOK, gin.H{
			"installed": true,
			"version":   version,
		})
	} else {
		c.JSON(http.StatusOK, gin.H{
			"installed": false,
			"message":   "Terraform not installed or not in PATH",
		})
	}
}

// InitProject initializes a Terraform project with GitLab backend
func (h *TerraformHandler) InitProject(c *gin.Context) {
	var req struct {
		ProjectPath  string `json:"project_path" binding:"required"`
		RepositoryID string `json:"repository_id" binding:"required"`
		StateName    string `json:"state_name" binding:"required"`
		GitLabUser   string `json:"gitlab_user" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get GitLab config from database
	gitlabConfig, err := h.database.GetGitLabConfig()
	if err != nil || gitlabConfig == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitLab not configured"})
		return
	}

	config := &terraform.TerraformConfig{
		ProjectPath:   req.ProjectPath,
		GitLabBaseURL: gitlabConfig.BaseURL,
		GitLabToken:   gitlabConfig.Token,
		GitLabUser:    req.GitLabUser,
		RepositoryID:  req.RepositoryID,
		StateName:     req.StateName,
	}

	result, err := terraform.Init(config, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Terraform init failed",
			"output": result.Output,
			"detail": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Terraform initialized successfully",
		"output":   result.Output,
		"duration": result.Duration.Seconds(),
	})
}

// PlanProject runs terraform plan
func (h *TerraformHandler) PlanProject(c *gin.Context) {
	var req struct {
		ProjectPath string `json:"project_path" binding:"required"`
		VarFile     string `json:"var_file"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config := &terraform.TerraformConfig{
		ProjectPath: req.ProjectPath,
		VarFile:     req.VarFile,
	}

	result, err := terraform.Plan(config, nil)

	c.JSON(http.StatusOK, gin.H{
		"success":  err == nil,
		"output":   result.Output,
		"error":    result.Error,
		"duration": result.Duration.Seconds(),
		"command":  result.Command,
	})
}

// ApplyProject runs terraform apply
func (h *TerraformHandler) ApplyProject(c *gin.Context) {
	var req struct {
		ProjectPath string `json:"project_path" binding:"required"`
		VarFile     string `json:"var_file"`
		AutoApprove bool   `json:"auto_approve"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config := &terraform.TerraformConfig{
		ProjectPath: req.ProjectPath,
		VarFile:     req.VarFile,
	}

	result, err := terraform.Apply(config, req.AutoApprove, nil)

	c.JSON(http.StatusOK, gin.H{
		"success":  err == nil,
		"output":   result.Output,
		"error":    result.Error,
		"duration": result.Duration.Seconds(),
		"command":  result.Command,
	})
}

// DestroyProject runs terraform destroy
func (h *TerraformHandler) DestroyProject(c *gin.Context) {
	var req struct {
		ProjectPath string `json:"project_path" binding:"required"`
		VarFile     string `json:"var_file"`
		AutoApprove bool   `json:"auto_approve"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config := &terraform.TerraformConfig{
		ProjectPath: req.ProjectPath,
		VarFile:     req.VarFile,
	}

	result, err := terraform.Destroy(config, req.AutoApprove, nil)

	c.JSON(http.StatusOK, gin.H{
		"success":  err == nil,
		"output":   result.Output,
		"error":    result.Error,
		"duration": result.Duration.Seconds(),
		"command":  result.Command,
	})
}

// ShowState shows the current Terraform state
func (h *TerraformHandler) ShowState(c *gin.Context) {
	var req struct {
		ProjectPath string `json:"project_path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := terraform.ShowState(req.ProjectPath, nil)

	c.JSON(http.StatusOK, gin.H{
		"success": err == nil,
		"output":  result.Output,
		"error":   result.Error,
	})
}

// FindVarFiles finds all .tfvars files in a project
func (h *TerraformHandler) FindVarFiles(c *gin.Context) {
	projectPath := c.Query("project_path")
	if projectPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project_path is required"})
		return
	}

	varFiles, err := terraform.FindVarFiles(projectPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"var_files": varFiles,
		"count":     len(varFiles),
	})
}

// ListWorkspaces lists all Terraform workspaces
func (h *TerraformHandler) ListWorkspaces(c *gin.Context) {
	projectPath := c.Query("project_path")
	if projectPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project_path is required"})
		return
	}

	workspaces, err := terraform.ListWorkspaces(projectPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"workspaces": workspaces,
		"count":      len(workspaces),
	})
}

// StreamLogs handles WebSocket connection for live log streaming
func (h *TerraformHandler) StreamLogs(c *gin.Context) {
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Mutex for WebSocket writes to prevent concurrent write panic
	var writeMutex sync.Mutex

	// Read messages from client
	for {
		var req struct {
			Action string `json:"action"`
			Config struct {
				ProjectPath        string `json:"project_path"`
				VarFile            string `json:"var_file"`
				RepositoryID       string `json:"repository_id"`
				StateName          string `json:"state_name"`
				GitLabUser         string `json:"gitlab_user"`
				AWSAccessKeyID     string `json:"aws_access_key_id"`
				AWSSecretAccessKey string `json:"aws_secret_access_key"`
				AWSSessionToken    string `json:"aws_session_token"`
				AutoApprove        bool   `json:"auto_approve"`
			} `json:"config"`
		}

		if err := conn.ReadJSON(&req); err != nil {
			break
		}

		fmt.Printf("[DEBUG] Received %s request\n", req.Action)
		fmt.Printf("[DEBUG] AWS Access Key: %s...\n", req.Config.AWSAccessKeyID[:min(20, len(req.Config.AWSAccessKeyID))])
		fmt.Printf("[DEBUG] AWS Secret Key: %s...\n", req.Config.AWSSecretAccessKey[:min(10, len(req.Config.AWSSecretAccessKey))])
		if req.Config.AWSSessionToken != "" {
			fmt.Printf("[DEBUG] AWS Session Token: %s...\n", req.Config.AWSSessionToken[:min(20, len(req.Config.AWSSessionToken))])
		}

		// Get GitLab config from database for init action
		var gitlabConfig *db.GitLabConfig
		if req.Action == "init" {
			gitlabConfig, err = h.database.GetGitLabConfig()
			if err != nil || gitlabConfig == nil {
				conn.WriteJSON(gin.H{
					"type":    "complete",
					"success": false,
					"error":   "GitLab not configured",
				})
				continue
			}
		}

		config := &terraform.TerraformConfig{
			ProjectPath:        req.Config.ProjectPath,
			VarFile:            req.Config.VarFile,
			RepositoryID:       req.Config.RepositoryID,
			StateName:          req.Config.StateName,
			GitLabUser:         req.Config.GitLabUser,
			AWSAccessKeyID:     req.Config.AWSAccessKeyID,
			AWSSecretAccessKey: req.Config.AWSSecretAccessKey,
			AWSSessionToken:    req.Config.AWSSessionToken,
		}

		if gitlabConfig != nil {
			config.GitLabBaseURL = gitlabConfig.BaseURL
			config.GitLabToken = gitlabConfig.Token
		}

		logCallback := func(line string) {
			writeMutex.Lock()
			defer writeMutex.Unlock()
			conn.WriteJSON(gin.H{
				"type":    "log",
				"message": line,
			})
		}

		var result *terraform.ExecutionResult
		var execErr error

		startTime := time.Now()

		switch req.Action {
		case "init":
			result, execErr = terraform.Init(config, logCallback)
			fmt.Printf("[DEBUG] Init completed: result=%v, error=%v\n", result != nil, execErr)
		case "plan":
			result, execErr = terraform.Plan(config, logCallback)
			fmt.Printf("[DEBUG] Plan completed: result=%v, error=%v\n", result != nil, execErr)
		case "apply":
			result, execErr = terraform.Apply(config, req.Config.AutoApprove, logCallback)
			fmt.Printf("[DEBUG] Apply completed: result=%v, error=%v\n", result != nil, execErr)
		case "destroy":
			result, execErr = terraform.Destroy(config, req.Config.AutoApprove, logCallback)
			fmt.Printf("[DEBUG] Destroy completed: result=%v, error=%v\n", result != nil, execErr)
		default:
			conn.WriteJSON(gin.H{
				"type":    "complete",
				"success": false,
				"error":   "Unknown action",
			})
			continue
		}

		// Save deployment to database (for all actions including plan)
		if result != nil {
			completedAt := time.Now()
			add, change, destroy := parseTerraformSummary(result.Output)

			// Parse ProjectID from RepositoryID
			projectID := 0
			if req.Config.RepositoryID != "" {
				if id, err := strconv.Atoi(req.Config.RepositoryID); err == nil {
					projectID = id
				}
			}

			fmt.Printf("[DEBUG] Saving deployment: action=%s, projectID=%d, status=%s\n", req.Action, projectID, func() string {
				if execErr != nil {
					return "failed"
				}
				return "success"
			}())

			deployment := &db.TerraformDeployment{
				ProjectID:      projectID,
				ProjectName:    req.Config.ProjectPath,
				Action:         req.Action,
				StateName:      req.Config.StateName,
				VarFile:        req.Config.VarFile,
				Status:         "success",
				Output:         result.Output,
				SummaryAdd:     add,
				SummaryChange:  change,
				SummaryDestroy: destroy,
				Duration:       result.Duration.Seconds(),
				Error:          result.Error,
				StartedAt:      startTime,
				CompletedAt:    &completedAt,
			}

			if execErr != nil {
				deployment.Status = "failed"
			}

			if id, err := h.database.SaveDeployment(deployment); err != nil {
				fmt.Printf("[ERROR] Failed to save deployment: %v\n", err)
			} else {
				fmt.Printf("[DEBUG] Deployment saved successfully with ID: %d\n", id)
			}
		}

		writeMutex.Lock()
		conn.WriteJSON(gin.H{
			"type":     "complete",
			"success":  execErr == nil,
			"output":   result.Output,
			"error":    result.Error,
			"duration": result.Duration.Seconds(),
			"command":  result.Command,
		})
		writeMutex.Unlock()
	}
}
