package db

import (
	"database/sql"
	"time"
)

// NoteItem represents a note or folder in the tree structure
type NoteItem struct {
	ID        string    `json:"id"`
	ParentID  *string   `json:"parent_id"`
	Name      string    `json:"name"`
	Type      int       `json:"type"` // 1=word-like, 2=table, 3=canvas
	IsFolder  bool      `json:"is_folder"`
	Content   string    `json:"content"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GetAllNoteItems returns all note items
func (db *Database) GetAllNoteItems() ([]NoteItem, error) {
	if !db.isUnlocked {
		return nil, ErrDatabaseLocked
	}

	rows, err := db.DB.Query(`
		SELECT id, parent_id, name, type, is_folder, content, position, created_at, updated_at
		FROM note_items
		ORDER BY parent_id, position, name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []NoteItem
	for rows.Next() {
		var item NoteItem
		var parentID sql.NullString
		err := rows.Scan(&item.ID, &parentID, &item.Name, &item.Type, &item.IsFolder, &item.Content, &item.Position, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if parentID.Valid {
			item.ParentID = &parentID.String
		}
		items = append(items, item)
	}

	return items, nil
}

// CreateNoteItem creates a new note item
func (db *Database) CreateNoteItem(item *NoteItem) error {
	if !db.isUnlocked {
		return ErrDatabaseLocked
	}

	_, err := db.DB.Exec(`
		INSERT INTO note_items (id, parent_id, name, type, is_folder, content, position)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, item.ID, item.ParentID, item.Name, item.Type, item.IsFolder, item.Content, item.Position)

	return err
}

// UpdateNoteItem updates an existing note item
func (db *Database) UpdateNoteItem(item *NoteItem) error {
	if !db.isUnlocked {
		return ErrDatabaseLocked
	}

	_, err := db.DB.Exec(`
		UPDATE note_items
		SET name = ?, content = ?, position = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, item.Name, item.Content, item.Position, item.ParentID, item.ID)

	return err
}

// DeleteNoteItem deletes a note item and its children
func (db *Database) DeleteNoteItem(id string) error {
	if !db.isUnlocked {
		return ErrDatabaseLocked
	}

	// Delete all children recursively
	_, err := db.DB.Exec(`
		DELETE FROM note_items WHERE id = ? OR parent_id = ?
	`, id, id)

	return err
}

// GetNoteItem returns a single note item by ID
func (db *Database) GetNoteItem(id string) (*NoteItem, error) {
	if !db.isUnlocked {
		return nil, ErrDatabaseLocked
	}

	var item NoteItem
	var parentID sql.NullString
	err := db.DB.QueryRow(`
		SELECT id, parent_id, name, type, is_folder, content, position, created_at, updated_at
		FROM note_items
		WHERE id = ?
	`, id).Scan(&item.ID, &parentID, &item.Name, &item.Type, &item.IsFolder, &item.Content, &item.Position, &item.CreatedAt, &item.UpdatedAt)

	if err != nil {
		return nil, err
	}

	if parentID.Valid {
		item.ParentID = &parentID.String
	}

	return &item, nil
}
