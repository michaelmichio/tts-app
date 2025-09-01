package handlers

import (
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/michaelmichio/tts-backend/internal/models"
)

type AuthHandler struct{ DB *gorm.DB }

func NewAuthHandler(db *gorm.DB) *AuthHandler { return &AuthHandler{DB: db} }

func jwtTTL() time.Duration {
	if s := os.Getenv("JWT_TTL_HOURS"); s != "" {
		if h, err := strconv.Atoi(s); err == nil && h > 0 {
			return time.Duration(h) * time.Hour
		}
	}
	return 24 * time.Hour
}

func jwtSecret() []byte {
	sec := os.Getenv("JWT_SECRET")
	if sec == "" {
		sec = "please_change_me"
	}
	return []byte(sec)
}

func issueToken(userID string, email string, secret []byte) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"iat":   now.Unix(),
		"exp":   now.Add(jwtTTL()).Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(secret)
}

type registerReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type loginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// @Summary      Register
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        payload  body  registerReq  true  "Register payload"
// @Success      201  {object}  map[string]any
// @Failure      400  {object}  map[string]string
// @Failure      409  {object}  map[string]string
// @Router       /api/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var cnt int64
	h.DB.Model(&models.User{}).Where("email = ?", req.Email).Count(&cnt)
	if cnt > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "email_in_use"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "hash_error"})
		return
	}
	u := models.User{ID: uuid.NewString(), Email: req.Email, Password: string(hash)}
	if err := h.DB.Create(&u).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db_error"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": u.ID, "email": u.Email})
}

// @Summary      Login
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        payload  body  loginReq  true  "Login payload"
// @Success      200  {object}  map[string]any
// @Failure      400  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Router       /api/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var u models.User
	if err := h.DB.Where("email = ?", req.Email).First(&u).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_credentials"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_credentials"})
		return
	}

	// issue token with exp according to jwtTTL()
	tok, err := issueToken(u.ID, u.Email, jwtSecret())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "sign_token_error"})
		return
	}

	// (Optional) also send expiresAt so FE can notify the user
	expiresAt := time.Now().Add(jwtTTL()).UTC().Format(time.RFC3339)

	c.JSON(http.StatusOK, gin.H{
		"token":     tok,
		"user":      gin.H{"id": u.ID, "email": u.Email},
		"expiresAt": expiresAt,
	})
}
