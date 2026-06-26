package catalog

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"quetzaltv/services/streaming/internal/domain"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

type listResponse struct {
	Contents []contentResponse `json:"contenidos"`
}

type detailResponse struct {
	Detail contentDetailResponse `json:"detalle"`
}

type ratingsResponse struct {
	Ratings []ratingResponse `json:"calificaciones"`
}

type contentResponse struct {
	ID                string  `json:"id"`
	Title             string  `json:"titulo"`
	Type              string  `json:"tipo"`
	Synopsis          string  `json:"sinopsis"`
	Language          string  `json:"idioma"`
	PosterURL         string  `json:"url_portada"`
	TrailerURL        string  `json:"url_trailer"`
	ReleaseDate       string  `json:"fecha_lanzamiento"`
	RecommendationPct float64 `json:"porcentaje_recomendacion"`
}

type contentDetailResponse struct {
	contentResponse
	TechnicalSheet string          `json:"ficha_tecnica"`
	Genres         []genreResponse `json:"generos"`
}

type genreResponse struct {
	Name string `json:"nombre"`
}

type ratingResponse struct {
	ContentID string `json:"contenido_id"`
	Reaction  string `json:"reaccion"`
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *Client) ListContent(ctx context.Context) ([]domain.CatalogContent, error) {
	var response listResponse
	if err := c.getJSON(ctx, "/api/v1/catalog", &response); err != nil {
		return nil, err
	}

	contents := make([]domain.CatalogContent, 0, len(response.Contents))
	for _, content := range response.Contents {
		contents = append(contents, mapContent(content, nil))
	}
	return contents, nil
}

func (c *Client) GetContentDetail(ctx context.Context, contentID string) (*domain.CatalogContent, error) {
	var response detailResponse
	if err := c.getJSON(ctx, "/api/v1/catalog/"+contentID, &response); err != nil {
		return nil, err
	}

	genres := make([]string, 0, len(response.Detail.Genres))
	for _, genre := range response.Detail.Genres {
		if strings.TrimSpace(genre.Name) != "" {
			genres = append(genres, strings.TrimSpace(genre.Name))
		}
	}
	genres = append(genres, parseTechnicalSheetGenres(response.Detail.TechnicalSheet)...)

	content := mapContent(response.Detail.contentResponse, genres)
	return &content, nil
}

func parseTechnicalSheetGenres(sheet string) []string {
	for _, rawPart := range strings.FieldsFunc(sheet, func(r rune) bool {
		return r == '\n' || r == '|'
	}) {
		part := strings.TrimSpace(rawPart)
		if part == "" {
			continue
		}

		key, value, found := strings.Cut(part, ":")
		if !found {
			continue
		}

		normalizedKey := strings.ToLower(strings.TrimSpace(key))
		if normalizedKey != "genero" && normalizedKey != "generos" {
			continue
		}

		rawGenres := strings.Split(value, ",")
		genres := make([]string, 0, len(rawGenres))
		for _, genre := range rawGenres {
			if trimmed := strings.TrimSpace(genre); trimmed != "" {
				genres = append(genres, trimmed)
			}
		}
		return genres
	}

	return nil
}

func (c *Client) ListRatingsByProfile(ctx context.Context, profileID string) ([]domain.ProfileRating, error) {
	var response ratingsResponse
	if err := c.getJSON(ctx, "/api/v1/catalog/profile/"+profileID+"/ratings", &response); err != nil {
		return nil, err
	}

	ratings := make([]domain.ProfileRating, 0, len(response.Ratings))
	for _, rating := range response.Ratings {
		ratings = append(ratings, domain.ProfileRating{
			ContentID: rating.ContentID,
			Reaction:  rating.Reaction,
		})
	}
	return ratings, nil
}

func (c *Client) getJSON(ctx context.Context, path string, target any) error {
	if c.baseURL == "" {
		return fmt.Errorf("catalog base URL is empty")
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return err
	}

	response, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("catalog request failed with status %d", response.StatusCode)
	}

	return json.NewDecoder(response.Body).Decode(target)
}

func mapContent(content contentResponse, genres []string) domain.CatalogContent {
	return domain.CatalogContent{
		ID:                content.ID,
		Title:             content.Title,
		Type:              content.Type,
		Synopsis:          content.Synopsis,
		Language:          content.Language,
		PosterURL:         content.PosterURL,
		TrailerURL:        content.TrailerURL,
		ReleaseDate:       content.ReleaseDate,
		RecommendationPct: content.RecommendationPct,
		Genres:            genres,
	}
}
