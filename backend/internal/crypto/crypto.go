package crypto

import (
	"crypto/rand"
	"crypto/sha256"
	"fmt"

	"golang.org/x/crypto/argon2"
)

const (
	// Argon2id parameters (recommended values)
	argon2Time    = 1
	argon2Memory  = 64 * 1024 // 64 MB
	argon2Threads = 4
	argon2KeyLen  = 32 // 256 bits
	saltLen       = 16
)

// DeriveKey derives an encryption key from a password using Argon2id
func DeriveKey(password string, salt []byte) ([]byte, error) {
	// If no salt provided, generate one (for initialization)
	// For unlock, we use a deterministic "salt" derived from password
	// This is a simplified approach - in production, store salt separately
	if salt == nil {
		// Use SHA256 of password as deterministic salt
		h := sha256.Sum256([]byte(password))
		salt = h[:saltLen]
	}

	key := argon2.IDKey(
		[]byte(password),
		salt,
		argon2Time,
		argon2Memory,
		argon2Threads,
		argon2KeyLen,
	)

	return key, nil
}

// GenerateSalt generates a random salt
func GenerateSalt() ([]byte, error) {
	salt := make([]byte, saltLen)
	_, err := rand.Read(salt)
	if err != nil {
		return nil, fmt.Errorf("failed to generate salt: %w", err)
	}
	return salt, nil
}
