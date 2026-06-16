package gcs

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/storage"
)

// Uploader genera URLs firmadas V4 para que el cliente suba trailers directamente a GCS.
type Uploader struct {
	client     *storage.Client
	bucketName string
	folder     string
	ttl        time.Duration
}

func NewUploader(client *storage.Client, bucketName, folder string, ttl time.Duration) *Uploader {
	return &Uploader{
		client:     client,
		bucketName: bucketName,
		folder:     folder,
		ttl:        ttl,
	}
}

// UploadSignedURL genera una URL firmada V4 con método PUT para que el admin
// suba el trailer directamente desde el browser/cliente a GCS.
// El objeto resultante será: <folder>/<contentID>.mp4
func (u *Uploader) UploadSignedURL(ctx context.Context, contentID string) (objectName string, signedURL string, err error) {
	objectName = fmt.Sprintf("%s/%s.mp4", u.folder, contentID)

	opts := &storage.SignedURLOptions{
		Method:      "PUT",
		Expires:     time.Now().Add(u.ttl),
		Scheme:      storage.SigningSchemeV4,
		ContentType: "video/mp4",
	}

	signedURL, err = u.client.Bucket(u.bucketName).SignedURL(objectName, opts)
	if err != nil {
		return "", "", fmt.Errorf("no se pudo generar la URL de subida: %w", err)
	}

	return objectName, signedURL, nil
}

// EpisodeSignedURL genera una URL firmada V4 con método PUT para que el admin
// suba el video de un episodio directamente a GCS.
// El objeto resultante será: episodes/<episodeKey>.mp4
func (u *Uploader) EpisodeSignedURL(ctx context.Context, episodeKey string) (objectName string, signedURL string, err error) {
	objectName = fmt.Sprintf("episodes/%s.mp4", episodeKey)

	opts := &storage.SignedURLOptions{
		Method:      "PUT",
		Expires:     time.Now().Add(u.ttl),
		Scheme:      storage.SigningSchemeV4,
		ContentType: "video/mp4",
	}

	signedURL, err = u.client.Bucket(u.bucketName).SignedURL(objectName, opts)
	if err != nil {
		return "", "", fmt.Errorf("no se pudo generar la URL de subida del episodio: %w", err)
	}

	return objectName, signedURL, nil
}
