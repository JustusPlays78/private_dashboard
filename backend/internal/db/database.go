package db

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"terraform-dashboard/internal/crypto"

	_ "modernc.org/sqlite"
)

type Database struct {
	DB            *sql.DB
	isInitialized bool
	isUnlocked    bool
	encryptionKey []byte
}

var dbInstance *Database

var ErrDatabaseLocked = errors.New("database is locked")

// InitDB initializes the database connection
func InitDB() (*Database, error) {
	if dbInstance != nil {
		return dbInstance, nil
	}

	// Get user data directory
	userDataDir, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get user config dir: %w", err)
	}

	// Create app data directory
	appDataDir := filepath.Join(userDataDir, "TerraformDashboard")
	if err := os.MkdirAll(appDataDir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create app data dir: %w", err)
	}

	dbPath := filepath.Join(appDataDir, "terraform.db")

	// Check if database exists
	_, err = os.Stat(dbPath)
	isInitialized := err == nil

	dbInstance = &Database{
		isInitialized: isInitialized,
		isUnlocked:    false,
	}

	log.Printf("Database path: %s", dbPath)
	log.Printf("Database initialized: %v", isInitialized)

	return dbInstance, nil
}

// Initialize creates a new encrypted database with the master password
func (db *Database) Initialize(masterPassword string) error {
	if db.isInitialized {
		return fmt.Errorf("database already initialized")
	}

	// Derive encryption key from password
	encryptionKey, err := crypto.DeriveKey(masterPassword, nil)
	if err != nil {
		return fmt.Errorf("failed to derive key: %w", err)
	}

	// Get database path
	userDataDir, _ := os.UserConfigDir()
	appDataDir := filepath.Join(userDataDir, "TerraformDashboard")
	dbPath := filepath.Join(appDataDir, "terraform.db")

	// Open regular SQLite database
	sqlDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		sqlDB.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	db.DB = sqlDB
	db.encryptionKey = encryptionKey
	db.isUnlocked = true
	db.isInitialized = true

	// Create tables
	if err := db.createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	// Store password verification hash
	if err := db.storePasswordHash(masterPassword); err != nil {
		return fmt.Errorf("failed to store password hash: %w", err)
	}

	log.Println("Database initialized successfully")
	return nil
}

// Unlock opens an existing encrypted database with the master password
func (db *Database) Unlock(masterPassword string) error {
	if !db.isInitialized {
		return fmt.Errorf("database not initialized")
	}

	if db.isUnlocked {
		return fmt.Errorf("database already unlocked")
	}

	// Get database path
	userDataDir, _ := os.UserConfigDir()
	appDataDir := filepath.Join(userDataDir, "TerraformDashboard")
	dbPath := filepath.Join(appDataDir, "terraform.db")

	// Open regular SQLite database
	sqlDB, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		sqlDB.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	db.DB = sqlDB

	// Verify password by checking stored hash
	if !db.verifyPassword(masterPassword) {
		sqlDB.Close()
		db.DB = nil
		return fmt.Errorf("invalid password")
	}

	// Derive encryption key from password
	encryptionKey, err := crypto.DeriveKey(masterPassword, nil)
	if err != nil {
		return fmt.Errorf("failed to derive key: %w", err)
	}

	db.encryptionKey = encryptionKey
	db.isUnlocked = true

	// Run migrations to ensure all tables exist
	if err := db.runMigrations(); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database unlocked successfully")
	return nil
}

// createTables creates the database schema
func (db *Database) createTables() error {
	schema := `
	CREATE TABLE IF NOT EXISTS terraform_projects (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT,
		aws_region TEXT,
		aws_profile TEXT,
		terraform_config TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS deployments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		action TEXT NOT NULL,
		status TEXT NOT NULL,
		output TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		completed_at DATETIME,
		FOREIGN KEY (project_id) REFERENCES terraform_projects(id)
	);

	CREATE TABLE IF NOT EXISTS aws_resources (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		resource_type TEXT NOT NULL,
		resource_id TEXT NOT NULL,
		resource_name TEXT,
		status TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES terraform_projects(id)
	);

	CREATE TABLE IF NOT EXISTS secrets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		key TEXT UNIQUE NOT NULL,
		value TEXT NOT NULL,
		description TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS auth (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS gitlab_config (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		base_url TEXT NOT NULL,
		token TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS gitlab_projects (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL UNIQUE,
		name TEXT NOT NULL,
		path_with_namespace TEXT NOT NULL,
		http_url TEXT NOT NULL,
		default_branch TEXT,
		local_path TEXT NOT NULL,
		cloned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		last_pull DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS terraform_deployments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL,
		project_name TEXT NOT NULL,
		action TEXT NOT NULL,
		state_name TEXT NOT NULL,
		var_file TEXT,
		status TEXT NOT NULL,
		output TEXT,
		summary_add INTEGER DEFAULT 0,
		summary_change INTEGER DEFAULT 0,
		summary_destroy INTEGER DEFAULT 0,
		duration REAL,
		error TEXT,
		started_at DATETIME NOT NULL,
		completed_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err := db.DB.Exec(schema)
	return err
}

// storePasswordHash stores the hashed password for verification
func (db *Database) storePasswordHash(password string) error {
	hash, err := crypto.DeriveKey(password, nil)
	if err != nil {
		return err
	}

	encoded := base64.StdEncoding.EncodeToString(hash)
	_, err = db.DB.Exec("INSERT INTO auth (id, password_hash) VALUES (1, ?)", encoded)
	return err
}

// verifyPassword checks if the provided password matches the stored hash
func (db *Database) verifyPassword(password string) bool {
	var storedHash string
	err := db.DB.QueryRow("SELECT password_hash FROM auth WHERE id = 1").Scan(&storedHash)
	if err != nil {
		return false
	}

	hash, err := crypto.DeriveKey(password, nil)
	if err != nil {
		return false
	}

	encoded := base64.StdEncoding.EncodeToString(hash)
	return encoded == storedHash
}

// Encrypt encrypts data using AES-GCM
func (db *Database) Encrypt(plaintext string) (string, error) {
	if !db.isUnlocked {
		return "", fmt.Errorf("database is locked")
	}

	block, err := aes.NewCipher(db.encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts data using AES-GCM
func (db *Database) Decrypt(ciphertext string) (string, error) {
	if !db.isUnlocked {
		return "", fmt.Errorf("database is locked")
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(db.encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, encryptedData := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, encryptedData, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// IsInitialized returns whether the database has been initialized
func (db *Database) IsInitialized() bool {
	return db.isInitialized
}

// IsUnlocked returns whether the database is currently unlocked
func (db *Database) IsUnlocked() bool {
	return db.isUnlocked
}

// Lock locks the database (clears encryption key and marks as locked)
func (db *Database) Lock() {
	db.isUnlocked = false
	db.encryptionKey = nil
	log.Println("Database locked due to inactivity")
}

// Close closes the database connection
func (db *Database) Close() error {
	if db.DB != nil {
		return db.DB.Close()
	}
	return nil
}

// runMigrations ensures all required tables exist, creating them if necessary
func (db *Database) runMigrations() error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS gitlab_config (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			base_url TEXT NOT NULL,
			token TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS gitlab_projects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL UNIQUE,
			name TEXT NOT NULL,
			path_with_namespace TEXT NOT NULL,
			http_url TEXT NOT NULL,
			default_branch TEXT,
			local_path TEXT NOT NULL,
			cloned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			last_pull DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS terraform_deployments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL,
			project_name TEXT NOT NULL,
			action TEXT NOT NULL,
			state_name TEXT NOT NULL,
			var_file TEXT,
			status TEXT NOT NULL,
			output TEXT,
			summary_add INTEGER DEFAULT 0,
			summary_change INTEGER DEFAULT 0,
			summary_destroy INTEGER DEFAULT 0,
			duration REAL,
			error TEXT,
			started_at DATETIME NOT NULL,
			completed_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, migration := range migrations {
		if _, err := db.DB.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}
