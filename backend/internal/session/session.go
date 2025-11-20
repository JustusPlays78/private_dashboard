package session

import (
	"sync"
	"time"
)

// Manager handles session timeout and activity tracking
type Manager struct {
	mu           sync.RWMutex
	lastActivity time.Time
	timeout      time.Duration
	isActive     bool
	onTimeout    func()
}

// NewManager creates a new session manager
func NewManager(timeout time.Duration, onTimeout func()) *Manager {
	return &Manager{
		timeout:   timeout,
		onTimeout: onTimeout,
		isActive:  false,
	}
}

// Start starts the session
func (m *Manager) Start() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.lastActivity = time.Now()
	m.isActive = true
}

// Stop stops the session
func (m *Manager) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.isActive = false
}

// UpdateActivity updates the last activity timestamp
func (m *Manager) UpdateActivity() {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.isActive {
		m.lastActivity = time.Now()
	}
}

// CheckTimeout checks if the session has timed out
func (m *Manager) CheckTimeout() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if !m.isActive {
		return false
	}

	elapsed := time.Since(m.lastActivity)
	return elapsed > m.timeout
}

// GetLastActivity returns the last activity time
func (m *Manager) GetLastActivity() time.Time {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.lastActivity
}

// IsActive returns whether the session is active
func (m *Manager) IsActive() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.isActive
}

// GetTimeUntilTimeout returns the duration until timeout
func (m *Manager) GetTimeUntilTimeout() time.Duration {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if !m.isActive {
		return 0
	}

	elapsed := time.Since(m.lastActivity)
	remaining := m.timeout - elapsed

	if remaining < 0 {
		return 0
	}

	return remaining
}

// StartWatcher starts the timeout watcher goroutine
func (m *Manager) StartWatcher() {
	go func() {
		ticker := time.NewTicker(10 * time.Second) // Check every 10 seconds
		defer ticker.Stop()

		for range ticker.C {
			if m.CheckTimeout() {
				m.Stop()
				if m.onTimeout != nil {
					m.onTimeout()
				}
			}
		}
	}()
}
