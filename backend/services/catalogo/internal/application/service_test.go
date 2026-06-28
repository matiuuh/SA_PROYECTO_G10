package application_test

import (
	"context"
	"errors"
	"testing"

	"quetzaltv/services/catalogo/internal/application"
	"quetzaltv/services/catalogo/internal/domain"
)

// ─── Mock repository ──────────────────────────────────────────────────────────

type mockContentRepo struct {
	listFn                 func(ctx context.Context) ([]domain.Content, error)
	listAllFn              func(ctx context.Context) ([]domain.Content, error)
	searchFn               func(ctx context.Context, query string) ([]domain.Content, error)
	filterByGenresFn       func(ctx context.Context, genreIDs []int64) ([]domain.Content, error)
	getDetailFn            func(ctx context.Context, id string) (*domain.ContentDetail, error)
	existsByTitleAndTypeFn func(ctx context.Context, title string, contentType domain.ContentType) (bool, error)
	createFn               func(ctx context.Context, c *domain.Content, genreIDs []int64) (string, error)
	updateFn               func(ctx context.Context, id string, c *domain.Content, actorAccountID string) error
	deleteFn               func(ctx context.Context, id string, actorAccountID string) error
	rateFn                 func(ctx context.Context, r *domain.Rating) (float64, error)
	listRatingsByProfileFn func(ctx context.Context, profileID string) ([]domain.Rating, error)
	listSeasonsByContentFn func(ctx context.Context, contentID string) ([]domain.Season, error)
	createEpisodeBatchFn   func(ctx context.Context, contentID string, batch domain.EpisodeBatch, actorAccountID string) ([]domain.Episode, error)
	listAuditFn            func(ctx context.Context, limit int) ([]domain.AuditEntry, error)
	listPendingAlertsFn    func(ctx context.Context, limit int) ([]domain.Content, error)
	markAlertSentFn        func(ctx context.Context, contentID string) error
}

func (m *mockContentRepo) List(ctx context.Context) ([]domain.Content, error) {
	return m.listFn(ctx)
}
func (m *mockContentRepo) ListAll(ctx context.Context) ([]domain.Content, error) {
	return m.listAllFn(ctx)
}
func (m *mockContentRepo) Search(ctx context.Context, q string) ([]domain.Content, error) {
	return m.searchFn(ctx, q)
}
func (m *mockContentRepo) FilterByGenres(ctx context.Context, ids []int64) ([]domain.Content, error) {
	return m.filterByGenresFn(ctx, ids)
}
func (m *mockContentRepo) GetDetail(ctx context.Context, id string) (*domain.ContentDetail, error) {
	return m.getDetailFn(ctx, id)
}
func (m *mockContentRepo) ExistsByTitleAndType(ctx context.Context, title string, t domain.ContentType) (bool, error) {
	return m.existsByTitleAndTypeFn(ctx, title, t)
}
func (m *mockContentRepo) Create(ctx context.Context, c *domain.Content, ids []int64) (string, error) {
	return m.createFn(ctx, c, ids)
}
func (m *mockContentRepo) Update(ctx context.Context, id string, c *domain.Content, actor string) error {
	return m.updateFn(ctx, id, c, actor)
}
func (m *mockContentRepo) Delete(ctx context.Context, id string, actor string) error {
	return m.deleteFn(ctx, id, actor)
}
func (m *mockContentRepo) Rate(ctx context.Context, r *domain.Rating) (float64, error) {
	return m.rateFn(ctx, r)
}
func (m *mockContentRepo) ListRatingsByProfile(ctx context.Context, profileID string) ([]domain.Rating, error) {
	if m.listRatingsByProfileFn == nil {
		return []domain.Rating{}, nil
	}
	return m.listRatingsByProfileFn(ctx, profileID)
}
func (m *mockContentRepo) ListSeasonsByContent(ctx context.Context, contentID string) ([]domain.Season, error) {
	return m.listSeasonsByContentFn(ctx, contentID)
}
func (m *mockContentRepo) CreateEpisodeBatch(ctx context.Context, contentID string, batch domain.EpisodeBatch, actor string) ([]domain.Episode, error) {
	return m.createEpisodeBatchFn(ctx, contentID, batch, actor)
}
func (m *mockContentRepo) ListAudit(ctx context.Context, limit int) ([]domain.AuditEntry, error) {
	return m.listAuditFn(ctx, limit)
}
func (m *mockContentRepo) ListPendingPublicationAlerts(ctx context.Context, limit int) ([]domain.Content, error) {
	return m.listPendingAlertsFn(ctx, limit)
}
func (m *mockContentRepo) MarkPublicationAlertSent(ctx context.Context, contentID string) error {
	return m.markAlertSentFn(ctx, contentID)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func sampleContents() []domain.Content {
	return []domain.Content{
		{ID: "1", Title: "Película A", Type: domain.ContentTypeMovie},
		{ID: "2", Title: "Serie B", Type: domain.ContentTypeSeries},
	}
}

// ─── List ─────────────────────────────────────────────────────────────────────

func TestList_ReturnsContents(t *testing.T) {
	repo := &mockContentRepo{
		listFn: func(_ context.Context) ([]domain.Content, error) {
			return sampleContents(), nil
		},
	}
	svc := application.New(repo)
	got, err := svc.List(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Errorf("expected 2 contents, got %d", len(got))
	}
}

func TestList_PropagatesError(t *testing.T) {
	repo := &mockContentRepo{
		listFn: func(_ context.Context) ([]domain.Content, error) {
			return nil, errors.New("db error")
		},
	}
	svc := application.New(repo)
	_, err := svc.List(context.Background())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ─── ListAll ──────────────────────────────────────────────────────────────────

func TestListAll_ReturnsAllContents(t *testing.T) {
	repo := &mockContentRepo{
		listAllFn: func(_ context.Context) ([]domain.Content, error) {
			return sampleContents(), nil
		},
	}
	svc := application.New(repo)
	got, err := svc.ListAll(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Errorf("expected 2, got %d", len(got))
	}
}

// ─── Search ───────────────────────────────────────────────────────────────────

func TestSearch_EmptyQuery_FallsBackToList(t *testing.T) {
	listCalled := false
	repo := &mockContentRepo{
		listFn: func(_ context.Context) ([]domain.Content, error) {
			listCalled = true
			return sampleContents(), nil
		},
	}
	svc := application.New(repo)
	_, err := svc.Search(context.Background(), "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !listCalled {
		t.Error("expected List to be called for empty query")
	}
}

func TestSearch_NonEmptyQuery_CallsSearch(t *testing.T) {
	searchCalled := false
	repo := &mockContentRepo{
		searchFn: func(_ context.Context, q string) ([]domain.Content, error) {
			searchCalled = true
			if q != "accion" {
				return nil, errors.New("unexpected query")
			}
			return sampleContents(), nil
		},
	}
	svc := application.New(repo)
	_, err := svc.Search(context.Background(), "accion")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !searchCalled {
		t.Error("expected Search to be called for non-empty query")
	}
}

// ─── FilterByGenres ───────────────────────────────────────────────────────────

func TestFilterByGenres_EmptyIDs_FallsBackToList(t *testing.T) {
	listCalled := false
	repo := &mockContentRepo{
		listFn: func(_ context.Context) ([]domain.Content, error) {
			listCalled = true
			return sampleContents(), nil
		},
	}
	svc := application.New(repo)
	_, err := svc.FilterByGenres(context.Background(), []int64{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !listCalled {
		t.Error("expected List to be called when genreIDs is empty")
	}
}

func TestFilterByGenres_WithIDs_CallsFilter(t *testing.T) {
	filterCalled := false
	repo := &mockContentRepo{
		filterByGenresFn: func(_ context.Context, ids []int64) ([]domain.Content, error) {
			filterCalled = true
			return sampleContents(), nil
		},
	}
	svc := application.New(repo)
	_, err := svc.FilterByGenres(context.Background(), []int64{1, 2})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !filterCalled {
		t.Error("expected FilterByGenres to be called when genreIDs is non-empty")
	}
}

// ─── GetDetail ────────────────────────────────────────────────────────────────

func TestGetDetail_ReturnsDetail(t *testing.T) {
	expected := &domain.ContentDetail{Content: domain.Content{ID: "1", Title: "Film"}}
	repo := &mockContentRepo{
		getDetailFn: func(_ context.Context, id string) (*domain.ContentDetail, error) {
			return expected, nil
		},
	}
	svc := application.New(repo)
	got, err := svc.GetDetail(context.Background(), "1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != "1" {
		t.Errorf("expected ID '1', got %q", got.ID)
	}
}

func TestGetDetail_NotFound(t *testing.T) {
	repo := &mockContentRepo{
		getDetailFn: func(_ context.Context, id string) (*domain.ContentDetail, error) {
			return nil, domain.ErrContentNotFound
		},
	}
	svc := application.New(repo)
	_, err := svc.GetDetail(context.Background(), "missing")
	if !errors.Is(err, domain.ErrContentNotFound) {
		t.Errorf("expected ErrContentNotFound, got %v", err)
	}
}

// ─── Create ───────────────────────────────────────────────────────────────────

func TestCreate_TrimsFields_AndCreates(t *testing.T) {
	var capturedTitle string
	repo := &mockContentRepo{
		existsByTitleAndTypeFn: func(_ context.Context, title string, _ domain.ContentType) (bool, error) {
			capturedTitle = title
			return false, nil
		},
		createFn: func(_ context.Context, c *domain.Content, ids []int64) (string, error) {
			return "new-id", nil
		},
	}
	svc := application.New(repo)
	c := &domain.Content{
		Title:    "  Mi Película  ",
		Type:     domain.ContentTypeMovie,
		Synopsis: "  Sinopsis  ",
		Language: "  es  ",
	}
	id, err := svc.Create(context.Background(), c, []int64{1})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if id != "new-id" {
		t.Errorf("expected 'new-id', got %q", id)
	}
	if capturedTitle != "Mi Película" {
		t.Errorf("expected trimmed title 'Mi Película', got %q", capturedTitle)
	}
}

func TestCreate_DuplicateContent_ReturnsError(t *testing.T) {
	repo := &mockContentRepo{
		existsByTitleAndTypeFn: func(_ context.Context, title string, _ domain.ContentType) (bool, error) {
			return true, nil
		},
	}
	svc := application.New(repo)
	c := &domain.Content{Title: "Dup", Type: domain.ContentTypeMovie}
	_, err := svc.Create(context.Background(), c, nil)
	if !errors.Is(err, domain.ErrDuplicateContent) {
		t.Errorf("expected ErrDuplicateContent, got %v", err)
	}
}

func TestCreate_ExistsCheckError_Propagates(t *testing.T) {
	repo := &mockContentRepo{
		existsByTitleAndTypeFn: func(_ context.Context, _ string, _ domain.ContentType) (bool, error) {
			return false, errors.New("db error")
		},
	}
	svc := application.New(repo)
	c := &domain.Content{Title: "X", Type: domain.ContentTypeMovie}
	_, err := svc.Create(context.Background(), c, nil)
	if err == nil {
		t.Fatal("expected error from existsCheck, got nil")
	}
}

// ─── Update ───────────────────────────────────────────────────────────────────

func TestUpdate_TrimsActorAccountID(t *testing.T) {
	var capturedActor string
	repo := &mockContentRepo{
		updateFn: func(_ context.Context, _ string, _ *domain.Content, actor string) error {
			capturedActor = actor
			return nil
		},
	}
	svc := application.New(repo)
	err := svc.Update(context.Background(), "1", &domain.Content{}, "  actor-id  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedActor != "actor-id" {
		t.Errorf("expected trimmed actor 'actor-id', got %q", capturedActor)
	}
}

// ─── Delete ───────────────────────────────────────────────────────────────────

func TestDelete_TrimsActorAccountID(t *testing.T) {
	var capturedActor string
	repo := &mockContentRepo{
		deleteFn: func(_ context.Context, _ string, actor string) error {
			capturedActor = actor
			return nil
		},
	}
	svc := application.New(repo)
	err := svc.Delete(context.Background(), "1", "  admin  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedActor != "admin" {
		t.Errorf("expected 'admin', got %q", capturedActor)
	}
}

// ─── Rate ─────────────────────────────────────────────────────────────────────

func TestRate_ReturnsPercentage(t *testing.T) {
	repo := &mockContentRepo{
		rateFn: func(_ context.Context, r *domain.Rating) (float64, error) {
			return 85.5, nil
		},
	}
	svc := application.New(repo)
	pct, err := svc.Rate(context.Background(), &domain.Rating{
		ContentID: "c1", ProfileID: "p1", Reaction: domain.ReactionLike,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if pct != 85.5 {
		t.Errorf("expected 85.5, got %f", pct)
	}
}

// ─── ListSeasonsByContent ─────────────────────────────────────────────────────

func TestListSeasonsByContent_TrimsContentID(t *testing.T) {
	var capturedID string
	repo := &mockContentRepo{
		listSeasonsByContentFn: func(_ context.Context, contentID string) ([]domain.Season, error) {
			capturedID = contentID
			return []domain.Season{{ID: "s1", ContentID: contentID, Number: 1}}, nil
		},
	}
	svc := application.New(repo)
	seasons, err := svc.ListSeasonsByContent(context.Background(), "  content-1  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedID != "content-1" {
		t.Errorf("expected trimmed ID 'content-1', got %q", capturedID)
	}
	if len(seasons) != 1 {
		t.Errorf("expected 1 season, got %d", len(seasons))
	}
}

// ─── CreateEpisodeBatch ───────────────────────────────────────────────────────

func TestCreateEpisodeBatch_TrimsFields(t *testing.T) {
	var capturedBatch domain.EpisodeBatch
	repo := &mockContentRepo{
		createEpisodeBatchFn: func(_ context.Context, contentID string, batch domain.EpisodeBatch, actor string) ([]domain.Episode, error) {
			capturedBatch = batch
			return batch.Episodes, nil
		},
	}
	svc := application.New(repo)
	batch := domain.EpisodeBatch{
		SeasonNumber:      1,
		SeasonTitle:       "  Season 1  ",
		SeasonDescription: "  First season  ",
		Episodes: []domain.Episode{
			{Title: "  Pilot  ", Synopsis: "  Synopsis  ", VideoURL: "  url  "},
		},
	}
	eps, err := svc.CreateEpisodeBatch(context.Background(), "  c1  ", batch, "  admin  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedBatch.SeasonTitle != "Season 1" {
		t.Errorf("expected trimmed SeasonTitle, got %q", capturedBatch.SeasonTitle)
	}
	if len(eps) != 1 {
		t.Errorf("expected 1 episode, got %d", len(eps))
	}
	if capturedBatch.Episodes[0].Title != "Pilot" {
		t.Errorf("expected trimmed episode title 'Pilot', got %q", capturedBatch.Episodes[0].Title)
	}
}

// ─── ListAudit ────────────────────────────────────────────────────────────────

func TestListAudit_DefaultLimit(t *testing.T) {
	var capturedLimit int
	repo := &mockContentRepo{
		listAuditFn: func(_ context.Context, limit int) ([]domain.AuditEntry, error) {
			capturedLimit = limit
			return []domain.AuditEntry{}, nil
		},
	}
	svc := application.New(repo)

	// limit = 0 debe usar default 100
	svc.ListAudit(context.Background(), 0)
	if capturedLimit != 100 {
		t.Errorf("expected default limit 100 for 0, got %d", capturedLimit)
	}

	// limit negativo debe usar default 100
	svc.ListAudit(context.Background(), -1)
	if capturedLimit != 100 {
		t.Errorf("expected default limit 100 for -1, got %d", capturedLimit)
	}

	// limit > 500 debe usar default 100
	svc.ListAudit(context.Background(), 501)
	if capturedLimit != 100 {
		t.Errorf("expected default limit 100 for 501, got %d", capturedLimit)
	}
}

func TestListAudit_ValidLimit(t *testing.T) {
	var capturedLimit int
	repo := &mockContentRepo{
		listAuditFn: func(_ context.Context, limit int) ([]domain.AuditEntry, error) {
			capturedLimit = limit
			return []domain.AuditEntry{}, nil
		},
	}
	svc := application.New(repo)
	svc.ListAudit(context.Background(), 50)
	if capturedLimit != 50 {
		t.Errorf("expected limit 50, got %d", capturedLimit)
	}
}

func TestListAudit_BoundaryLimit500(t *testing.T) {
	var capturedLimit int
	repo := &mockContentRepo{
		listAuditFn: func(_ context.Context, limit int) ([]domain.AuditEntry, error) {
			capturedLimit = limit
			return []domain.AuditEntry{}, nil
		},
	}
	svc := application.New(repo)
	svc.ListAudit(context.Background(), 500)
	if capturedLimit != 500 {
		t.Errorf("expected limit 500 to be accepted, got %d", capturedLimit)
	}
}

// ─── Alertas de publicacion ──────────────────────────────────────────────────

func TestListPendingPublicationAlerts_DefaultLimit(t *testing.T) {
	var capturedLimit int
	repo := &mockContentRepo{
		listPendingAlertsFn: func(_ context.Context, limit int) ([]domain.Content, error) {
			capturedLimit = limit
			return sampleContents(), nil
		},
	}
	svc := application.New(repo)
	_, err := svc.ListPendingPublicationAlerts(context.Background(), 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedLimit != 50 {
		t.Errorf("expected default limit 50, got %d", capturedLimit)
	}
}

func TestMarkPublicationAlertSent_TrimsContentID(t *testing.T) {
	var capturedID string
	repo := &mockContentRepo{
		markAlertSentFn: func(_ context.Context, contentID string) error {
			capturedID = contentID
			return nil
		},
	}
	svc := application.New(repo)
	err := svc.MarkPublicationAlertSent(context.Background(), "  content-1  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if capturedID != "content-1" {
		t.Errorf("expected trimmed content ID, got %q", capturedID)
	}
}
