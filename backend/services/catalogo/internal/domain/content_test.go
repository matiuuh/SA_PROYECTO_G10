package domain_test

import (
	"testing"

	"quetzaltv/services/catalogo/internal/domain"
)

func TestContentTypeConstants(t *testing.T) {
	if domain.ContentTypeMovie != "pelicula" {
		t.Errorf("expected 'pelicula', got %q", domain.ContentTypeMovie)
	}
	if domain.ContentTypeSeries != "serie" {
		t.Errorf("expected 'serie', got %q", domain.ContentTypeSeries)
	}
}

func TestReactionTypeConstants(t *testing.T) {
	if domain.ReactionLike != "like" {
		t.Errorf("expected 'like', got %q", domain.ReactionLike)
	}
	if domain.ReactionDislike != "dislike" {
		t.Errorf("expected 'dislike', got %q", domain.ReactionDislike)
	}
}

func TestDomainErrors_NotNil(t *testing.T) {
	errors := []error{
		domain.ErrContentNotFound,
		domain.ErrContentDeleted,
		domain.ErrInvalidGenre,
		domain.ErrDuplicateContent,
		domain.ErrInvalidSeriesContent,
	}
	for _, err := range errors {
		if err == nil {
			t.Errorf("expected non-nil domain error, got nil")
		}
	}
}

func TestDomainErrors_Messages(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{domain.ErrContentNotFound, "contenido no encontrado"},
		{domain.ErrContentDeleted, "contenido ya eliminado"},
		{domain.ErrInvalidGenre, "genero no valido"},
		{domain.ErrDuplicateContent, "contenido duplicado"},
		{domain.ErrInvalidSeriesContent, "el contenido no corresponde a una serie"},
	}
	for _, tc := range cases {
		if tc.err.Error() != tc.want {
			t.Errorf("error message: got %q, want %q", tc.err.Error(), tc.want)
		}
	}
}

func TestContentStruct_ZeroValue(t *testing.T) {
	var c domain.Content
	if c.ID != "" || c.Title != "" {
		t.Error("zero-value Content should have empty ID and Title")
	}
}

func TestRatingStruct(t *testing.T) {
	r := domain.Rating{
		ContentID: "c1",
		ProfileID: "p1",
		Reaction:  domain.ReactionLike,
	}
	if r.ContentID != "c1" || r.ProfileID != "p1" || r.Reaction != domain.ReactionLike {
		t.Error("Rating struct fields not set correctly")
	}
}

func TestEpisodeBatchStruct(t *testing.T) {
	batch := domain.EpisodeBatch{
		SeasonNumber:      1,
		SeasonTitle:       "Season 1",
		SeasonDescription: "First season",
		Episodes: []domain.Episode{
			{Number: 1, Title: "Pilot", DurationMinutes: 45},
		},
	}
	if len(batch.Episodes) != 1 {
		t.Errorf("expected 1 episode, got %d", len(batch.Episodes))
	}
	if batch.Episodes[0].Title != "Pilot" {
		t.Errorf("expected title 'Pilot', got %q", batch.Episodes[0].Title)
	}
}

func TestGenreStruct(t *testing.T) {
	g := domain.Genre{ID: 1, Name: "Accion", Description: "Peliculas de accion"}
	if g.ID != 1 || g.Name != "Accion" {
		t.Error("Genre struct fields not set correctly")
	}
}

func TestCastMemberStruct(t *testing.T) {
	cm := domain.CastMember{
		ID:           10,
		ArtisticName: "El Artista",
		RealName:     "Nombre Real",
		Nationality:  "Guatemala",
		Character:    "Heroe",
	}
	if cm.ArtisticName != "El Artista" || cm.Nationality != "Guatemala" {
		t.Error("CastMember struct fields not set correctly")
	}
}

func TestContentDetail_EmbedContent(t *testing.T) {
	cd := domain.ContentDetail{
		Content: domain.Content{
			ID:    "abc",
			Title: "Mi Pelicula",
			Type:  domain.ContentTypeMovie,
		},
		TotalLikes:    100,
		TotalDislikes: 5,
		Genres:        []domain.Genre{{ID: 1, Name: "Drama"}},
		Cast:          []domain.CastMember{{ID: 1, ArtisticName: "Actor"}},
	}
	if cd.ID != "abc" {
		t.Errorf("embedded Content.ID expected 'abc', got %q", cd.ID)
	}
	if cd.TotalLikes != 100 {
		t.Errorf("expected TotalLikes=100, got %d", cd.TotalLikes)
	}
}
