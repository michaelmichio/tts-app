package handlers

import (
	"crypto/sha256"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/michaelmichio/tts-backend/internal/middleware"
	"github.com/michaelmichio/tts-backend/internal/models"
)

type MediaHandler struct {
	DB       *gorm.DB
	MediaDir string
}

func NewMediaHandler(db *gorm.DB, mediaDir string) *MediaHandler {
	return &MediaHandler{DB: db, MediaDir: mediaDir}
}

func (h *MediaHandler) Register(r *gin.RouterGroup) {
	grp := r.Group("/media", middleware.AuthRequired())
	grp.POST("", h.Upload)      // multipart form: file=@xxx.mp3
	grp.GET("/:id", h.Download) // return attachment
}

// @Summary      Upload MP3
// @Tags         Media
// @Security     BearerAuth
// @Accept       mpfd
// @Produce      json
// @Param        file  formData  file  true  "MP3 file"
// @Success      201  {object}  map[string]string
// @Failure      400  {object}  map[string]string
// @Failure      401  {object}  map[string]string
// @Router       /api/media [post]
func (h *MediaHandler) Upload(c *gin.Context) {
	uid := c.GetString("userID")

	// Gin default 32MB; set limits if necessary:
	// c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 20<<20) // 20MB

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file_required"})
		return
	}
	// size limit 20MB
	if file.Size > 20*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file_too_large"})
		return
	}
	// must .mp3
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".mp3") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only_mp3"})
		return
	}

	// read content for checksum, then save
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "open_error"})
		return
	}
	defer src.Close()

	hasher := sha256.New()
	buf := make([]byte, 32*1024)
	var total int64
	for {
		n, rerr := src.Read(buf)
		if n > 0 {
			hasher.Write(buf[:n])
			total += int64(n)
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "read_error"})
			return
		}
	}
	sum := fmt.Sprintf("%x", hasher.Sum(nil))

	id := uuid.NewString()
	filename := id + ".mp3"
	if err := os.MkdirAll(h.MediaDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "mkdir_error"})
		return
	}
	// reopen to copy to disk
	src2, _ := file.Open()
	defer src2.Close()

	dstPath := filepath.Join(h.MediaDir, filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "write_error"})
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, src2); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "copy_error"})
		return
	}

	m := models.MediaFile{
		ID: id, UserID: uid, Filename: filename,
		MIME: "audio/mpeg", Size: file.Size, Checksum: sum,
	}
	if err := h.DB.Create(&m).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db_error"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "filename": filename})
}

// @Summary      Download MP3
// @Tags         Media
// @Security     BearerAuth
// @Param        id   path  string  true  "Media ID"
// @Success      200
// @Failure      401  {object}  map[string]string
// @Failure      404  {object}  map[string]string
// @Router       /api/media/{id} [get]
func (h *MediaHandler) Download(c *gin.Context) {
	uid := c.GetString("userID")
	id := c.Param("id")

	var m models.MediaFile
	if err := h.DB.Where("id = ? AND user_id = ?", id, uid).First(&m).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found"})
		return
	}
	path := filepath.Join(h.MediaDir, m.Filename)
	c.FileAttachment(path, m.Filename)
}
