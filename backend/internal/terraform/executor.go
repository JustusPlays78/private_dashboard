package terraform

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// TerraformConfig holds configuration for Terraform execution
type TerraformConfig struct {
	ProjectPath        string
	GitLabBaseURL      string
	GitLabToken        string
	GitLabUser         string
	RepositoryID       string
	StateName          string
	VarFile            string
	AWSAccessKeyID     string
	AWSSecretAccessKey string
	AWSSessionToken    string
}

// ExecutionResult holds the result of a Terraform execution
type ExecutionResult struct {
	Command   string
	Output    string
	Error     string
	ExitCode  int
	StartedAt time.Time
	Duration  time.Duration
}

// LogCallback is called with each line of output
type LogCallback func(line string)

// CheckInstalled checks if Terraform CLI is installed
func CheckInstalled() bool {
	cmd := exec.Command("terraform", "version")
	return cmd.Run() == nil
}

// GetVersion returns the installed Terraform version
func GetVersion() (string, error) {
	cmd := exec.Command("terraform", "version", "-json")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(output), nil
}

// Init initializes Terraform with GitLab HTTP backend
func Init(config *TerraformConfig, logCallback LogCallback) (*ExecutionResult, error) {
	startTime := time.Now()
	result := &ExecutionResult{
		Command:   "terraform init",
		StartedAt: startTime,
	}

	// Build backend config URLs
	stateURL := fmt.Sprintf("%s/api/v4/projects/%s/terraform/state/%s",
		config.GitLabBaseURL, config.RepositoryID, config.StateName)
	lockURL := fmt.Sprintf("%s/lock", stateURL)

	// Build arguments
	args := []string{
		"init",
		"-migrate-state",
		fmt.Sprintf("-backend-config=address=%s", stateURL),
		fmt.Sprintf("-backend-config=lock_address=%s", lockURL),
		fmt.Sprintf("-backend-config=unlock_address=%s", lockURL),
		fmt.Sprintf("-backend-config=username=%s", config.GitLabUser),
		fmt.Sprintf("-backend-config=password=%s", config.GitLabToken),
		"-backend-config=lock_method=POST",
		"-backend-config=unlock_method=DELETE",
		"-backend-config=retry_wait_min=5",
	}

	result.Command = fmt.Sprintf("terraform %s", strings.Join(args, " "))

	// Execute command
	cmd := exec.Command("terraform", args...)
	cmd.Dir = config.ProjectPath
	env := append(os.Environ(), "TF_INPUT=false")
	if config.AWSAccessKeyID != "" {
		env = append(env, "AWS_ACCESS_KEY_ID="+config.AWSAccessKeyID)
		if logCallback != nil {
			logCallback(fmt.Sprintf("[DEBUG] Setting AWS_ACCESS_KEY_ID: %s...", config.AWSAccessKeyID[:min(20, len(config.AWSAccessKeyID))]))
		}
	}
	if config.AWSSecretAccessKey != "" {
		env = append(env, "AWS_SECRET_ACCESS_KEY="+config.AWSSecretAccessKey)
		if logCallback != nil {
			logCallback(fmt.Sprintf("[DEBUG] Setting AWS_SECRET_ACCESS_KEY: %s...", config.AWSSecretAccessKey[:min(10, len(config.AWSSecretAccessKey))]))
		}
	}
	if config.AWSSessionToken != "" {
		env = append(env, "AWS_SESSION_TOKEN="+config.AWSSessionToken)
		if logCallback != nil {
			logCallback(fmt.Sprintf("[DEBUG] Setting AWS_SESSION_TOKEN: %s...", config.AWSSessionToken[:min(30, len(config.AWSSessionToken))]))
		}
	}
	cmd.Env = env

	// Capture output
	output, err := executeWithLogs(cmd, logCallback)
	result.Output = output
	result.Duration = time.Since(startTime)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			result.Error = err.Error()
		} else {
			result.Error = err.Error()
		}
		return result, err
	}

	result.ExitCode = 0
	return result, nil
}

// Plan runs terraform plan
func Plan(config *TerraformConfig, logCallback LogCallback) (*ExecutionResult, error) {
	startTime := time.Now()
	result := &ExecutionResult{
		Command:   "terraform plan",
		StartedAt: startTime,
	}

	args := []string{"plan"}

	if config.VarFile != "" {
		args = append(args, fmt.Sprintf("-var-file=%s", config.VarFile))
	}

	result.Command = fmt.Sprintf("terraform %s", strings.Join(args, " "))

	cmd := exec.Command("terraform", args...)
	cmd.Dir = config.ProjectPath
	env := append(os.Environ(), "TF_INPUT=false")
	if config.AWSAccessKeyID != "" {
		env = append(env, "AWS_ACCESS_KEY_ID="+config.AWSAccessKeyID)
	}
	if config.AWSSecretAccessKey != "" {
		env = append(env, "AWS_SECRET_ACCESS_KEY="+config.AWSSecretAccessKey)
	}
	if config.AWSSessionToken != "" {
		env = append(env, "AWS_SESSION_TOKEN="+config.AWSSessionToken)
	}
	cmd.Env = env

	output, err := executeWithLogs(cmd, logCallback)
	result.Output = output
	result.Duration = time.Since(startTime)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			result.Error = err.Error()
		} else {
			result.Error = err.Error()
		}
		return result, err
	}

	result.ExitCode = 0
	return result, nil
}

// Apply runs terraform apply
func Apply(config *TerraformConfig, autoApprove bool, logCallback LogCallback) (*ExecutionResult, error) {
	startTime := time.Now()
	result := &ExecutionResult{
		Command:   "terraform apply",
		StartedAt: startTime,
	}

	args := []string{"apply"}

	if autoApprove {
		args = append(args, "-auto-approve")
	}

	if config.VarFile != "" {
		args = append(args, fmt.Sprintf("-var-file=%s", config.VarFile))
	}

	result.Command = fmt.Sprintf("terraform %s", strings.Join(args, " "))

	cmd := exec.Command("terraform", args...)
	cmd.Dir = config.ProjectPath
	env := append(os.Environ(), "TF_INPUT=false")
	if config.AWSAccessKeyID != "" {
		env = append(env, "AWS_ACCESS_KEY_ID="+config.AWSAccessKeyID)
	}
	if config.AWSSecretAccessKey != "" {
		env = append(env, "AWS_SECRET_ACCESS_KEY="+config.AWSSecretAccessKey)
	}
	if config.AWSSessionToken != "" {
		env = append(env, "AWS_SESSION_TOKEN="+config.AWSSessionToken)
	}
	cmd.Env = env

	output, err := executeWithLogs(cmd, logCallback)
	result.Output = output
	result.Duration = time.Since(startTime)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			result.Error = err.Error()
		} else {
			result.Error = err.Error()
		}
		return result, err
	}

	result.ExitCode = 0
	return result, nil
}

// Destroy runs terraform destroy
func Destroy(config *TerraformConfig, autoApprove bool, logCallback LogCallback) (*ExecutionResult, error) {
	startTime := time.Now()
	result := &ExecutionResult{
		Command:   "terraform destroy",
		StartedAt: startTime,
	}

	args := []string{"destroy"}

	if autoApprove {
		args = append(args, "-auto-approve")
	}

	if config.VarFile != "" {
		args = append(args, fmt.Sprintf("-var-file=%s", config.VarFile))
	}

	result.Command = fmt.Sprintf("terraform %s", strings.Join(args, " "))

	cmd := exec.Command("terraform", args...)
	cmd.Dir = config.ProjectPath
	env := append(os.Environ(), "TF_INPUT=false")
	if config.AWSAccessKeyID != "" {
		env = append(env, "AWS_ACCESS_KEY_ID="+config.AWSAccessKeyID)
	}
	if config.AWSSecretAccessKey != "" {
		env = append(env, "AWS_SECRET_ACCESS_KEY="+config.AWSSecretAccessKey)
	}
	if config.AWSSessionToken != "" {
		env = append(env, "AWS_SESSION_TOKEN="+config.AWSSessionToken)
	}
	cmd.Env = env

	output, err := executeWithLogs(cmd, logCallback)
	result.Output = output
	result.Duration = time.Since(startTime)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			result.Error = err.Error()
		} else {
			result.Error = err.Error()
		}
		return result, err
	}

	result.ExitCode = 0
	return result, nil
}

// ShowState shows the current Terraform state
func ShowState(projectPath string, logCallback LogCallback) (*ExecutionResult, error) {
	startTime := time.Now()
	result := &ExecutionResult{
		Command:   "terraform show",
		StartedAt: startTime,
	}

	cmd := exec.Command("terraform", "show", "-json")
	cmd.Dir = projectPath
	cmd.Env = append(os.Environ(), "TF_INPUT=false")

	output, err := executeWithLogs(cmd, logCallback)
	result.Output = output
	result.Duration = time.Since(startTime)

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			result.Error = err.Error()
		} else {
			result.Error = err.Error()
		}
		return result, err
	}

	result.ExitCode = 0
	return result, nil
}

// ListWorkspaces lists all Terraform workspaces
func ListWorkspaces(projectPath string) ([]string, error) {
	cmd := exec.Command("terraform", "workspace", "list")
	cmd.Dir = projectPath

	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var workspaces []string
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		line = strings.TrimPrefix(line, "*")
		line = strings.TrimSpace(line)
		if line != "" {
			workspaces = append(workspaces, line)
		}
	}

	return workspaces, nil
}

// FindVarFiles searches for .tfvars files in the project
func FindVarFiles(projectPath string) ([]string, error) {
	var varFiles []string

	err := filepath.Walk(projectPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), ".tfvars") {
			relPath, _ := filepath.Rel(projectPath, path)
			varFiles = append(varFiles, relPath)
		}
		return nil
	})

	return varFiles, err
}

// executeWithLogs executes a command and streams output to callback
func executeWithLogs(cmd *exec.Cmd, logCallback LogCallback) (string, error) {
	var outputBuffer bytes.Buffer

	// Create pipes for stdout and stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", err
	}

	// Start command
	if err := cmd.Start(); err != nil {
		return "", err
	}

	// Read stdout
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			outputBuffer.WriteString(line + "\n")
			if logCallback != nil {
				logCallback(line)
			}
		}
	}()

	// Read stderr
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			outputBuffer.WriteString(line + "\n")
			if logCallback != nil {
				logCallback(line)
			}
		}
	}()

	// Wait for command to finish
	err = cmd.Wait()
	return outputBuffer.String(), err
}
