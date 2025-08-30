package handlers

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/michaelmichio/tts-backend/internal/middleware"
	"github.com/michaelmichio/tts-backend/internal/models"
)

type ConversionHandler struct {
	DB       *gorm.DB
	MediaDir string
}

func NewConversionHandler(db *gorm.DB, mediaDir string) *ConversionHandler {
	return &ConversionHandler{DB: db, MediaDir: mediaDir}
}

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
	grp.DELETE("/:id", h.Delete)
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

// @Summary      Delete conversion (and media if unused)
// @Tags         Conversions
// @Security     BearerAuth
// @Param        id   path  string  true  "Conversion ID"
// @Success      204
// @Failure      401  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Router       /api/conversions/{id} [delete]
func (h *ConversionHandler) Delete(c *gin.Context) {
	uid := c.GetString("userID")
	id := c.Param("id")

	// 1) Get the user's conversion
	var conv models.Conversion
	if err := h.DB.Where("id = ? AND user_id = ?", id, uid).First(&conv).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db_error"})
		return
	}

	// save mediaId before delete
	var mid *string = conv.MediaID

	// 2) Delete the conversion
	if err := h.DB.Delete(&conv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db_error"})
		return
	}

	// 3) If there is media, check whether another conversion is still being used.
	if mid != nil && *mid != "" {
		var cnt int64
		if err := h.DB.Model(&models.Conversion{}).
			Where("media_id = ?", *mid).
			Count(&cnt).Error; err == nil && cnt == 0 {

			// 3a) Retrieve user's media record (it could be null if it has been deleted manually)
			var mf models.MediaFile
			if err := h.DB.Where("id = ? AND user_id = ?", *mid, uid).First(&mf).Error; err == nil {
				// 3b) Delete file from disk (ignore error if file no longer exists)
				if h.MediaDir != "" && mf.Filename != "" {
					_ = os.Remove(filepath.Join(h.MediaDir, mf.Filename))
				}
				// 3c) Delete media records
				_ = h.DB.Delete(&mf).Error
			}
		}
	}

	c.Status(http.StatusNoContent)
}
