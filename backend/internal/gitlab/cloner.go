package gitlab

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type Cloner struct {
	workDir string
}

func NewCloner(workDir string) *Cloner {
	return &Cloner{
		workDir: workDir,
	}
}

// CloneRepository clones a GitLab repository to local storage
func (cl *Cloner) CloneRepository(repoURL, projectName, token string) (string, error) {
	// Create work directory if not exists
	if err := os.MkdirAll(cl.workDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create work directory: %w", err)
	}

	// Sanitize project name for filesystem
	safeName := strings.ReplaceAll(projectName, "/", "_")
	safeName = strings.ReplaceAll(safeName, " ", "_")

	projectPath := filepath.Join(cl.workDir, safeName)

	// Check if already cloned
	if _, err := os.Stat(projectPath); err == nil {
		// Already exists, try to pull latest
		return projectPath, cl.PullLatest(projectPath)
	}

	// Inject token into URL if provided
	cloneURL := repoURL
	if token != "" {
		// Convert https://gitlab.com/user/repo.git to https://oauth2:TOKEN@gitlab.com/user/repo.git
		if strings.HasPrefix(repoURL, "https://") {
			parts := strings.SplitN(repoURL, "://", 2)
			if len(parts) == 2 {
				cloneURL = fmt.Sprintf("https://oauth2:%s@%s", token, parts[1])
			}
		}
	}

	// Clone repository
	cmd := exec.Command("git", "clone", cloneURL, projectPath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("failed to clone repository: %w", err)
	}

	return projectPath, nil
}

// PullLatest pulls the latest changes from remote
func (cl *Cloner) PullLatest(projectPath string) error {
	cmd := exec.Command("git", "-C", projectPath, "pull", "origin")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to pull latest changes: %w", err)
	}

	return nil
}

// GetCurrentBranch returns the current branch name
func (cl *Cloner) GetCurrentBranch(projectPath string) (string, error) {
	cmd := exec.Command("git", "-C", projectPath, "branch", "--show-current")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get current branch: %w", err)
	}

	return strings.TrimSpace(string(output)), nil
}

// GetLastCommit returns the last commit hash and message
func (cl *Cloner) GetLastCommit(projectPath string) (hash string, message string, err error) {
	// Get commit hash
	hashCmd := exec.Command("git", "-C", projectPath, "rev-parse", "HEAD")
	hashOutput, err := hashCmd.Output()
	if err != nil {
		return "", "", fmt.Errorf("failed to get commit hash: %w", err)
	}
	hash = strings.TrimSpace(string(hashOutput))

	// Get commit message
	msgCmd := exec.Command("git", "-C", projectPath, "log", "-1", "--pretty=%B")
	msgOutput, err := msgCmd.Output()
	if err != nil {
		return hash, "", fmt.Errorf("failed to get commit message: %w", err)
	}
	message = strings.TrimSpace(string(msgOutput))

	return hash, message, nil
}

// ListTerraformFiles finds all .tf files in the project
func (cl *Cloner) ListTerraformFiles(projectPath string) ([]string, error) {
	var tfFiles []string

	err := filepath.Walk(projectPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip .git directory
		if info.IsDir() && info.Name() == ".git" {
			return filepath.SkipDir
		}

		// Check for .tf files
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".tf") {
			relPath, _ := filepath.Rel(projectPath, path)
			tfFiles = append(tfFiles, relPath)
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to list terraform files: %w", err)
	}

	return tfFiles, nil
}

// CheckGitInstalled checks if git is installed
func CheckGitInstalled() error {
	cmd := exec.Command("git", "--version")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git is not installed or not in PATH: %w", err)
	}
	return nil
}

// ListBranches lists all branches in the repository
func (cl *Cloner) ListBranches(projectPath string) ([]string, error) {
	cmd := exec.Command("git", "-C", projectPath, "branch", "-a")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list branches: %w", err)
	}

	lines := strings.Split(string(output), "\n")
	var branches []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// Remove current branch indicator
		line = strings.TrimPrefix(line, "* ")
		// Remove remote prefix for remote branches
		if strings.HasPrefix(line, "remotes/origin/") {
			line = strings.TrimPrefix(line, "remotes/origin/")
			// Skip HEAD reference
			if strings.Contains(line, "HEAD ->") {
				continue
			}
		}
		// Avoid duplicates
		found := false
		for _, b := range branches {
			if b == line {
				found = true
				break
			}
		}
		if !found {
			branches = append(branches, line)
		}
	}
	return branches, nil
}

// SwitchBranch switches to a different branch
func (cl *Cloner) SwitchBranch(projectPath, branchName string) error {
	// Fetch latest from remote
	fetchCmd := exec.Command("git", "-C", projectPath, "fetch", "origin")
	if err := fetchCmd.Run(); err != nil {
		return fmt.Errorf("failed to fetch from remote: %w", err)
	}

	// Check if branch exists locally
	checkCmd := exec.Command("git", "-C", projectPath, "rev-parse", "--verify", branchName)
	if err := checkCmd.Run(); err != nil {
		// Branch doesn't exist locally, create tracking branch
		createCmd := exec.Command("git", "-C", projectPath, "checkout", "-b", branchName, "origin/"+branchName)
		if err := createCmd.Run(); err != nil {
			return fmt.Errorf("failed to create and checkout branch: %w", err)
		}
	} else {
		// Branch exists locally, just checkout
		checkoutCmd := exec.Command("git", "-C", projectPath, "checkout", branchName)
		if err := checkoutCmd.Run(); err != nil {
			return fmt.Errorf("failed to checkout branch: %w", err)
		}

		// Pull latest changes
		pullCmd := exec.Command("git", "-C", projectPath, "pull", "origin", branchName)
		if err := pullCmd.Run(); err != nil {
			return fmt.Errorf("failed to pull latest changes: %w", err)
		}
	}

	return nil
}
