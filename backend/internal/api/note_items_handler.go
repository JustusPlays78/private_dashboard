package api

import (
	"dashboard/internal/db"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// NoteItemsHandler handles note items operations
type NoteItemsHandler struct {
	db *db.Database
}

// NewNoteItemsHandler creates a new note items handler
func NewNoteItemsHandler(database *db.Database) *NoteItemsHandler {
	return &NoteItemsHandler{
		db: database,
	}
}

// GetAllItems returns all note items
func (h *NoteItemsHandler) GetAllItems(c *gin.Context) {
	if !h.db.IsUnlocked() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "database is locked"})
		return
	}

	items, err := h.db.GetAllNoteItems()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

// GetItem returns a single note item
func (h *NoteItemsHandler) GetItem(c *gin.Context) {
	if !h.db.IsUnlocked() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "database is locked"})
		return
	}

	id := c.Param("id")
	item, err := h.db.GetNoteItem(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "note not found"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// CreateItem creates a new note item
func (h *NoteItemsHandler) CreateItem(c *gin.Context) {
	if !h.db.IsUnlocked() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "database is locked"})
		return
	}

	var req struct {
		ParentID *string `json:"parent_id"`
		Name     string  `json:"name" binding:"required"`
		Type     int     `json:"type" binding:"required"`
		IsFolder bool    `json:"is_folder"`
		Content  string  `json:"content"`
		Position int     `json:"position"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item := &db.NoteItem{
		ID:       uuid.New().String(),
		ParentID: req.ParentID,
		Name:     req.Name,
		Type:     req.Type,
		IsFolder: req.IsFolder,
		Content:  req.Content,
		Position: req.Position,
	}

	if err := h.db.CreateNoteItem(item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

// UpdateItem updates an existing note item
func (h *NoteItemsHandler) UpdateItem(c *gin.Context) {
	if !h.db.IsUnlocked() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "database is locked"})
		return
	}

	id := c.Param("id")

	var req struct {
		ParentID *string `json:"parent_id"`
		Name     string  `json:"name"`
		Content  string  `json:"content"`
		Position int     `json:"position"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing item
	item, err := h.db.GetNoteItem(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "note not found"})
		return
	}

	// Update fields
	if req.Name != "" {
		item.Name = req.Name
	}
	item.Content = req.Content
	item.Position = req.Position
	item.ParentID = req.ParentID

	if err := h.db.UpdateNoteItem(item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

// DeleteItem deletes a note item
func (h *NoteItemsHandler) DeleteItem(c *gin.Context) {
	if !h.db.IsUnlocked() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "database is locked"})
		return
	}

	id := c.Param("id")

	if err := h.db.DeleteNoteItem(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "note deleted"})
}
