package domain

import (
	"context"
	"errors"
	"time"
)

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ContentType string

const (
	ContentTypeMovie  ContentType = "pelicula"
	ContentTypeSeries ContentType = "serie"
)

type ReactionType string

const (
	ReactionLike    ReactionType = "like"
	ReactionDislike ReactionType = "dislike"
)

// ─── Errores de dominio ───────────────────────────────────────────────────────

var (
	ErrContentNotFound      = errors.New("contenido no encontrado")
	ErrContentDeleted       = errors.New("contenido ya eliminado")
	ErrInvalidGenre         = errors.New("genero no valido")
	ErrDuplicateContent     = errors.New("contenido duplicado")
	ErrInvalidSeriesContent = errors.New("el contenido no corresponde a una serie")
)

// ─── Entidades ────────────────────────────────────────────────────────────────

type Content struct {
	ID                 string
	Title              string
	Type               ContentType
	Synopsis           string
	TechnicalSheet     string
	ReleaseDate        *time.Time
	AgeRating          string
	DurationMinutes    *int
	Language           string
	PosterURL          string
	TrailerURL         string
	CreatedByAccountID string
	RecommendationPct  float64
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type Genre struct {
	ID          int64
	Name        string
	Description string
}

type CastMember struct {
	ID           int64
	ArtisticName string
	RealName     string
	Nationality  string
	Character    string
}

type Rating struct {
	ContentID string
	ProfileID string
	Reaction  ReactionType
}

type ContentDetail struct {
	Content
	TotalLikes    int
	TotalDislikes int
	Genres        []Genre
	Cast          []CastMember
}

type Season struct {
	ID          string
	ContentID   string
	Number      int
	Title       string
	Description string
	Episodes    []Episode
}

type Episode struct {
	ID              string
	SeasonID        string
	Number          int
	Title           string
	Synopsis        string
	DurationMinutes int
	VideoURL        string
}

type EpisodeBatch struct {
	SeasonNumber      int
	SeasonTitle       string
	SeasonDescription string
	Episodes          []Episode
}

// ─── Repositorio (puerto) ─────────────────────────────────────────────────────

type ContentRepository interface {
	List(ctx context.Context) ([]Content, error)
	Search(ctx context.Context, query string) ([]Content, error)
	FilterByGenres(ctx context.Context, genreIDs []int64) ([]Content, error)
	GetDetail(ctx context.Context, id string) (*ContentDetail, error)
	ExistsByTitleAndType(ctx context.Context, title string, contentType ContentType) (bool, error)
	Create(ctx context.Context, c *Content, genreIDs []int64) (string, error)
	Update(ctx context.Context, id string, c *Content) error
	Delete(ctx context.Context, id string) error
	Rate(ctx context.Context, r *Rating) (float64, error)
	ListSeasonsByContent(ctx context.Context, contentID string) ([]Season, error)
	CreateEpisodeBatch(ctx context.Context, contentID string, batch EpisodeBatch) ([]Episode, error)
}
