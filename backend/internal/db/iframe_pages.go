package db

import (
	"database/sql"
)

type IFramePage struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	Category string `json:"category"` // e.g., "Monitoring", "Tools", etc.
	Icon     string `json:"icon"`     // lucide-react icon name
	Position int    `json:"position"`
}

func (db *Database) GetAllIFramePages() ([]IFramePage, error) {
	if !db.isUnlocked {
		return []IFramePage{}, nil
	}

	rows, err := db.DB.Query(`
		SELECT id, name, url, category, icon, position
		FROM iframe_pages
		ORDER BY category, position ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pages []IFramePage
	for rows.Next() {
		var page IFramePage
		if err := rows.Scan(&page.ID, &page.Name, &page.URL, &page.Category, &page.Icon, &page.Position); err != nil {
			return nil, err
		}
		pages = append(pages, page)
	}

	if pages == nil {
		pages = []IFramePage{}
	}

	return pages, nil
}

func (db *Database) GetIFramePage(id string) (*IFramePage, error) {
	if !db.isUnlocked {
		return nil, ErrDatabaseLocked
	}

	var page IFramePage
	err := db.DB.QueryRow(`
		SELECT id, name, url, category, icon, position
		FROM iframe_pages
		WHERE id = ?
	`, id).Scan(&page.ID, &page.Name, &page.URL, &page.Category, &page.Icon, &page.Position)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &page, nil
}

func (db *Database) CreateIFramePage(page *IFramePage) error {
	if !db.isUnlocked {
		return ErrDatabaseLocked
	}

	_, err := db.DB.Exec(`
		INSERT INTO iframe_pages (id, name, url, category, icon, position)
		VALUES (?, ?, ?, ?, ?, ?)
	`, page.ID, page.Name, page.URL, page.Category, page.Icon, page.Position)
	return err
}

func (db *Database) UpdateIFramePage(id string, name, url, category, icon string, position int) error {
	if !db.isUnlocked {
		return ErrDatabaseLocked
	}

	_, err := db.DB.Exec(`
		UPDATE iframe_pages
		SET name = ?, url = ?, category = ?, icon = ?, position = ?
		WHERE id = ?
	`, name, url, category, icon, position, id)
	return err
}

func (db *Database) DeleteIFramePage(id string) error {
	if !db.isUnlocked {
		return ErrDatabaseLocked
	}

	_, err := db.DB.Exec(`DELETE FROM iframe_pages WHERE id = ?`, id)
	return err
}
