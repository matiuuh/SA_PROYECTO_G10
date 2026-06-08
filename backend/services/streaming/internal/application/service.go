package application

import (
	"context"

	"quetzaltv/services/streaming/internal/domain"
)

// StreamingService orquesta los casos de uso del dominio de streaming.
type StreamingService struct {
	repo domain.PlaybackRepository
}

func New(repo domain.PlaybackRepository) *StreamingService {
	return &StreamingService{repo: repo}
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
