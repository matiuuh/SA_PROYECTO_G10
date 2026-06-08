package domain

import (
	"context"
	"errors"
	"time"
)

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PlaybackState string

const (
	PlaybackInProgress PlaybackState = "en_progreso"
	PlaybackFinished   PlaybackState = "finalizado"
)

// ─── Errores de dominio ───────────────────────────────────────────────────────

var ErrHistoryNotFound = errors.New("historial no encontrado")

// ─── Entidades ────────────────────────────────────────────────────────────────

type PlaybackHistory struct {
	ID              string
	ProfileID       string
	ContentID       string
	EpisodeID       string // vacio para peliculas
	State           PlaybackState
	ProgressSeconds int
	UpdatedAt       time.Time
}

// ─── Repositorio (puerto) ─────────────────────────────────────────────────────

type PlaybackRepository interface {
	Upsert(ctx context.Context, h *PlaybackHistory, totalDuration int) (PlaybackState, error)
	GetProgress(ctx context.Context, profileID, contentID, episodeID string) (*PlaybackHistory, error)
	GetHistory(ctx context.Context, profileID string, limit int) ([]PlaybackHistory, error)
}
