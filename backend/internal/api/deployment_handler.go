package api

import (
	"dashboard/internal/db"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type DeploymentHandler struct {
	database *db.Database
}

func NewDeploymentHandler(database *db.Database) *DeploymentHandler {
	return &DeploymentHandler{
		database: database,
	}
}

// GetProjectDeployments retrieves all deployments for a project
func (h *DeploymentHandler) GetProjectDeployments(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	deployments, err := h.database.GetDeploymentsByProject(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"deployments": deployments,
		"count":       len(deployments),
	})
}

// GetAllDeployments retrieves recent deployments
func (h *DeploymentHandler) GetAllDeployments(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	deployments, err := h.database.GetAllDeployments(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"deployments": deployments,
		"count":       len(deployments),
	})
}

// GetDeployment retrieves a single deployment
func (h *DeploymentHandler) GetDeployment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid deployment ID"})
		return
	}

	deployment, err := h.database.GetDeployment(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if deployment == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Deployment not found"})
		return
	}

	c.JSON(http.StatusOK, deployment)
}
