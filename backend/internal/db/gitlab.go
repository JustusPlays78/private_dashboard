package db

import (
	"database/sql"
	"fmt"
	"time"
)

// GitLabConfig represents stored GitLab configuration
type GitLabConfig struct {
	BaseURL string
	Token   string
}

// GitLabProject represents a cloned GitLab project
type GitLabProject struct {
	ProjectID         int
	Name              string
	PathWithNamespace string
	HTTPUrl           string
	DefaultBranch     string
	LocalPath         string
	ClonedAt          time.Time
	LastPull          *time.Time
}

// SaveGitLabConfig saves GitLab connection config to database
func (db *Database) SaveGitLabConfig(baseURL, token string) error {
	if !db.isUnlocked {
		return fmt.Errorf("database is locked")
	}

	encryptedToken, err := db.Encrypt(token)
	if err != nil {
		return fmt.Errorf("failed to encrypt token: %w", err)
	}

	query := `
	INSERT INTO gitlab_config (base_url, token, updated_at)
	VALUES (?, ?, CURRENT_TIMESTAMP)
	ON CONFLICT(id) DO UPDATE SET
		base_url = excluded.base_url,
		token = excluded.token,
		updated_at = CURRENT_TIMESTAMP
	`

	_, err = db.DB.Exec(query, baseURL, encryptedToken)
	if err != nil {
		return fmt.Errorf("failed to save gitlab config: %w", err)
	}

	return nil
}

// GetGitLabConfig retrieves GitLab configuration from database
func (db *Database) GetGitLabConfig() (*GitLabConfig, error) {
	if !db.isUnlocked {
		return nil, fmt.Errorf("database is locked")
	}

	var baseURL, encryptedToken string
	query := "SELECT base_url, token FROM gitlab_config WHERE id = 1"

	err := db.DB.QueryRow(query).Scan(&baseURL, &encryptedToken)
	if err == sql.ErrNoRows {
		return nil, nil // No config saved yet
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query gitlab config: %w", err)
	}

	token, err := db.Decrypt(encryptedToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt token: %w", err)
	}

	return &GitLabConfig{
		BaseURL: baseURL,
		Token:   token,
	}, nil
}

// SaveGitLabProject saves a cloned GitLab project to database
func (db *Database) SaveGitLabProject(project *GitLabProject) error {
	if !db.isUnlocked {
		return fmt.Errorf("database is locked")
	}

	query := `
	INSERT INTO gitlab_projects (project_id, name, path_with_namespace, http_url, default_branch, local_path, cloned_at)
	VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	ON CONFLICT(project_id) DO UPDATE SET
		name = excluded.name,
		path_with_namespace = excluded.path_with_namespace,
		http_url = excluded.http_url,
		default_branch = excluded.default_branch,
		local_path = excluded.local_path
	`

	_, err := db.DB.Exec(
		query,
		project.ProjectID,
		project.Name,
		project.PathWithNamespace,
		project.HTTPUrl,
		project.DefaultBranch,
		project.LocalPath,
	)
	if err != nil {
		return fmt.Errorf("failed to save gitlab project: %w", err)
	}

	return nil
}

// GetGitLabProjects retrieves all saved GitLab projects
func (db *Database) GetGitLabProjects() ([]GitLabProject, error) {
	if !db.isUnlocked {
		return nil, fmt.Errorf("database is locked")
	}

	query := `
	SELECT project_id, name, path_with_namespace, http_url, default_branch, local_path, cloned_at, last_pull
	FROM gitlab_projects
	ORDER BY cloned_at DESC
	`

	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query gitlab projects: %w", err)
	}
	defer rows.Close()

	var projects []GitLabProject
	for rows.Next() {
		var p GitLabProject
		var lastPull sql.NullTime

		err := rows.Scan(
			&p.ProjectID,
			&p.Name,
			&p.PathWithNamespace,
			&p.HTTPUrl,
			&p.DefaultBranch,
			&p.LocalPath,
			&p.ClonedAt,
			&lastPull,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan gitlab project: %w", err)
		}

		if lastPull.Valid {
			p.LastPull = &lastPull.Time
		}

		projects = append(projects, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating gitlab projects: %w", err)
	}

	return projects, nil
}

// UpdateGitLabProjectPullTime updates the last pull time for a project
func (db *Database) UpdateGitLabProjectPullTime(projectID int) error {
	if !db.isUnlocked {
		return fmt.Errorf("database is locked")
	}

	query := "UPDATE gitlab_projects SET last_pull = CURRENT_TIMESTAMP WHERE project_id = ?"
	_, err := db.DB.Exec(query, projectID)
	if err != nil {
		return fmt.Errorf("failed to update pull time: %w", err)
	}

	return nil
}

// DeleteGitLabProject removes a saved GitLab project from database
func (db *Database) DeleteGitLabProject(projectID int) error {
	if !db.isUnlocked {
		return fmt.Errorf("database is locked")
	}

	query := "DELETE FROM gitlab_projects WHERE project_id = ?"
	_, err := db.DB.Exec(query, projectID)
	if err != nil {
		return fmt.Errorf("failed to delete gitlab project: %w", err)
	}

	return nil
}

// GetGitLabProjectByID retrieves a specific saved project
func (db *Database) GetGitLabProjectByID(projectID int) (*GitLabProject, error) {
	if !db.isUnlocked {
		return nil, fmt.Errorf("database is locked")
	}

	var p GitLabProject
	var lastPull sql.NullTime

	query := `
	SELECT project_id, name, path_with_namespace, http_url, default_branch, local_path, cloned_at, last_pull
	FROM gitlab_projects
	WHERE project_id = ?
	`

	err := db.DB.QueryRow(query, projectID).Scan(
		&p.ProjectID,
		&p.Name,
		&p.PathWithNamespace,
		&p.HTTPUrl,
		&p.DefaultBranch,
		&p.LocalPath,
		&p.ClonedAt,
		&lastPull,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query gitlab project: %w", err)
	}

	if lastPull.Valid {
		p.LastPull = &lastPull.Time
	}

	return &p, nil
}
