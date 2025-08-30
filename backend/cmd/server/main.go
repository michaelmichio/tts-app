package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/michaelmichio/tts-backend/internal/db"
	"github.com/michaelmichio/tts-backend/internal/handlers"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title           TTS Backend API
// @version         1.0
// @description     API for Text-To-Speech (Auth, Conversions, Media)

// @host      localhost:8080
// @BasePath  /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description input "Bearer <token>"
func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	conn := db.Connect()
	if err := db.AutoMigrate(conn); err != nil {
		log.Fatal("migrate error: ", err)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.MaxMultipartMemory = 20 << 20 // 20MB limit for uploading

	// r.Static("/", "./public")        // serve frontend
	// r.NoRoute(func(c *gin.Context) { // SPA fallback
	// 	c.File("./public/index.html")
	// })

	origins := os.Getenv("CORS_ORIGINS")
	allow := []string{"http://localhost:5173"} // default dev
	if origins != "" {
		allow = strings.Split(origins, ",")
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allow,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	// r.GET("/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	// 1) Serve YAML
	r.StaticFile("/openapi.yaml", "./docs/openapi.yaml")

	// 1.5) Redirect /docs ke index.html
	r.GET("/docs", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/docs/index.html")
	})

	// 2) Swagger UI di /docs/*any -> using spec /openapi.yaml
	r.GET("/docs/*any", ginSwagger.WrapHandler(
		swaggerFiles.Handler,
		ginSwagger.URL("/openapi.yaml"),
	))

	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	authH := handlers.NewAuthHandler(conn)
	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		auth.POST("/register", authH.Register)
		auth.POST("/login", authH.Login)

		convH := handlers.NewConversionHandler(conn, os.Getenv("MEDIA_DIR"))
		convH.Register(api)

		mediaH := handlers.NewMediaHandler(conn, os.Getenv("MEDIA_DIR"))
		mediaH.Register(api)
	}

	if err := r.Run(":" + port); err != nil {
		panic(err)
	}
}
