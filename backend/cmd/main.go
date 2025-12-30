package main

import (
	"dashboard/internal/api"
	"dashboard/internal/db"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	database, err := db.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	// Set Gin to release mode in production
	// gin.SetMode(gin.ReleaseMode)

	// Initialize router
	router := gin.Default()

	// CORS middleware for Electron
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Setup routes
	api.SetupRoutes(router, database)

	// Start server
	log.Println("Starting Dashboard backend on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
