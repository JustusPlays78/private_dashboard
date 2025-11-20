package gitlab

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	token   string
	client  *http.Client
}

type Repository struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Path          string `json:"path"`
	PathWithNS    string `json:"path_with_namespace"`
	HTTPURL       string `json:"http_url_to_repo"`
	SSHURL        string `json:"ssh_url_to_repo"`
	WebURL        string `json:"web_url"`
	DefaultBranch string `json:"default_branch"`
	Description   string `json:"description"`
}

type Project struct {
	ID                int       `json:"id"`
	Name              string    `json:"name"`
	Description       string    `json:"description"`
	PathWithNamespace string    `json:"path_with_namespace"`
	HTTPURL           string    `json:"http_url_to_repo"`
	SSHURL            string    `json:"ssh_url_to_repo"`
	WebURL            string    `json:"web_url"`
	DefaultBranch     string    `json:"default_branch"`
	CreatedAt         time.Time `json:"created_at"`
	LastActivityAt    time.Time `json:"last_activity_at"`
}

type TreeNode struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
	Path string `json:"path"`
	Mode string `json:"mode"`
}

type Group struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Path        string `json:"path"`
	FullPath    string `json:"full_path"`
	Description string `json:"description"`
	WebURL      string `json:"web_url"`
}

func NewClient(baseURL, token string) *Client {
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		baseURL = "https://" + baseURL
	}

	return &Client{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		token:   token,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *Client) doRequest(method, path string) ([]byte, error) {
	url := c.baseURL + path

	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if c.token != "" {
		req.Header.Set("PRIVATE-TOKEN", c.token)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// ListProjects lists all accessible projects
func (c *Client) ListProjects() ([]Project, error) {
	body, err := c.doRequest("GET", "/api/v4/projects?membership=true&per_page=100")
	if err != nil {
		return nil, err
	}

	var projects []Project
	if err := json.Unmarshal(body, &projects); err != nil {
		return nil, fmt.Errorf("failed to parse projects: %w", err)
	}

	return projects, nil
}

// GetProject gets a specific project by ID
func (c *Client) GetProject(projectID int) (*Project, error) {
	body, err := c.doRequest("GET", fmt.Sprintf("/api/v4/projects/%d", projectID))
	if err != nil {
		return nil, err
	}

	var project Project
	if err := json.Unmarshal(body, &project); err != nil {
		return nil, fmt.Errorf("failed to parse project: %w", err)
	}

	return &project, nil
}

// GetRepositoryTree gets the file tree of a repository
func (c *Client) GetRepositoryTree(projectID int, path string, ref string) ([]TreeNode, error) {
	if ref == "" {
		ref = "main"
	}

	treePath := fmt.Sprintf("/api/v4/projects/%d/repository/tree?path=%s&ref=%s&recursive=false",
		projectID, path, ref)

	body, err := c.doRequest("GET", treePath)
	if err != nil {
		return nil, err
	}

	var tree []TreeNode
	if err := json.Unmarshal(body, &tree); err != nil {
		return nil, fmt.Errorf("failed to parse tree: %w", err)
	}

	return tree, nil
}

// GetFileContent gets the content of a file from the repository
func (c *Client) GetFileContent(projectID int, filePath string, ref string) (string, error) {
	if ref == "" {
		ref = "main"
	}

	// URL-encode the file path
	encodedPath := strings.ReplaceAll(filePath, "/", "%2F")

	contentPath := fmt.Sprintf("/api/v4/projects/%d/repository/files/%s?ref=%s",
		projectID, encodedPath, ref)

	body, err := c.doRequest("GET", contentPath)
	if err != nil {
		return "", err
	}

	var fileData struct {
		Content string `json:"content"`
	}

	if err := json.Unmarshal(body, &fileData); err != nil {
		return "", fmt.Errorf("failed to parse file content: %w", err)
	}

	return fileData.Content, nil
}

// SearchProjects searches for projects by name
func (c *Client) SearchProjects(searchTerm string) ([]Project, error) {
	body, err := c.doRequest("GET", fmt.Sprintf("/api/v4/projects?search=%s&per_page=50", searchTerm))
	if err != nil {
		return nil, err
	}

	var projects []Project
	if err := json.Unmarshal(body, &projects); err != nil {
		return nil, fmt.Errorf("failed to parse projects: %w", err)
	}

	return projects, nil
}

// GetProjectByID gets a project by its numeric ID
func (c *Client) GetProjectByID(projectID string) (*Project, error) {
	body, err := c.doRequest("GET", fmt.Sprintf("/api/v4/projects/%s", projectID))
	if err != nil {
		return nil, err
	}

	var project Project
	if err := json.Unmarshal(body, &project); err != nil {
		return nil, fmt.Errorf("failed to parse project: %w", err)
	}

	return &project, nil
}

// ListGroups lists all accessible groups
func (c *Client) ListGroups() ([]Group, error) {
	body, err := c.doRequest("GET", "/api/v4/groups?per_page=100")
	if err != nil {
		return nil, err
	}

	var groups []Group
	if err := json.Unmarshal(body, &groups); err != nil {
		return nil, fmt.Errorf("failed to parse groups: %w", err)
	}

	return groups, nil
}

// GetGroupProjects gets all projects in a specific group
func (c *Client) GetGroupProjects(groupID string) ([]Project, error) {
	body, err := c.doRequest("GET", fmt.Sprintf("/api/v4/groups/%s/projects?per_page=100", groupID))
	if err != nil {
		return nil, err
	}

	var projects []Project
	if err := json.Unmarshal(body, &projects); err != nil {
		return nil, fmt.Errorf("failed to parse projects: %w", err)
	}

	return projects, nil
}

// SearchGroups searches for groups by name
func (c *Client) SearchGroups(searchTerm string) ([]Group, error) {
	body, err := c.doRequest("GET", fmt.Sprintf("/api/v4/groups?search=%s&per_page=50", searchTerm))
	if err != nil {
		return nil, err
	}

	var groups []Group
	if err := json.Unmarshal(body, &groups); err != nil {
		return nil, fmt.Errorf("failed to parse groups: %w", err)
	}

	return groups, nil
}

// TestConnection tests the GitLab connection
func (c *Client) TestConnection() error {
	_, err := c.doRequest("GET", "/api/v4/user")
	return err
}

// Branch represents a Git branch
type Branch struct {
	Name      string `json:"name"`
	Merged    bool   `json:"merged"`
	Protected bool   `json:"protected"`
	Default   bool   `json:"default"`
}

// ListBranches lists all branches of a project
func (c *Client) ListBranches(projectID int) ([]Branch, error) {
	body, err := c.doRequest("GET", fmt.Sprintf("/api/v4/projects/%d/repository/branches?per_page=100", projectID))
	if err != nil {
		return nil, err
	}

	var branches []Branch
	if err := json.Unmarshal(body, &branches); err != nil {
		return nil, fmt.Errorf("failed to parse branches: %w", err)
	}

	return branches, nil
}
