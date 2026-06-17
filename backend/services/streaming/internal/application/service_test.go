package application_test

import (
	"context"
	"errors"
	"testing"

	"quetzaltv/services/streaming/internal/application"
	"quetzaltv/services/streaming/internal/domain"
)

// ─── Mocks ────────────────────────────────────────────────────────────────────

type mockPlaybackRepo struct {
	upsertFn      func(ctx context.Context, h *domain.PlaybackHistory, totalDuration int) (domain.PlaybackState, error)
	getProgressFn func(ctx context.Context, profileID, contentID, episodeID string) (*domain.PlaybackHistory, error)
	getHistoryFn  func(ctx context.Context, profileID string, limit int) ([]domain.PlaybackHistory, error)
}

func (m *mockPlaybackRepo) Upsert(ctx context.Context, h *domain.PlaybackHistory, total int) (domain.PlaybackState, error) {
	return m.upsertFn(ctx, h, total)
}
func (m *mockPlaybackRepo) GetProgress(ctx context.Context, profileID, contentID, episodeID string) (*domain.PlaybackHistory, error) {
	return m.getProgressFn(ctx, profileID, contentID, episodeID)
}
func (m *mockPlaybackRepo) GetHistory(ctx context.Context, profileID string, limit int) ([]domain.PlaybackHistory, error) {
	return m.getHistoryFn(ctx, profileID, limit)
}

type mockTrailerRepo struct {
	getSignedURLFn func(ctx context.Context, contentID string) (string, error)
}

func (m *mockTrailerRepo) GetSignedURL(ctx context.Context, contentID string) (string, error) {
	return m.getSignedURLFn(ctx, contentID)
}

type mockEpisodeRepo struct {
	getEpisodeSignedURLFn func(ctx context.Context, objectName string) (string, error)
}

func (m *mockEpisodeRepo) GetEpisodeSignedURL(ctx context.Context, objectName string) (string, error) {
	return m.getEpisodeSignedURLFn(ctx, objectName)
}

// ─── UpdateProgress ───────────────────────────────────────────────────────────

func TestUpdateProgress_InProgress(t *testing.T) {
	repo := &mockPlaybackRepo{
		upsertFn: func(_ context.Context, h *domain.PlaybackHistory, total int) (domain.PlaybackState, error) {
			return domain.PlaybackInProgress, nil
		},
	}
	svc := application.New(repo, &mockTrailerRepo{}, &mockEpisodeRepo{})
	h := &domain.PlaybackHistory{ProfileID: "p1", ContentID: "c1", ProgressSeconds: 30}
	state, err := svc.UpdateProgress(context.Background(), h, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if state != domain.PlaybackInProgress {
		t.Errorf("expected PlaybackInProgress, got %q", state)
	}
}

func TestUpdateProgress_Finished(t *testing.T) {
	repo := &mockPlaybackRepo{
		upsertFn: func(_ context.Context, h *domain.PlaybackHistory, total int) (domain.PlaybackState, error) {
			return domain.PlaybackFinished, nil
		},
	}
	svc := application.New(repo, &mockTrailerRepo{}, &mockEpisodeRepo{})
	h := &domain.PlaybackHistory{ProfileID: "p1", ContentID: "c1", ProgressSeconds: 100}
	state, err := svc.UpdateProgress(context.Background(), h, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if state != domain.PlaybackFinished {
		t.Errorf("expected PlaybackFinished, got %q", state)
	}
}

func TestUpdateProgress_PropagatesError(t *testing.T) {
	repo := &mockPlaybackRepo{
		upsertFn: func(_ context.Context, _ *domain.PlaybackHistory, _ int) (domain.PlaybackState, error) {
			return "", errors.New("db error")
		},
	}
	svc := application.New(repo, &mockTrailerRepo{}, &mockEpisodeRepo{})
	_, err := svc.UpdateProgress(context.Background(), &domain.PlaybackHistory{}, 0)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ─── GetProgress ──────────────────────────────────────────────────────────────

func TestGetProgress_ReturnsHistory(t *testing.T) {
	expected := &domain.PlaybackHistory{
		ID: "h1", ProfileID: "p1", ContentID: "c1", ProgressSeconds: 45,
	}
	repo := &mockPlaybackRepo{
		getProgressFn: func(_ context.Context, profileID, contentID, episodeID string) (*domain.PlaybackHistory, error) {
			return expected, nil
		},
	}
	svc := application.New(repo, &mockTrailerRepo{}, &mockEpisodeRepo{})
	got, err := svc.GetProgress(context.Background(), "p1", "c1", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != "h1" || got.ProgressSeconds != 45 {
		t.Error("unexpected history returned")
	}
}

func TestGetProgress_NotFound(t *testing.T) {
	repo := &mockPlaybackRepo{
		getProgressFn: func(_ context.Context, _, _, _ string) (*domain.PlaybackHistory, error) {
			return nil, domain.ErrHistoryNotFound
		},
	}
	svc := application.New(repo, &mockTrailerRepo{}, &mockEpisodeRepo{})
	_, err := svc.GetProgress(context.Background(), "p1", "c1", "")
	if !errors.Is(err, domain.ErrHistoryNotFound) {
		t.Errorf("expected ErrHistoryNotFound, got %v", err)
	}
}

// ─── GetHistory ───────────────────────────────────────────────────────────────

func TestGetHistory_ReturnsMultiple(t *testing.T) {
	repo := &mockPlaybackRepo{
		getHistoryFn: func(_ context.Context, profileID string, limit int) ([]domain.PlaybackHistory, error) {
			return []domain.PlaybackHistory{
				{ID: "h1", ProfileID: profileID},
				{ID: "h2", ProfileID: profileID},
			}, nil
		},
	}
	svc := application.New(repo, &mockTrailerRepo{}, &mockEpisodeRepo{})
	history, err := svc.GetHistory(context.Background(), "p1", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(history) != 2 {
		t.Errorf("expected 2 history items, got %d", len(history))
	}
}

func TestGetHistory_PropagatesError(t *testing.T) {
	repo := &mockPlaybackRepo{
		getHistoryFn: func(_ context.Context, _ string, _ int) ([]domain.PlaybackHistory, error) {
			return nil, errors.New("db error")
		},
	}
	svc := application.New(repo, &mockTrailerRepo{}, &mockEpisodeRepo{})
	_, err := svc.GetHistory(context.Background(), "p1", 5)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ─── GetTrailerURL ────────────────────────────────────────────────────────────

func TestGetTrailerURL_ReturnsSignedURL(t *testing.T) {
	trailerRepo := &mockTrailerRepo{
		getSignedURLFn: func(_ context.Context, contentID string) (string, error) {
			return "https://storage.example.com/trailer/" + contentID, nil
		},
	}
	svc := application.New(&mockPlaybackRepo{}, trailerRepo, &mockEpisodeRepo{})
	url, err := svc.GetTrailerURL(context.Background(), "c1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if url != "https://storage.example.com/trailer/c1" {
		t.Errorf("unexpected URL: %q", url)
	}
}

func TestGetTrailerURL_NotFound(t *testing.T) {
	trailerRepo := &mockTrailerRepo{
		getSignedURLFn: func(_ context.Context, _ string) (string, error) {
			return "", domain.ErrTrailerNotFound
		},
	}
	svc := application.New(&mockPlaybackRepo{}, trailerRepo, &mockEpisodeRepo{})
	_, err := svc.GetTrailerURL(context.Background(), "missing")
	if !errors.Is(err, domain.ErrTrailerNotFound) {
		t.Errorf("expected ErrTrailerNotFound, got %v", err)
	}
}

// ─── GetEpisodeVideoURL ───────────────────────────────────────────────────────

func TestGetEpisodeVideoURL_ReturnsSignedURL(t *testing.T) {
	episodeRepo := &mockEpisodeRepo{
		getEpisodeSignedURLFn: func(_ context.Context, objectName string) (string, error) {
			return "https://storage.example.com/episodes/" + objectName, nil
		},
	}
	svc := application.New(&mockPlaybackRepo{}, &mockTrailerRepo{}, episodeRepo)
	url, err := svc.GetEpisodeVideoURL(context.Background(), "ep_001.mp4")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if url != "https://storage.example.com/episodes/ep_001.mp4" {
		t.Errorf("unexpected URL: %q", url)
	}
}

func TestGetEpisodeVideoURL_NotFound(t *testing.T) {
	episodeRepo := &mockEpisodeRepo{
		getEpisodeSignedURLFn: func(_ context.Context, _ string) (string, error) {
			return "", domain.ErrEpisodeNotFound
		},
	}
	svc := application.New(&mockPlaybackRepo{}, &mockTrailerRepo{}, episodeRepo)
	_, err := svc.GetEpisodeVideoURL(context.Background(), "missing.mp4")
	if !errors.Is(err, domain.ErrEpisodeNotFound) {
		t.Errorf("expected ErrEpisodeNotFound, got %v", err)
	}
}
