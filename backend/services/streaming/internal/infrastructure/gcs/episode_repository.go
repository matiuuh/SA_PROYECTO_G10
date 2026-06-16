package gcs

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/storage"
	"quetzaltv/services/streaming/internal/domain"
)

// EpisodeRepository genera URLs firmadas para videos de episodios almacenados en GCS.
type EpisodeRepository struct {
	client     *storage.Client
	bucketName string
	ttl        time.Duration
}

func NewEpisodeRepository(client *storage.Client, bucketName string, ttl time.Duration) *EpisodeRepository {
	return &EpisodeRepository{
		client:     client,
		bucketName: bucketName,
		ttl:        ttl,
	}
}

// GetEpisodeSignedURL genera una URL firmada V4 para el video del episodio indicado.
// objectName es la ruta completa en el bucket, ej: episodes/<key>.mp4
func (r *EpisodeRepository) GetEpisodeSignedURL(ctx context.Context, objectName string) (string, error) {
	opts := &storage.SignedURLOptions{
		Method:  "GET",
		Expires: time.Now().Add(r.ttl),
		Scheme:  storage.SigningSchemeV4,
	}

	url, err := r.client.Bucket(r.bucketName).SignedURL(objectName, opts)
	if err != nil {
		return "", fmt.Errorf("%w: %v", domain.ErrEpisodeNotFound, err)
	}

	return url, nil
}
