package application

import (
	"context"

	"quetzaltv/services/catalogo/internal/domain"
)

// CatalogoService orquesta los casos de uso del dominio de catalogo.
type CatalogoService struct {
	repo domain.ContentRepository
}

func New(repo domain.ContentRepository) *CatalogoService {
	return &CatalogoService{repo: repo}
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

func (s *CatalogoService) List(ctx context.Context) ([]domain.Content, error) {
	return s.repo.List(ctx)
}

func (s *CatalogoService) Search(ctx context.Context, query string) ([]domain.Content, error) {
	if query == "" {
		return s.repo.List(ctx)
	}
	return s.repo.Search(ctx, query)
}

func (s *CatalogoService) FilterByGenres(ctx context.Context, genreIDs []int64) ([]domain.Content, error) {
	if len(genreIDs) == 0 {
		return s.repo.List(ctx)
	}
	return s.repo.FilterByGenres(ctx, genreIDs)
}

func (s *CatalogoService) GetDetail(ctx context.Context, id string) (*domain.ContentDetail, error) {
	return s.repo.GetDetail(ctx, id)
}

// ─── Escritura ────────────────────────────────────────────────────────────────

func (s *CatalogoService) Create(ctx context.Context, c *domain.Content, genreIDs []int64) (string, error) {
	return s.repo.Create(ctx, c, genreIDs)
}

func (s *CatalogoService) Update(ctx context.Context, id string, c *domain.Content) error {
	return s.repo.Update(ctx, id, c)
}

func (s *CatalogoService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// ─── Calificacion ─────────────────────────────────────────────────────────────

func (s *CatalogoService) Rate(ctx context.Context, r *domain.Rating) (float64, error) {
	return s.repo.Rate(ctx, r)
}
