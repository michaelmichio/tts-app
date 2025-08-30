package models

import "time"

type User struct {
	ID        string    `gorm:"primaryKey;type:uuid" json:"id"`
	Email     string    `gorm:"uniqueIndex;not null" json:"email"`
	Password  string    `gorm:"not null" json:"-"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Conversion struct {
	ID        string    `gorm:"primaryKey;type:uuid" json:"id"`
	UserID    string    `gorm:"index;not null"       json:"userId"`
	Text      string    `gorm:"type:text;not null"   json:"text"`
	VoiceURI  string    `gorm:"size:255;not null"    json:"voiceURI"`
	VoiceName string    `gorm:"size:255;not null"    json:"voiceName"`
	VoiceLang string    `gorm:"size:32;not null"     json:"voiceLang"`
	Rate      float32   `gorm:"not null"             json:"rate"`
	Pitch     float32   `gorm:"not null"             json:"pitch"`
	Volume    float32   `gorm:"not null"             json:"volume"`
	MediaID   *string   `gorm:"index;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"mediaId,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type MediaFile struct {
	ID        string    `gorm:"primaryKey;type:uuid" json:"id"`
	UserID    string    `gorm:"index;not null"       json:"userId"`
	Filename  string    `gorm:"not null"             json:"filename"`
	MIME      string    `gorm:"size:64;not null"     json:"mime"`
	Size      int64     `gorm:"not null"             json:"size"`
	Checksum  string    `gorm:"size:64"              json:"checksum"`
	CreatedAt time.Time `json:"createdAt"`
}
