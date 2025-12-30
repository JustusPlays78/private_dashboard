package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func main() {
	// Get user data directory
	userDataDir, err := os.UserConfigDir()
	if err != nil {
		log.Fatal(err)
	}

	dbPath := filepath.Join(userDataDir, "Dashboard", "dashboard.db")

	fmt.Printf("Opening database: %s\n", dbPath)

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Add zabbix_servers table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS zabbix_servers (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			position INTEGER NOT NULL
		);
	`)

	if err != nil {
		log.Fatal(err)
	}

	// Add iframe_pages table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS iframe_pages (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			category TEXT NOT NULL,
			icon TEXT NOT NULL,
			position INTEGER NOT NULL
		);
	`)

	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Migration completed successfully!")
	fmt.Println("zabbix_servers table created.")
	fmt.Println("iframe_pages table created.")
}
