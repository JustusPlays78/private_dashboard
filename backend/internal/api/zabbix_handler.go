package api

import (
	"dashboard/internal/db"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ZabbixHandler struct {
	db *db.Database
}

func NewZabbixHandler(database *db.Database) *ZabbixHandler {
	return &ZabbixHandler{db: database}
}

func (h *ZabbixHandler) GetAllZabbixServers(c *gin.Context) {
	servers, err := h.db.GetAllZabbixServers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if servers == nil {
		servers = []db.ZabbixServer{}
	}

	c.JSON(http.StatusOK, gin.H{"servers": servers})
}

func (h *ZabbixHandler) GetZabbixServer(c *gin.Context) {
	id := c.Param("id")

	server, err := h.db.GetZabbixServer(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if server == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Server not found"})
		return
	}

	c.JSON(http.StatusOK, server)
}

func (h *ZabbixHandler) CreateZabbixServer(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		URL      string `json:"url" binding:"required"`
		Position int    `json:"position"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	server := &db.ZabbixServer{
		ID:       uuid.New().String(),
		Name:     req.Name,
		URL:      req.URL,
		Position: req.Position,
	}

	if err := h.db.CreateZabbixServer(server); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, server)
}

func (h *ZabbixHandler) UpdateZabbixServer(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Name     string `json:"name" binding:"required"`
		URL      string `json:"url" binding:"required"`
		Position int    `json:"position"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.UpdateZabbixServer(id, req.Name, req.URL, req.Position); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Server updated"})
}

func (h *ZabbixHandler) DeleteZabbixServer(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.DeleteZabbixServer(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Server deleted"})
}
