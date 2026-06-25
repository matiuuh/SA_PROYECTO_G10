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
var ErrTrailerNotFound = errors.New("trailer no encontrado")
var ErrEpisodeNotFound = errors.New("video de episodio no encontrado")

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

type CatalogContent struct {
	ID                string
	Title             string
	Type              string
	Synopsis          string
	Language          string
	PosterURL         string
	TrailerURL        string
	ReleaseDate       string
	RecommendationPct float64
	Genres            []string
}

type ProfileRating struct {
	ContentID string
	Reaction  string
}

type Recommendation struct {
	CatalogContent
	Score  float64
	Reason string
}

// ─── Repositorio (puerto) ─────────────────────────────────────────────────────

type PlaybackRepository interface {
	Upsert(ctx context.Context, h *PlaybackHistory, totalDuration int) (PlaybackState, error)
	GetProgress(ctx context.Context, profileID, contentID, episodeID string) (*PlaybackHistory, error)
	GetHistory(ctx context.Context, profileID string, limit int) ([]PlaybackHistory, error)
}

type TrailerRepository interface {
	GetSignedURL(ctx context.Context, contentID string) (string, error)
}

type EpisodeRepository interface {
	GetEpisodeSignedURL(ctx context.Context, objectName string) (string, error)
}

type CatalogRecommendationRepository interface {
	ListContent(ctx context.Context) ([]CatalogContent, error)
	GetContentDetail(ctx context.Context, contentID string) (*CatalogContent, error)
	ListRatingsByProfile(ctx context.Context, profileID string) ([]ProfileRating, error)
}
