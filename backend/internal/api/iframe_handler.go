package api

import (
	"dashboard/internal/db"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type IFrameHandler struct {
	db *db.Database
}

func NewIFrameHandler(database *db.Database) *IFrameHandler {
	return &IFrameHandler{db: database}
}

func (h *IFrameHandler) GetAllIFramePages(c *gin.Context) {
	pages, err := h.db.GetAllIFramePages()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if pages == nil {
		pages = []db.IFramePage{}
	}

	c.JSON(http.StatusOK, gin.H{"pages": pages})
}

func (h *IFrameHandler) GetIFramePage(c *gin.Context) {
	id := c.Param("id")

	page, err := h.db.GetIFramePage(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if page == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Page not found"})
		return
	}

	c.JSON(http.StatusOK, page)
}

func (h *IFrameHandler) CreateIFramePage(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		URL      string `json:"url" binding:"required"`
		Category string `json:"category" binding:"required"`
		Icon     string `json:"icon" binding:"required"`
		Position int    `json:"position"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	page := &db.IFramePage{
		ID:       uuid.New().String(),
		Name:     req.Name,
		URL:      req.URL,
		Category: req.Category,
		Icon:     req.Icon,
		Position: req.Position,
	}

	if err := h.db.CreateIFramePage(page); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, page)
}

func (h *IFrameHandler) UpdateIFramePage(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Name     string `json:"name" binding:"required"`
		URL      string `json:"url" binding:"required"`
		Category string `json:"category" binding:"required"`
		Icon     string `json:"icon" binding:"required"`
		Position int    `json:"position"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.UpdateIFramePage(id, req.Name, req.URL, req.Category, req.Icon, req.Position); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Page updated"})
}

func (h *IFrameHandler) DeleteIFramePage(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.DeleteIFramePage(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Page deleted"})
}
