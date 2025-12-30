package api

import (
	"dashboard/internal/db"
	"dashboard/internal/session"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

var sessionManager *session.Manager

// SetupRoutes configures all API routes
func SetupRoutes(router *gin.Engine, database *db.Database) {
	// Initialize session manager with 30 minute timeout
	sessionManager = session.NewManager(30*time.Minute, func() {
		// On timeout, lock the database
		database.Lock()
	})

	// Start the session timeout watcher
	sessionManager.StartWatcher()

	// Initialize GitLab handler with database and work directory
	appDataDir := os.Getenv("APPDATA")
	if appDataDir == "" {
		appDataDir = os.Getenv("HOME")
	}
	gitlabWorkDir := filepath.Join(appDataDir, "TerraformDashboard", "gitlab-projects")
	gitlabHandler := NewGitLabHandler(database, gitlabWorkDir)

	// Initialize Terraform handler
	terraformHandler := NewTerraformHandler(database)

	// Initialize Deployment handler
	deploymentHandler := NewDeploymentHandler(database)

	// Initialize Notes handler
	notesHandler := NewNotesHandler(database)

	// Initialize NoteItems handler
	noteItemsHandler := NewNoteItemsHandler(database)

	// Initialize Zabbix handler
	zabbixHandler := NewZabbixHandler(database)

	// Health check
	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Dashboard Backend",
		})
	})

	// Auth routes
	authGroup := router.Group("/api/auth")
	{
		authGroup.GET("/status", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"initialized": database.IsInitialized(),
				"unlocked":    database.IsUnlocked(),
			})
		})

		authGroup.POST("/initialize", func(c *gin.Context) {
			var req struct {
				Password string `json:"password" binding:"required"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(400, gin.H{"error": "Invalid request"})
				return
			}

			if len(req.Password) < 8 {
				c.JSON(400, gin.H{"error": "Password must be at least 8 characters"})
				return
			}

			if err := database.Initialize(req.Password); err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}

			// Start session on successful initialization
			sessionManager.Start()

			c.JSON(200, gin.H{
				"message": "Database initialized successfully",
			})
		})

		authGroup.POST("/unlock", func(c *gin.Context) {
			var req struct {
				Password string `json:"password" binding:"required"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(400, gin.H{"error": "Invalid request"})
				return
			}

			if err := database.Unlock(req.Password); err != nil {
				c.JSON(401, gin.H{"error": "Invalid password"})
				return
			}

			// Start session on successful unlock
			sessionManager.Start()

			c.JSON(200, gin.H{
				"message": "Database unlocked successfully",
			})
		})

		authGroup.POST("/lock", func(c *gin.Context) {
			database.Lock()
			sessionManager.Stop()

			c.JSON(200, gin.H{
				"message": "Database locked successfully",
			})
		})

		authGroup.POST("/heartbeat", func(c *gin.Context) {
			if !database.IsUnlocked() {
				c.JSON(403, gin.H{"error": "Database is locked"})
				return
			}

			// Update activity
			sessionManager.UpdateActivity()

			c.JSON(200, gin.H{
				"message":         "Activity updated",
				"time_until_lock": sessionManager.GetTimeUntilTimeout().Seconds(),
			})
		})
	}

	// Dashboard routes (require unlocked database)
	dashboardGroup := router.Group("/api/dashboard")
	dashboardGroup.Use(RequireUnlocked(database))
	{
		dashboardGroup.GET("/stats", func(c *gin.Context) {
			// TODO: Implement dashboard stats
			c.JSON(200, gin.H{
				"aws_resources":      0,
				"terraform_states":   0,
				"active_deployments": 0,
				"cost_this_month":    "$0",
			})
		})
	}

	// Terraform routes (require unlocked database)
	terraformGroup := router.Group("/api/terraform")
	terraformGroup.Use(RequireUnlocked(database))
	{
		terraformGroup.GET("/check", terraformHandler.CheckTerraformInstalled)
		terraformGroup.POST("/init", terraformHandler.InitProject)
		terraformGroup.POST("/plan", terraformHandler.PlanProject)
		terraformGroup.POST("/apply", terraformHandler.ApplyProject)
		terraformGroup.POST("/destroy", terraformHandler.DestroyProject)
		terraformGroup.POST("/show-state", terraformHandler.ShowState)
		terraformGroup.GET("/var-files", terraformHandler.FindVarFiles)
		terraformGroup.GET("/workspaces", terraformHandler.ListWorkspaces)
		terraformGroup.GET("/stream-logs", terraformHandler.StreamLogs)
	}

	// GitLab routes (require unlocked database)
	gitlabGroup := router.Group("/api/gitlab")
	gitlabGroup.Use(RequireUnlocked(database))
	{
		gitlabGroup.POST("/configure", gitlabHandler.ConfigureGitLab)
		gitlabGroup.GET("/config", gitlabHandler.GetSavedGitLabConfig)
		gitlabGroup.GET("/projects", gitlabHandler.ListGitLabProjects)
		gitlabGroup.GET("/projects/search", gitlabHandler.SearchGitLabProjects)
		gitlabGroup.GET("/projects/:id", gitlabHandler.GetGitLabProject)
		gitlabGroup.GET("/projects/:id/tree", gitlabHandler.GetRepositoryTree)
		gitlabGroup.POST("/clone", gitlabHandler.CloneGitLabProject)
		gitlabGroup.POST("/pull", gitlabHandler.PullGitLabProject)
		gitlabGroup.GET("/git/check", gitlabHandler.CheckGitInstallation)
		gitlabGroup.GET("/cloned-projects", gitlabHandler.GetSavedClonedProjects)
		gitlabGroup.DELETE("/cloned-projects", gitlabHandler.DeleteSavedGitLabProject)

		// Group-related routes
		gitlabGroup.GET("/groups", gitlabHandler.ListGroups)
		gitlabGroup.GET("/groups/search", gitlabHandler.SearchGroups)
		gitlabGroup.GET("/groups/:id/projects", gitlabHandler.GetGroupProjects)

		// Terraform state routes
		gitlabGroup.GET("/projects/:id/terraform/states", gitlabHandler.GetTerraformStates)

		// Branch management routes
		gitlabGroup.POST("/branches/list", gitlabHandler.ListProjectBranches)
		gitlabGroup.POST("/branches/switch", gitlabHandler.SwitchProjectBranch)
	}

	// Deployment routes (require unlocked database)
	deploymentGroup := router.Group("/api/deployments")
	deploymentGroup.Use(RequireUnlocked(database))
	{
		deploymentGroup.GET("", deploymentHandler.GetAllDeployments)
		deploymentGroup.GET("/:id", deploymentHandler.GetDeployment)
		deploymentGroup.GET("/project/:id", deploymentHandler.GetProjectDeployments)
	}

	// Notes routes (require unlocked database)
	notesGroup := router.Group("/api/notes")
	notesGroup.Use(RequireUnlocked(database))
	{
		notesGroup.GET("", notesHandler.GetNotes)
		notesGroup.POST("", notesHandler.SaveNotes)
		notesGroup.GET("/ws", notesHandler.HandleWebSocket)
	}

	// Note Items routes (new tree structure)
	noteItemsGroup := router.Group("/api/note-items")
	noteItemsGroup.Use(RequireUnlocked(database))
	{
		noteItemsGroup.GET("", noteItemsHandler.GetAllItems)
		noteItemsGroup.GET("/:id", noteItemsHandler.GetItem)
		noteItemsGroup.POST("", noteItemsHandler.CreateItem)
		noteItemsGroup.PUT("/:id", noteItemsHandler.UpdateItem)
		noteItemsGroup.DELETE("/:id", noteItemsHandler.DeleteItem)
	}

	// Zabbix routes
	zabbixGroup := router.Group("/api/zabbix-servers")
	zabbixGroup.Use(RequireUnlocked(database))
	{
		zabbixGroup.GET("", zabbixHandler.GetAllZabbixServers)
		zabbixGroup.GET("/:id", zabbixHandler.GetZabbixServer)
		zabbixGroup.POST("", zabbixHandler.CreateZabbixServer)
		zabbixGroup.PUT("/:id", zabbixHandler.UpdateZabbixServer)
		zabbixGroup.DELETE("/:id", zabbixHandler.DeleteZabbixServer)
	}

	// IFrame Pages routes
	iframeHandler := NewIFrameHandler(database)
	iframeGroup := router.Group("/api/iframe-pages")
	iframeGroup.Use(RequireUnlocked(database))
	{
		iframeGroup.GET("", iframeHandler.GetAllIFramePages)
		iframeGroup.GET("/:id", iframeHandler.GetIFramePage)
		iframeGroup.POST("", iframeHandler.CreateIFramePage)
		iframeGroup.PUT("/:id", iframeHandler.UpdateIFramePage)
		iframeGroup.DELETE("/:id", iframeHandler.DeleteIFramePage)
	}
}

// RequireUnlocked middleware ensures database is unlocked
func RequireUnlocked(database *db.Database) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !database.IsUnlocked() {
			c.JSON(403, gin.H{"error": "Database is locked"})
			c.Abort()
			return
		}
		c.Next()
	}
}
