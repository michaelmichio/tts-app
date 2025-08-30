package models

import "time"

type User struct {
	ID        string `gorm:"primaryKey;type:uuid"`
	Email     string `gorm:"uniqueIndex;not null"`
	Password  string `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Conversion struct {
	ID        string  `gorm:"primaryKey;type:uuid"`
	UserID    string  `gorm:"index;not null"`
	Text      string  `gorm:"type:text;not null"`
	VoiceURI  string  `gorm:"size:255;not null"`
	VoiceName string  `gorm:"size:255;not null"`
	VoiceLang string  `gorm:"size:32;not null"`
	Rate      float32 `gorm:"not null"`
	Pitch     float32 `gorm:"not null"`
	Volume    float32 `gorm:"not null"`
	MediaID   *string `gorm:"index"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type MediaFile struct {
	ID        string `gorm:"primaryKey;type:uuid"`
	UserID    string `gorm:"index;not null"`
	Filename  string `gorm:"not null"`
	MIME      string `gorm:"size:64;not null"`
	Size      int64  `gorm:"not null"`
	Checksum  string `gorm:"size:64"`
	CreatedAt time.Time
}
