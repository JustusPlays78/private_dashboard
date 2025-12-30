package db

import (
	"database/sql"
)

type ZabbixServer struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	Position int    `json:"position"`
}

func (db *Database) InitZabbixTable() error {
	_, err := db.DB.Exec(`
		CREATE TABLE IF NOT EXISTS zabbix_servers (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			position INTEGER NOT NULL
		)
	`)
	return err
}

func (db *Database) GetAllZabbixServers() ([]ZabbixServer, error) {
	if !db.isUnlocked {
		return []ZabbixServer{}, nil
	}

	rows, err := db.DB.Query(`
		SELECT id, name, url, position
		FROM zabbix_servers
		ORDER BY position ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var servers []ZabbixServer
	for rows.Next() {
		var server ZabbixServer
		if err := rows.Scan(&server.ID, &server.Name, &server.URL, &server.Position); err != nil {
			return nil, err
		}
		servers = append(servers, server)
	}

	if servers == nil {
		servers = []ZabbixServer{}
	}

	return servers, nil
}

func (db *Database) GetZabbixServer(id string) (*ZabbixServer, error) {
	if !db.isUnlocked {
		return nil, ErrDatabaseLocked
	}

	var server ZabbixServer
	err := db.DB.QueryRow(`
		SELECT id, name, url, position
		FROM zabbix_servers
		WHERE id = ?
	`, id).Scan(&server.ID, &server.Name, &server.URL, &server.Position)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &server, nil
}

func (db *Database) CreateZabbixServer(server *ZabbixServer) error {
	if !db.isUnlocked {
		return ErrDatabaseLocked
	}

	_, err := db.DB.Exec(`
		INSERT INTO zabbix_servers (id, name, url, position)
		VALUES (?, ?, ?, ?)
	`, server.ID, server.Name, server.URL, server.Position)
	return err
}

func (db *Database) UpdateZabbixServer(id string, name, url string, position int) error {
	if !db.isUnlocked {
		return ErrDatabaseLocked
	}

	_, err := db.DB.Exec(`
		UPDATE zabbix_servers
		SET name = ?, url = ?, position = ?
		WHERE id = ?
	`, name, url, position, id)
	return err
}

func (db *Database) DeleteZabbixServer(id string) error {
	if !db.isUnlocked {
		return ErrDatabaseLocked
	}

	_, err := db.DB.Exec(`DELETE FROM zabbix_servers WHERE id = ?`, id)
	return err
}
