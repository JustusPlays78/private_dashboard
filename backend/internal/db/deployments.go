package db

import (
	"database/sql"
	"time"
)

type TerraformDeployment struct {
	ID             int        `json:"id"`
	ProjectID      int        `json:"project_id"`
	ProjectName    string     `json:"project_name"`
	Action         string     `json:"action"`
	StateName      string     `json:"state_name"`
	VarFile        string     `json:"var_file"`
	Status         string     `json:"status"`
	Output         string     `json:"output"`
	SummaryAdd     int        `json:"summary_add"`
	SummaryChange  int        `json:"summary_change"`
	SummaryDestroy int        `json:"summary_destroy"`
	Duration       float64    `json:"duration"`
	Error          string     `json:"error"`
	StartedAt      time.Time  `json:"started_at"`
	CompletedAt    *time.Time `json:"completed_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

// SaveDeployment saves a deployment record
func (db *Database) SaveDeployment(deployment *TerraformDeployment) (int64, error) {
	if !db.isUnlocked {
		return 0, ErrDatabaseLocked
	}

	result, err := db.DB.Exec(`
		INSERT INTO terraform_deployments (
			project_id, project_name, action, state_name, var_file, status,
			output, summary_add, summary_change, summary_destroy,
			duration, error, started_at, completed_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		deployment.ProjectID,
		deployment.ProjectName,
		deployment.Action,
		deployment.StateName,
		deployment.VarFile,
		deployment.Status,
		deployment.Output,
		deployment.SummaryAdd,
		deployment.SummaryChange,
		deployment.SummaryDestroy,
		deployment.Duration,
		deployment.Error,
		deployment.StartedAt,
		deployment.CompletedAt,
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetDeploymentsByProject retrieves all deployments for a specific project
func (db *Database) GetDeploymentsByProject(projectID int) ([]*TerraformDeployment, error) {
	if !db.isUnlocked {
		return nil, ErrDatabaseLocked
	}

	rows, err := db.DB.Query(`
		SELECT id, project_id, project_name, action, state_name, var_file, status,
			   output, summary_add, summary_change, summary_destroy,
			   duration, error, started_at, completed_at, created_at
		FROM terraform_deployments
		WHERE project_id = ?
		ORDER BY started_at DESC
	`, projectID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deployments []*TerraformDeployment
	for rows.Next() {
		var d TerraformDeployment
		var completedAt sql.NullTime

		err := rows.Scan(
			&d.ID, &d.ProjectID, &d.ProjectName, &d.Action, &d.StateName, &d.VarFile,
			&d.Status, &d.Output, &d.SummaryAdd, &d.SummaryChange, &d.SummaryDestroy,
			&d.Duration, &d.Error, &d.StartedAt, &completedAt, &d.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if completedAt.Valid {
			d.CompletedAt = &completedAt.Time
		}

		deployments = append(deployments, &d)
	}

	return deployments, rows.Err()
}

// GetAllDeployments retrieves all deployments
func (db *Database) GetAllDeployments(limit int) ([]*TerraformDeployment, error) {
	if !db.isUnlocked {
		return nil, ErrDatabaseLocked
	}

	query := `
		SELECT id, project_id, project_name, action, state_name, var_file, status,
			   output, summary_add, summary_change, summary_destroy,
			   duration, error, started_at, completed_at, created_at
		FROM terraform_deployments
		ORDER BY started_at DESC
	`

	if limit > 0 {
		query += " LIMIT ?"
	}

	var rows *sql.Rows
	var err error

	if limit > 0 {
		rows, err = db.DB.Query(query, limit)
	} else {
		rows, err = db.DB.Query(query)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deployments []*TerraformDeployment
	for rows.Next() {
		var d TerraformDeployment
		var completedAt sql.NullTime

		err := rows.Scan(
			&d.ID, &d.ProjectID, &d.ProjectName, &d.Action, &d.StateName, &d.VarFile,
			&d.Status, &d.Output, &d.SummaryAdd, &d.SummaryChange, &d.SummaryDestroy,
			&d.Duration, &d.Error, &d.StartedAt, &completedAt, &d.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if completedAt.Valid {
			d.CompletedAt = &completedAt.Time
		}

		deployments = append(deployments, &d)
	}

	return deployments, rows.Err()
}

// GetDeployment retrieves a single deployment by ID
func (db *Database) GetDeployment(id int) (*TerraformDeployment, error) {
	if !db.isUnlocked {
		return nil, ErrDatabaseLocked
	}

	var d TerraformDeployment
	var completedAt sql.NullTime

	err := db.DB.QueryRow(`
		SELECT id, project_id, project_name, action, state_name, var_file, status,
			   output, summary_add, summary_change, summary_destroy,
			   duration, error, started_at, completed_at, created_at
		FROM terraform_deployments
		WHERE id = ?
	`, id).Scan(
		&d.ID, &d.ProjectID, &d.ProjectName, &d.Action, &d.StateName, &d.VarFile,
		&d.Status, &d.Output, &d.SummaryAdd, &d.SummaryChange, &d.SummaryDestroy,
		&d.Duration, &d.Error, &d.StartedAt, &completedAt, &d.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if completedAt.Valid {
		d.CompletedAt = &completedAt.Time
	}

	return &d, nil
}
