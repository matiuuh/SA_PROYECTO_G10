package application

import (
	"context"
	"sort"
	"strings"

	"quetzaltv/services/streaming/internal/domain"
)

type contentBasedRecommender struct{}

func (contentBasedRecommender) Recommend(
	ctx context.Context,
	catalog []domain.CatalogContent,
	history []domain.PlaybackHistory,
	ratings []domain.ProfileRating,
	details domain.CatalogRecommendationRepository,
	limit int,
) ([]domain.Recommendation, error) {
	watched := make(map[string]struct{}, len(history))
	ratingByContent := make(map[string]string, len(ratings))
	for _, rating := range ratings {
		ratingByContent[rating.ContentID] = strings.ToLower(strings.TrimSpace(rating.Reaction))
	}

	genreWeights := map[string]float64{}
	for index, item := range history {
		watched[item.ContentID] = struct{}{}
		detail, err := details.GetContentDetail(ctx, item.ContentID)
		if err != nil || detail == nil {
			continue
		}

		weight := 1.0 / (1.0 + float64(index)*0.15)
		if item.State == domain.PlaybackFinished {
			weight += 0.75
		}
		if item.ProgressSeconds > 0 {
			weight += 0.25
		}

		switch ratingByContent[item.ContentID] {
		case "like":
			weight += 1.25
		case "dislike":
			weight -= 1.50
		}

		for _, genre := range detail.Genres {
			key := normalizeGenre(genre)
			if key != "" {
				genreWeights[key] += weight
			}
		}
	}

	for _, rating := range ratings {
		if _, alreadySeen := watched[rating.ContentID]; alreadySeen {
			continue
		}
		detail, err := details.GetContentDetail(ctx, rating.ContentID)
		if err != nil || detail == nil {
			continue
		}

		weight := 0.75
		if strings.EqualFold(rating.Reaction, "dislike") {
			weight = -0.75
		}
		for _, genre := range detail.Genres {
			key := normalizeGenre(genre)
			if key != "" {
				genreWeights[key] += weight
			}
		}
	}

	recommendations := make([]domain.Recommendation, 0, len(catalog))
	for _, content := range catalog {
		if _, alreadyWatched := watched[content.ID]; alreadyWatched {
			continue
		}

		detail := content
		if len(detail.Genres) == 0 {
			fetched, err := details.GetContentDetail(ctx, content.ID)
			if err == nil && fetched != nil {
				detail = *fetched
			}
		}

		score, reason := scoreCandidate(detail, genreWeights)
		if score <= 0 && len(genreWeights) > 0 {
			continue
		}
		if reason == "" {
			reason = "Popular en el catalogo"
		}

		recommendations = append(recommendations, domain.Recommendation{
			CatalogContent: detail,
			Score:          score,
			Reason:         reason,
		})
	}

	sort.SliceStable(recommendations, func(i, j int) bool {
		if recommendations[i].Score == recommendations[j].Score {
			return recommendations[i].RecommendationPct > recommendations[j].RecommendationPct
		}
		return recommendations[i].Score > recommendations[j].Score
	})

	if len(recommendations) > limit {
		recommendations = recommendations[:limit]
	}

	return recommendations, nil
}

func scoreCandidate(content domain.CatalogContent, genreWeights map[string]float64) (float64, string) {
	score := content.RecommendationPct / 100.0
	bestGenre := ""
	bestGenreScore := 0.0

	for _, genre := range content.Genres {
		key := normalizeGenre(genre)
		genreScore := genreWeights[key]
		score += genreScore * 2
		if genreScore > bestGenreScore {
			bestGenreScore = genreScore
			bestGenre = genre
		}
	}

	if bestGenre != "" {
		return score, "Porque viste contenido de " + bestGenre
	}
	return score, ""
}

func normalizeGenre(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}
