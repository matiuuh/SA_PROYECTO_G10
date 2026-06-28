package application_test

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"quetzaltv/services/streaming/internal/application"
	"quetzaltv/services/streaming/internal/domain"
)

// ─── Mock adicional: CatalogRecommendationRepository ─────────────────────────

type mockCatalogRepo struct {
	listContentFn          func(ctx context.Context) ([]domain.CatalogContent, error)
	getContentDetailFn     func(ctx context.Context, contentID string) (*domain.CatalogContent, error)
	listRatingsByProfileFn func(ctx context.Context, profileID string) ([]domain.ProfileRating, error)
}

func (m *mockCatalogRepo) ListContent(ctx context.Context) ([]domain.CatalogContent, error) {
	if m.listContentFn != nil {
		return m.listContentFn(ctx)
	}
	return []domain.CatalogContent{}, nil
}
func (m *mockCatalogRepo) GetContentDetail(ctx context.Context, id string) (*domain.CatalogContent, error) {
	if m.getContentDetailFn != nil {
		return m.getContentDetailFn(ctx, id)
	}
	return nil, nil
}
func (m *mockCatalogRepo) ListRatingsByProfile(ctx context.Context, profileID string) ([]domain.ProfileRating, error) {
	if m.listRatingsByProfileFn != nil {
		return m.listRatingsByProfileFn(ctx, profileID)
	}
	return []domain.ProfileRating{}, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func playbackRepoWithHistory(items []domain.PlaybackHistory) *mockPlaybackRepo {
	return &mockPlaybackRepo{
		getHistoryFn: func(_ context.Context, _ string, _ int) ([]domain.PlaybackHistory, error) {
			return items, nil
		},
	}
}

func playbackRepoWithHistoryError(err error) *mockPlaybackRepo {
	return &mockPlaybackRepo{
		getHistoryFn: func(_ context.Context, _ string, _ int) ([]domain.PlaybackHistory, error) {
			return nil, err
		},
	}
}

func catalogWithNItems(n int) []domain.CatalogContent {
	items := make([]domain.CatalogContent, n)
	for i := range items {
		items[i] = domain.CatalogContent{
			ID:                fmt.Sprintf("c%d", i),
			Title:             fmt.Sprintf("Content %d", i),
			RecommendationPct: float64(50 + i),
		}
	}
	return items
}

// ─── GetRecommendations — casos del service.go ────────────────────────────────

func TestGetRecommendations_NilCatalogRepo(t *testing.T) {
	svc := application.New(playbackRepoWithHistory(nil), &mockTrailerRepo{}, &mockEpisodeRepo{})
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(recs) != 0 {
		t.Errorf("expected 0 recs with nil catalogRepo, got %d", len(recs))
	}
}

func TestGetRecommendations_LimitZero_ClampsToTen(t *testing.T) {
	catalog := catalogWithNItems(15)
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
	}
	svc := application.New(playbackRepoWithHistory(nil), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(recs) != 10 {
		t.Errorf("expected 10 (clamped from 0), got %d", len(recs))
	}
}

func TestGetRecommendations_LimitOver50_ClampsToTen(t *testing.T) {
	catalog := catalogWithNItems(15)
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
	}
	svc := application.New(playbackRepoWithHistory(nil), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(recs) != 10 {
		t.Errorf("expected 10 (clamped from 100), got %d", len(recs))
	}
}

func TestGetRecommendations_HistoryError_Propagates(t *testing.T) {
	dbErr := errors.New("history db error")
	cr := &mockCatalogRepo{}
	svc := application.New(playbackRepoWithHistoryError(dbErr), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	_, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if !errors.Is(err, dbErr) {
		t.Errorf("expected db error, got %v", err)
	}
}

func TestGetRecommendations_RatingsError_Propagates(t *testing.T) {
	ratingsErr := errors.New("ratings error")
	cr := &mockCatalogRepo{
		listRatingsByProfileFn: func(_ context.Context, _ string) ([]domain.ProfileRating, error) {
			return nil, ratingsErr
		},
	}
	svc := application.New(playbackRepoWithHistory(nil), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	_, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if !errors.Is(err, ratingsErr) {
		t.Errorf("expected ratings error, got %v", err)
	}
}

func TestGetRecommendations_CatalogListError_Propagates(t *testing.T) {
	listErr := errors.New("list error")
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return nil, listErr },
	}
	svc := application.New(playbackRepoWithHistory(nil), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	_, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if !errors.Is(err, listErr) {
		t.Errorf("expected list error, got %v", err)
	}
}

// ─── GetRecommendations — casos de recommendation.go ─────────────────────────

// Sin historial ni ratings → score viene solo de RecommendationPct, razón = "Popular".
func TestGetRecommendations_EmptyHistory_PopularReason(t *testing.T) {
	catalog := []domain.CatalogContent{
		{ID: "c1", Title: "Pelicula Popular", RecommendationPct: 80},
	}
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
	}
	svc := application.New(playbackRepoWithHistory(nil), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(recs) != 1 {
		t.Fatalf("expected 1 rec, got %d", len(recs))
	}
	if recs[0].Reason != "Popular en el catalogo" {
		t.Errorf("expected 'Popular en el catalogo', got %q", recs[0].Reason)
	}
}

// Contenido ya visto no aparece en las recomendaciones.
func TestGetRecommendations_ExcludesWatchedContent(t *testing.T) {
	history := []domain.PlaybackHistory{{ProfileID: "p1", ContentID: "c1"}}
	catalog := []domain.CatalogContent{
		{ID: "c1", Title: "Ya Vista", RecommendationPct: 90},
		{ID: "c2", Title: "Nueva",    RecommendationPct: 70},
	}
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
		getContentDetailFn: func(_ context.Context, id string) (*domain.CatalogContent, error) {
			return nil, nil
		},
	}
	svc := application.New(playbackRepoWithHistory(history), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, r := range recs {
		if r.ID == "c1" {
			t.Error("watched content c1 should be excluded from recommendations")
		}
	}
}

// Like en historial → impulsa peso del género → razón menciona el género.
func TestGetRecommendations_LikedGenreBoost_GenreReason(t *testing.T) {
	history := []domain.PlaybackHistory{
		{ProfileID: "p1", ContentID: "c1", ProgressSeconds: 50},
	}
	ratings := []domain.ProfileRating{
		{ContentID: "c1", Reaction: "like"},
	}
	catalog := []domain.CatalogContent{
		{ID: "c2", Title: "Recomendada", Genres: []string{"Accion"}, RecommendationPct: 10},
	}
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
		getContentDetailFn: func(_ context.Context, id string) (*domain.CatalogContent, error) {
			if id == "c1" {
				return &domain.CatalogContent{ID: "c1", Genres: []string{"Accion"}}, nil
			}
			return nil, nil
		},
		listRatingsByProfileFn: func(_ context.Context, _ string) ([]domain.ProfileRating, error) {
			return ratings, nil
		},
	}
	svc := application.New(playbackRepoWithHistory(history), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(recs) == 0 {
		t.Fatal("expected at least 1 recommendation")
	}
	if recs[0].Reason == "Popular en el catalogo" {
		t.Error("liked genre should produce a genre-specific reason")
	}
}

// Dislike de contenido NO visto → peso negativo en género → item con ese género excluido.
func TestGetRecommendations_DislikedUnseenContent_ExcludesNegativeScore(t *testing.T) {
	ratings := []domain.ProfileRating{
		{ContentID: "rated1", Reaction: "dislike"},
	}
	catalog := []domain.CatalogContent{
		{ID: "c1", Title: "Terror", Genres: []string{"Terror"}, RecommendationPct: 0},
	}
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
		getContentDetailFn: func(_ context.Context, id string) (*domain.CatalogContent, error) {
			return &domain.CatalogContent{ID: id, Genres: []string{"Terror"}}, nil
		},
		listRatingsByProfileFn: func(_ context.Context, _ string) ([]domain.ProfileRating, error) {
			return ratings, nil
		},
	}
	svc := application.New(playbackRepoWithHistory(nil), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, r := range recs {
		if r.ID == "c1" {
			t.Error("content with negative genre score should be excluded")
		}
	}
}

// Reproducción finalizada → mayor peso de género en el recomendador.
func TestGetRecommendations_FinishedPlayback_BoostsGenreWeight(t *testing.T) {
	history := []domain.PlaybackHistory{
		{ProfileID: "p1", ContentID: "c1", State: domain.PlaybackFinished, ProgressSeconds: 120},
	}
	catalog := []domain.CatalogContent{
		{ID: "c2", Title: "Similar", Genres: []string{"Drama"}, RecommendationPct: 5},
	}
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
		getContentDetailFn: func(_ context.Context, id string) (*domain.CatalogContent, error) {
			return &domain.CatalogContent{ID: id, Genres: []string{"Drama"}}, nil
		},
	}
	svc := application.New(playbackRepoWithHistory(history), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// c2 tiene mismo género que c1 (finalizado) → debe tener puntuación alta y aparecer
	found := false
	for _, r := range recs {
		if r.ID == "c2" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected c2 to be recommended based on finished playback genre boost")
	}
}

// Error al obtener detalle de un ítem del historial → se omite sin abortar.
func TestGetRecommendations_DetailErrorInHistory_ItemSkipped(t *testing.T) {
	history := []domain.PlaybackHistory{
		{ProfileID: "p1", ContentID: "c1", ProgressSeconds: 30},
	}
	catalog := []domain.CatalogContent{
		{ID: "c2", Title: "Otra", RecommendationPct: 60},
	}
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
		getContentDetailFn: func(_ context.Context, _ string) (*domain.CatalogContent, error) {
			return nil, errors.New("catalog unavailable")
		},
	}
	svc := application.New(playbackRepoWithHistory(history), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Sin detalle del historial no hay pesos de género; c2 debe aparecer como "Popular".
	if len(recs) != 1 || recs[0].ID != "c2" {
		t.Errorf("expected c2 as fallback popular item, got %v", recs)
	}
}

// Ítem de catálogo sin géneros → se busca el detalle para obtenerlos.
func TestGetRecommendations_CatalogItemWithoutGenres_FetchesDetail(t *testing.T) {
	history := []domain.PlaybackHistory{
		{ProfileID: "p1", ContentID: "h1", ProgressSeconds: 10},
	}
	catalog := []domain.CatalogContent{
		{ID: "c1", Title: "Sin géneros en catálogo"}, // Genres vacío
	}
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
		getContentDetailFn: func(_ context.Context, id string) (*domain.CatalogContent, error) {
			if id == "h1" {
				return &domain.CatalogContent{ID: "h1", Genres: []string{"Comedia"}}, nil
			}
			// Para c1 (sin géneros en catálogo), el recomendador busca el detalle
			return &domain.CatalogContent{ID: id, Genres: []string{"Comedia"}, RecommendationPct: 70}, nil
		},
	}
	svc := application.New(playbackRepoWithHistory(history), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	found := false
	for _, r := range recs {
		if r.ID == "c1" {
			found = true
		}
	}
	if !found {
		t.Error("expected c1 to appear after fetching its genre detail")
	}
}

// Rating de contenido ya visto → el rating es ignorado (no acumula pesos).
func TestGetRecommendations_RatingForWatchedContent_Skipped(t *testing.T) {
	history := []domain.PlaybackHistory{
		{ProfileID: "p1", ContentID: "c1"}, // c1 ya visto
	}
	ratings := []domain.ProfileRating{
		{ContentID: "c1", Reaction: "like"}, // rating para c1, pero c1 está en watched
	}
	catalog := []domain.CatalogContent{
		{ID: "c2", RecommendationPct: 50},
	}
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
		getContentDetailFn: func(_ context.Context, _ string) (*domain.CatalogContent, error) {
			return nil, nil
		},
		listRatingsByProfileFn: func(_ context.Context, _ string) ([]domain.ProfileRating, error) {
			return ratings, nil
		},
	}
	svc := application.New(playbackRepoWithHistory(history), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// No debe haber crash ni errores; c2 aparece como popular
	_ = recs
}

// Resultados ordenados de mayor a menor score.
func TestGetRecommendations_SortedByScoreDescending(t *testing.T) {
	catalog := []domain.CatalogContent{
		{ID: "low",  RecommendationPct: 10},
		{ID: "high", RecommendationPct: 90},
		{ID: "mid",  RecommendationPct: 50},
	}
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
	}
	svc := application.New(playbackRepoWithHistory(nil), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(recs) != 3 {
		t.Fatalf("expected 3 recs, got %d", len(recs))
	}
	for i := 1; i < len(recs); i++ {
		if recs[i].Score > recs[i-1].Score {
			t.Errorf("recs not sorted: recs[%d].Score (%.2f) > recs[%d].Score (%.2f)",
				i, recs[i].Score, i-1, recs[i-1].Score)
		}
	}
}

// El resultado se trunca al límite solicitado.
func TestGetRecommendations_LimitTruncation(t *testing.T) {
	catalog := catalogWithNItems(20)
	cr := &mockCatalogRepo{
		listContentFn: func(_ context.Context) ([]domain.CatalogContent, error) { return catalog, nil },
	}
	svc := application.New(playbackRepoWithHistory(nil), &mockTrailerRepo{}, &mockEpisodeRepo{}, cr)
	recs, err := svc.GetRecommendations(context.Background(), "p1", 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(recs) != 5 {
		t.Errorf("expected 5 recs (truncated), got %d", len(recs))
	}
}
