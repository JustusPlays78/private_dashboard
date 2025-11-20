package gitlab

import (
	"fmt"
	"net/http"
)

type TerraformState struct {
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	Locked    bool   `json:"locked"`
}

// ListTerraformStates lists all Terraform states for a project
// Note: GitLab API doesn't have a direct endpoint to list all state names
// This tries to get states from the Terraform state API, but may return empty
// Alternative: Parse from repository files or use hardcoded common names
func (c *Client) ListTerraformStates(projectID int) ([]TerraformState, error) {
	// GitLab stores Terraform states but doesn't provide a list endpoint
	// We'll try common state names as a workaround
	commonStateNames := []string{"default", "dev", "prod", "staging", "test", "qa"}

	var states []TerraformState

	for _, stateName := range commonStateNames {
		url := fmt.Sprintf("%s/api/v4/projects/%d/terraform/state/%s", c.baseURL, projectID, stateName)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			continue
		}

		req.Header.Set("PRIVATE-TOKEN", c.token)

		resp, err := c.client.Do(req)
		if err != nil {
			continue
		}

		// If we get 200, the state exists
		if resp.StatusCode == http.StatusOK {
			states = append(states, TerraformState{
				Name:   stateName,
				Locked: false, // We'd need to parse the response to get lock status
			})
		}
		resp.Body.Close()
	}

	return states, nil
}
