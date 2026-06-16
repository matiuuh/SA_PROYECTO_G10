package gcs

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/storage"
	"quetzaltv/services/streaming/internal/domain"
)

// TrailerRepository genera URLs firmadas para trailers almacenados en GCS.
type TrailerRepository struct {
	client     *storage.Client
	bucketName string
	folder     string
	ttl        time.Duration
}

func NewTrailerRepository(client *storage.Client, bucketName, folder string, ttl time.Duration) *TrailerRepository {
	return &TrailerRepository{
		client:     client,
		bucketName: bucketName,
		folder:     folder,
		ttl:        ttl,
	}
}

// GetSignedURL genera una URL firmada V4 para el trailer del contenido indicado.
// El objeto esperado en GCS es: <folder>/<contentID>.mp4
func (r *TrailerRepository) GetSignedURL(ctx context.Context, contentID string) (string, error) {
	objectName := fmt.Sprintf("%s/%s.mp4", r.folder, contentID)

	opts := &storage.SignedURLOptions{
		Method:  "GET",
		Expires: time.Now().Add(r.ttl),
		Scheme:  storage.SigningSchemeV4,
	}

	url, err := r.client.Bucket(r.bucketName).SignedURL(objectName, opts)
	if err != nil {
		return "", fmt.Errorf("%w: %v", domain.ErrTrailerNotFound, err)
	}

	return url, nil
}
