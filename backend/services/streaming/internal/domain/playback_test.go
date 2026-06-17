package domain_test

import (
	"testing"
	"time"

	"quetzaltv/services/streaming/internal/domain"
)

func TestPlaybackStateConstants(t *testing.T) {
	if domain.PlaybackInProgress != "en_progreso" {
		t.Errorf("expected 'en_progreso', got %q", domain.PlaybackInProgress)
	}
	if domain.PlaybackFinished != "finalizado" {
		t.Errorf("expected 'finalizado', got %q", domain.PlaybackFinished)
	}
}

func TestDomainErrors_NotNil(t *testing.T) {
	errs := []error{
		domain.ErrHistoryNotFound,
		domain.ErrTrailerNotFound,
		domain.ErrEpisodeNotFound,
	}
	for _, err := range errs {
		if err == nil {
			t.Error("expected non-nil domain error")
		}
	}
}

func TestDomainErrors_Messages(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{domain.ErrHistoryNotFound, "historial no encontrado"},
		{domain.ErrTrailerNotFound, "trailer no encontrado"},
		{domain.ErrEpisodeNotFound, "video de episodio no encontrado"},
	}
	for _, tc := range cases {
		if tc.err.Error() != tc.want {
			t.Errorf("error message: got %q, want %q", tc.err.Error(), tc.want)
		}
	}
}

func TestPlaybackHistory_ZeroValue(t *testing.T) {
	var h domain.PlaybackHistory
	if h.ID != "" || h.ProfileID != "" || h.ContentID != "" {
		t.Error("zero-value PlaybackHistory should have empty string fields")
	}
	if h.ProgressSeconds != 0 {
		t.Error("zero-value ProgressSeconds should be 0")
	}
}

func TestPlaybackHistory_Fields(t *testing.T) {
	now := time.Now()
	h := domain.PlaybackHistory{
		ID:              "h1",
		ProfileID:       "p1",
		ContentID:       "c1",
		EpisodeID:       "e1",
		State:           domain.PlaybackInProgress,
		ProgressSeconds: 120,
		UpdatedAt:       now,
	}
	if h.ID != "h1" {
		t.Errorf("expected ID 'h1', got %q", h.ID)
	}
	if h.State != domain.PlaybackInProgress {
		t.Errorf("expected PlaybackInProgress state")
	}
	if h.ProgressSeconds != 120 {
		t.Errorf("expected ProgressSeconds 120, got %d", h.ProgressSeconds)
	}
	if !h.UpdatedAt.Equal(now) {
		t.Error("UpdatedAt mismatch")
	}
}

func TestPlaybackHistory_EpisodeIDEmptyForMovies(t *testing.T) {
	h := domain.PlaybackHistory{
		ID:        "h2",
		ProfileID: "p1",
		ContentID: "c1",
		EpisodeID: "",
		State:     domain.PlaybackFinished,
	}
	if h.EpisodeID != "" {
		t.Errorf("movie history should have empty EpisodeID, got %q", h.EpisodeID)
	}
}
