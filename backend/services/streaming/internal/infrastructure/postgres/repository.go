package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"quetzaltv/services/streaming/internal/domain"
)

type PlaybackRepository struct {
	db *pgxpool.Pool
}

func NewPlaybackRepository(db *pgxpool.Pool) *PlaybackRepository {
	return &PlaybackRepository{db: db}
}

// ─── Upsert ───────────────────────────────────────────────────────────────────

func (r *PlaybackRepository) Upsert(
	ctx context.Context,
	h *domain.PlaybackHistory,
	totalDuration int,
) (domain.PlaybackState, error) {
	// episodio_id puede ser NULL (peliculas)
	var episodeID *string
	if h.EpisodeID != "" {
		episodeID = &h.EpisodeID
	}

	_, err := r.db.Exec(ctx,
		"CALL sp_upsert_progreso($1, $2, $3, $4, $5)",
		h.ProfileID, h.ContentID, episodeID, h.ProgressSeconds, totalDuration,
	)
	if err != nil {
		return "", err
	}

	// Releer el estado resultante
	var stateStr string
	err = r.db.QueryRow(ctx, `
		SELECT estado::text FROM historial_reproduccion
		WHERE perfil_id = $1 AND contenido_id = $2
		  AND (episodio_id = $3 OR (episodio_id IS NULL AND $3 IS NULL))
	`, h.ProfileID, h.ContentID, episodeID).Scan(&stateStr)
	if err != nil {
		return "", err
	}
	return domain.PlaybackState(stateStr), nil
}

// ─── GetProgress ──────────────────────────────────────────────────────────────

func (r *PlaybackRepository) GetProgress(
	ctx context.Context,
	profileID, contentID, episodeID string,
) (*domain.PlaybackHistory, error) {
	var episodeParam *string
	if episodeID != "" {
		episodeParam = &episodeID
	}

	var h domain.PlaybackHistory
	var stateStr string
	var epID *string

	err := r.db.QueryRow(ctx, `
		SELECT id, perfil_id, contenido_id, episodio_id,
		       estado::text, progreso_segundos, actualizado_en
		FROM historial_reproduccion
		WHERE perfil_id = $1 AND contenido_id = $2
		  AND (episodio_id = $3 OR (episodio_id IS NULL AND $3 IS NULL))
	`, profileID, contentID, episodeParam).Scan(
		&h.ID, &h.ProfileID, &h.ContentID, &epID,
		&stateStr, &h.ProgressSeconds, &h.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrHistoryNotFound
	}
	if err != nil {
		return nil, err
	}

	h.State = domain.PlaybackState(stateStr)
	if epID != nil {
		h.EpisodeID = *epID
	}
	return &h, nil
}

// ─── GetHistory ───────────────────────────────────────────────────────────────

func (r *PlaybackRepository) GetHistory(
	ctx context.Context,
	profileID string,
	limit int,
) ([]domain.PlaybackHistory, error) {
	query := `
		SELECT id, perfil_id, contenido_id,
		       COALESCE(episodio_id::text, ''),
		       estado::text, progreso_segundos, actualizado_en
		FROM v_historial_reciente
		WHERE perfil_id = $1
	`
	args := []any{profileID}

	if limit > 0 {
		query += " LIMIT $2"
		args = append(args, limit)
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []domain.PlaybackHistory
	for rows.Next() {
		var h domain.PlaybackHistory
		var stateStr string
		if err := rows.Scan(
			&h.ID, &h.ProfileID, &h.ContentID, &h.EpisodeID,
			&stateStr, &h.ProgressSeconds, &h.UpdatedAt,
		); err != nil {
			return nil, err
		}
		h.State = domain.PlaybackState(stateStr)
		history = append(history, h)
	}
	return history, rows.Err()
}
