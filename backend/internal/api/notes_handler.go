package api

import (
	"dashboard/internal/db"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for local app
	},
}

// NotesHandler handles notes operations
type NotesHandler struct {
	db           *db.Database
	clients      map[*websocket.Conn]bool
	clientsMutex sync.RWMutex
	lastSave     time.Time
	saveInterval time.Duration
	pendingData  string
	pendingMutex sync.Mutex
	saveTicker   *time.Ticker
}

// NewNotesHandler creates a new notes handler
func NewNotesHandler(database *db.Database) *NotesHandler {
	h := &NotesHandler{
		db:           database,
		clients:      make(map[*websocket.Conn]bool),
		saveInterval: 2 * time.Second,
		lastSave:     time.Now(),
	}

	// Start background save routine
	h.saveTicker = time.NewTicker(h.saveInterval)
	go h.backgroundSave()

	return h
}

// backgroundSave periodically saves pending data
func (h *NotesHandler) backgroundSave() {
	for range h.saveTicker.C {
		h.pendingMutex.Lock()
		data := h.pendingData
		h.pendingMutex.Unlock()

		if data != "" && data != "[]" && h.db.IsUnlocked() {
			// Delete old notes and insert new
			h.db.DB.Exec("DELETE FROM notes")
			_, err := h.db.DB.Exec(
				"INSERT INTO notes (data, updated_at) VALUES (?, CURRENT_TIMESTAMP)",
				data,
			)
			if err != nil {
				log.Printf("Failed to save notes: %v", err)
			} else {
				log.Printf("Notes auto-saved: %d bytes", len(data))
			}
		}
	}
}

// HandleWebSocket handles WebSocket connections for real-time notes sync
func (h *NotesHandler) HandleWebSocket(c *gin.Context) {
	if !h.db.IsUnlocked() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "database is locked"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	h.clientsMutex.Lock()
	h.clients[conn] = true
	h.clientsMutex.Unlock()

	defer func() {
		h.clientsMutex.Lock()
		delete(h.clients, conn)
		h.clientsMutex.Unlock()
	}()

	// Send current notes to new client
	var data string
	err = h.db.DB.QueryRow("SELECT data FROM notes ORDER BY id DESC LIMIT 1").Scan(&data)
	if err == nil {
		conn.WriteJSON(map[string]interface{}{
			"type":  "init",
			"notes": data,
		})
	} else {
		conn.WriteJSON(map[string]interface{}{
			"type":  "init",
			"notes": "[]",
		})
	}

	// Listen for updates
	for {
		var msg map[string]interface{}
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Println("WebSocket read error:", err)
			break
		}

		log.Printf("WebSocket received message type: %v", msg["type"])

		if msg["type"] == "update" {
			if notes, ok := msg["notes"]; ok {
				notesJSON, err := json.Marshal(notes)
				if err != nil {
					log.Printf("Failed to marshal notes: %v", err)
					continue
				}

				log.Printf("Updating notes: %d bytes", len(notesJSON))

				h.pendingMutex.Lock()
				h.pendingData = string(notesJSON)
				h.pendingMutex.Unlock()

				// Broadcast to other clients
				h.clientsMutex.RLock()
				for client := range h.clients {
					if client != conn {
						err := client.WriteJSON(map[string]interface{}{
							"type":  "sync",
							"notes": string(notesJSON),
						})
						if err != nil {
							log.Printf("Failed to broadcast to client: %v", err)
						}
					}
				}
				h.clientsMutex.RUnlock()
			}
		}
	}
}

// GetNotes retrieves all notes
func (h *NotesHandler) GetNotes(c *gin.Context) {
	if !h.db.IsUnlocked() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "database is locked"})
		return
	}

	var data string
	err := h.db.DB.QueryRow("SELECT data FROM notes ORDER BY id DESC LIMIT 1").Scan(&data)
	if err != nil {
		// No notes yet, return empty array
		c.Data(http.StatusOK, "application/json", []byte(`{"notes":[]}`))
		return
	}

	// Return the stored JSON directly wrapped in notes key
	c.Data(http.StatusOK, "application/json", []byte(`{"notes":`+data+`}`))
}

// SaveNotes saves notes data
func (h *NotesHandler) SaveNotes(c *gin.Context) {
	if !h.db.IsUnlocked() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "database is locked"})
		return
	}

	// Read raw body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read request body"})
		return
	}

	// Parse to extract notes array
	var fullRequest map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &fullRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	notes, ok := fullRequest["notes"]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "notes field is required"})
		return
	}

	// Re-encode just the notes part
	notesJSON, err := json.Marshal(notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode notes"})
		return
	}

	// Delete old notes and insert new
	_, err = h.db.DB.Exec("DELETE FROM notes")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to clear old notes"})
		return
	}

	_, err = h.db.DB.Exec(
		"INSERT INTO notes (data, updated_at) VALUES (?, CURRENT_TIMESTAMP)",
		string(notesJSON),
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save notes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "notes saved successfully"})
}
