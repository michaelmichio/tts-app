package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/michaelmichio/tts-backend/internal/middleware"
	"github.com/michaelmichio/tts-backend/internal/models"
)

type ConversionHandler struct{ DB *gorm.DB }

func NewConversionHandler(db *gorm.DB) *ConversionHandler { return &ConversionHandler{DB: db} }

type createConvReq struct {
	Text      string  `json:"text" binding:"required,min=1"`
	VoiceURI  string  `json:"voiceURI" binding:"required"`
	VoiceName string  `json:"voiceName" binding:"required"`
	VoiceLang string  `json:"voiceLang" binding:"required"`
	Rate      float32 `json:"rate" binding:"required"`
	Pitch     float32 `json:"pitch" binding:"required"`
	Volume    float32 `json:"volume" binding:"required"`
	MediaID   *string `json:"mediaId"`
}

func clamp(v, min, max float32) float32 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func (h *ConversionHandler) Register(r *gin.RouterGroup) {
	grp := r.Group("/conversions", middleware.AuthRequired())
	grp.POST("", h.Create)
	grp.GET("", h.List)
}

// @Summary      Create conversion
// @Tags         Conversions
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        payload  body  createConvReq  true  "Conversion"
// @Success      201  {object}  models.Conversion
// @Failure      400  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Router       /api/conversions [post]
func (h *ConversionHandler) Create(c *gin.Context) {
	var req createConvReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	uid := c.GetString("userID")
	req.Rate = clamp(req.Rate, 0.1, 10)
	req.Pitch = clamp(req.Pitch, 0.0, 2)
	req.Volume = clamp(req.Volume, 0.0, 1)

	item := models.Conversion{
		ID: uuid.NewString(), UserID: uid,
		Text: req.Text, VoiceURI: req.VoiceURI, VoiceName: req.VoiceName, VoiceLang: req.VoiceLang,
		Rate: req.Rate, Pitch: req.Pitch, Volume: req.Volume, MediaID: req.MediaID,
	}
	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db_error"})
		return
	}
	c.JSON(http.StatusCreated, item)
}

// @Summary      List conversions
// @Tags         Conversions
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]string
// @Router       /api/conversions [get]
func (h *ConversionHandler) List(c *gin.Context) {
	uid := c.GetString("userID")
	var items []models.Conversion
	if err := h.DB.Where("user_id = ?", uid).Order("created_at desc").Limit(50).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db_error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "nextCursor": nil})
}
