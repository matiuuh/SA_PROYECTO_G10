package application

import (
	"context"

	"quetzaltv/services/streaming/internal/domain"
)

// StreamingService orquesta los casos de uso del dominio de streaming.
type StreamingService struct {
	repo        domain.PlaybackRepository
	trailerRepo domain.TrailerRepository
	episodeRepo domain.EpisodeRepository
	catalogRepo domain.CatalogRecommendationRepository
}

func New(
	repo domain.PlaybackRepository,
	trailerRepo domain.TrailerRepository,
	episodeRepo domain.EpisodeRepository,
	catalogRepos ...domain.CatalogRecommendationRepository,
) *StreamingService {
	var catalogRepo domain.CatalogRecommendationRepository
	if len(catalogRepos) > 0 {
		catalogRepo = catalogRepos[0]
	}
	return &StreamingService{repo: repo, trailerRepo: trailerRepo, episodeRepo: episodeRepo, catalogRepo: catalogRepo}
}

// UpdateProgress guarda o actualiza el progreso de reproduccion.
// totalDuration = 0 cuando la duracion es desconocida.
func (s *StreamingService) UpdateProgress(
	ctx context.Context,
	h *domain.PlaybackHistory,
	totalDuration int,
) (domain.PlaybackState, error) {
	return s.repo.Upsert(ctx, h, totalDuration)
}

// GetProgress devuelve el ultimo progreso registrado para reanudar.
func (s *StreamingService) GetProgress(
	ctx context.Context,
	profileID, contentID, episodeID string,
) (*domain.PlaybackHistory, error) {
	return s.repo.GetProgress(ctx, profileID, contentID, episodeID)
}

// GetHistory devuelve el historial reciente de un perfil.
// limit = 0 devuelve todos los registros.
func (s *StreamingService) GetHistory(
	ctx context.Context,
	profileID string,
	limit int,
) ([]domain.PlaybackHistory, error) {
	return s.repo.GetHistory(ctx, profileID, limit)
}

func (s *StreamingService) GetRecommendations(
	ctx context.Context,
	profileID string,
	limit int,
) ([]domain.Recommendation, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	if s.catalogRepo == nil {
		return []domain.Recommendation{}, nil
	}

	history, err := s.repo.GetHistory(ctx, profileID, 25)
	if err != nil {
		return nil, err
	}
	ratings, err := s.catalogRepo.ListRatingsByProfile(ctx, profileID)
	if err != nil {
		return nil, err
	}
	catalog, err := s.catalogRepo.ListContent(ctx)
	if err != nil {
		return nil, err
	}

	recommender := contentBasedRecommender{}
	return recommender.Recommend(ctx, catalog, history, ratings, s.catalogRepo, limit)
}

// GetTrailerURL devuelve una URL firmada de GCS para reproducir el trailer del contenido.
func (s *StreamingService) GetTrailerURL(ctx context.Context, contentID string) (string, error) {
	return s.trailerRepo.GetSignedURL(ctx, contentID)
}

// GetEpisodeVideoURL devuelve una URL firmada de GCS para reproducir el video de un episodio.
func (s *StreamingService) GetEpisodeVideoURL(ctx context.Context, objectName string) (string, error) {
	return s.episodeRepo.GetEpisodeSignedURL(ctx, objectName)
}
