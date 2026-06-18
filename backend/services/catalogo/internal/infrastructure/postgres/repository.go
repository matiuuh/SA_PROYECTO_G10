package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"quetzaltv/services/catalogo/internal/domain"
)

type ContentRepository struct {
	db     *pgxpool.Pool
	userDB *pgxpool.Pool
}

func NewContentRepository(db *pgxpool.Pool) *ContentRepository {
	return &ContentRepository{db: db}
}

func NewContentRepositoryWithUserDB(db *pgxpool.Pool, userDB *pgxpool.Pool) *ContentRepository {
	return &ContentRepository{db: db, userDB: userDB}
}

func (r *ContentRepository) List(ctx context.Context) ([]domain.Content, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, titulo, tipo::text, sinopsis, idioma,
		       url_portada, url_trailer,
		       fecha_lanzamiento, porcentaje_recomendacion
		FROM v_cartelera_contenido
		WHERE fecha_lanzamiento IS NULL OR fecha_lanzamiento <= CURRENT_DATE
		ORDER BY titulo
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanContentRows(rows)
}

func (r *ContentRepository) ListAll(ctx context.Context) ([]domain.Content, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, titulo, tipo::text, sinopsis, idioma,
		       url_portada, url_trailer,
		       fecha_lanzamiento, fn_porcentaje_recomendacion(id) AS porcentaje_recomendacion
		FROM contenidos
		WHERE eliminado_en IS NULL
		ORDER BY fecha_lanzamiento NULLS FIRST, titulo
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanContentRows(rows)
}

func (r *ContentRepository) Search(ctx context.Context, query string) ([]domain.Content, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, titulo, tipo::text, sinopsis, idioma,
		       url_portada, url_trailer,
		       fecha_lanzamiento, porcentaje_recomendacion
		FROM v_cartelera_contenido
		WHERE titulo ILIKE $1
		  AND (fecha_lanzamiento IS NULL OR fecha_lanzamiento <= CURRENT_DATE)
		ORDER BY titulo
	`, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanContentRows(rows)
}

func (r *ContentRepository) FilterByGenres(ctx context.Context, genreIDs []int64) ([]domain.Content, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT v.id, v.titulo, v.tipo::text, v.sinopsis, v.idioma,
		       v.url_portada, v.url_trailer,
		       v.fecha_lanzamiento, v.porcentaje_recomendacion
		FROM v_cartelera_contenido v
		JOIN contenido_generos cg ON cg.contenido_id = v.id
		WHERE cg.genero_id = ANY($1)
		  AND (v.fecha_lanzamiento IS NULL OR v.fecha_lanzamiento <= CURRENT_DATE)
		ORDER BY v.titulo
	`, genreIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanContentRows(rows)
}

func (r *ContentRepository) GetDetail(ctx context.Context, id string) (*domain.ContentDetail, error) {
	var detail domain.ContentDetail
	var contentType string
	var releaseDate pgtype.Date
	var durationMinutes pgtype.Int4

	err := r.db.QueryRow(ctx, `
		SELECT id, titulo, tipo::text, sinopsis, ficha_tecnica,
		       fecha_lanzamiento, clasificacion_edad, duracion_minutos,
		       idioma, url_portada, url_trailer,
		       total_likes, total_dislikes, porcentaje_recomendacion
		FROM v_detalle_contenido
		WHERE id = $1
	`, id).Scan(
		&detail.ID, &detail.Title, &contentType, &detail.Synopsis, &detail.TechnicalSheet,
		&releaseDate, &detail.AgeRating, &durationMinutes,
		&detail.Language, &detail.PosterURL, &detail.TrailerURL,
		&detail.TotalLikes, &detail.TotalDislikes, &detail.RecommendationPct,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrContentNotFound
	}
	if err != nil {
		return nil, err
	}

	detail.Type = domain.ContentType(contentType)
	if releaseDate.Valid {
		t := releaseDate.Time
		detail.ReleaseDate = &t
	}
	if durationMinutes.Valid {
		value := int(durationMinutes.Int32)
		detail.DurationMinutes = &value
	}

	genreRows, err := r.db.Query(ctx, `
		SELECT g.id, g.nombre, COALESCE(g.descripcion, '')
		FROM generos g
		JOIN contenido_generos cg ON cg.genero_id = g.id
		WHERE cg.contenido_id = $1
		ORDER BY g.nombre
	`, id)
	if err != nil {
		return nil, err
	}
	defer genreRows.Close()

	for genreRows.Next() {
		var genre domain.Genre
		if err := genreRows.Scan(&genre.ID, &genre.Name, &genre.Description); err != nil {
			return nil, err
		}
		detail.Genres = append(detail.Genres, genre)
	}

	castRows, err := r.db.Query(ctx, `
		SELECT reparto_id, nombre_artistico,
		       COALESCE(nombre_real, ''), COALESCE(nacionalidad, ''), COALESCE(personaje, '')
		FROM v_ficha_actores
		WHERE contenido_id = $1
		ORDER BY nombre_artistico
	`, id)
	if err != nil {
		return nil, err
	}
	defer castRows.Close()

	for castRows.Next() {
		var member domain.CastMember
		if err := castRows.Scan(&member.ID, &member.ArtisticName, &member.RealName, &member.Nationality, &member.Character); err != nil {
			return nil, err
		}
		detail.Cast = append(detail.Cast, member)
	}

	return &detail, nil
}

func (r *ContentRepository) ExistsByTitleAndType(ctx context.Context, title string, contentType domain.ContentType) (bool, error) {
	var exists bool

	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM contenidos
			WHERE eliminado_en IS NULL
			  AND LOWER(TRIM(titulo)) = LOWER(TRIM($1))
			  AND tipo = $2::tipo_contenido
		)
	`, title, string(contentType)).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

func (r *ContentRepository) Create(ctx context.Context, content *domain.Content, genreIDs []int64) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err = setAuditUser(ctx, tx, content.CreatedByAccountID); err != nil {
		return "", err
	}

	var newID string

	var releaseDate *time.Time
	if content.ReleaseDate != nil {
		releaseDate = content.ReleaseDate
	}

	var createdBy any
	if content.CreatedByAccountID != "" {
		createdBy = content.CreatedByAccountID
	}

	row := tx.QueryRow(ctx, `
		CALL sp_registrar_contenido_completo(
			$1, $2::tipo_contenido, $3, $4,
			$5, $6, $7, $8, $9, $10,
			$11, $12, NULL
		)
	`,
		content.Title, string(content.Type), content.Synopsis, content.TechnicalSheet,
		releaseDate, content.AgeRating, content.DurationMinutes, content.Language,
		content.PosterURL, content.TrailerURL,
		createdBy, genreIDs,
	)
	if err := row.Scan(&newID); err != nil {
		return "", err
	}
	if err = tx.Commit(ctx); err != nil {
		return "", err
	}
	return newID, nil
}

func (r *ContentRepository) Update(ctx context.Context, id string, content *domain.Content, actorAccountID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err = setAuditUser(ctx, tx, actorAccountID); err != nil {
		return err
	}

	tag, err := tx.Exec(ctx, `
		UPDATE contenidos
		SET titulo             = $2,
		    sinopsis           = $3,
		    ficha_tecnica      = $4,
		    fecha_lanzamiento  = $5,
		    clasificacion_edad = $6,
		    duracion_minutos   = $7,
		    idioma             = $8,
		    url_portada        = $9,
		    url_trailer        = $10
		WHERE id = $1 AND eliminado_en IS NULL
	`, id, content.Title, content.Synopsis, content.TechnicalSheet,
		content.ReleaseDate, content.AgeRating, content.DurationMinutes, content.Language, content.PosterURL, content.TrailerURL,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrContentNotFound
	}
	return tx.Commit(ctx)
}

func (r *ContentRepository) Delete(ctx context.Context, id string, actorAccountID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err = setAuditUser(ctx, tx, actorAccountID); err != nil {
		return err
	}

	tag, err := tx.Exec(ctx, `
		UPDATE contenidos SET eliminado_en = NOW()
		WHERE id = $1 AND eliminado_en IS NULL
	`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrContentNotFound
	}
	return tx.Commit(ctx)
}

func (r *ContentRepository) Rate(ctx context.Context, rating *domain.Rating) (float64, error) {
	_, err := r.db.Exec(ctx,
		"CALL sp_calificar_contenido($1, $2, $3::tipo_reaccion)",
		rating.ContentID, rating.ProfileID, string(rating.Reaction),
	)
	if err != nil {
		return 0, err
	}

	var pct float64
	err = r.db.QueryRow(ctx,
		"SELECT fn_porcentaje_recomendacion($1)", rating.ContentID,
	).Scan(&pct)
	return pct, err
}

func (r *ContentRepository) ListSeasonsByContent(ctx context.Context, contentID string) ([]domain.Season, error) {
	var contentType string
	err := r.db.QueryRow(ctx, `
		SELECT tipo::text
		FROM contenidos
		WHERE id = $1 AND eliminado_en IS NULL
	`, contentID).Scan(&contentType)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrContentNotFound
	}
	if err != nil {
		return nil, err
	}
	if domain.ContentType(contentType) != domain.ContentTypeSeries {
		return nil, domain.ErrInvalidSeriesContent
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			t.id,
			t.contenido_id,
			t.numero_temporada,
			COALESCE(t.titulo, ''),
			COALESCE(t.descripcion, ''),
			e.id,
			e.temporada_id,
			e.numero_episodio,
			e.titulo,
			COALESCE(e.sinopsis, ''),
			e.duracion_minutos,
			e.url_video
		FROM temporadas t
		LEFT JOIN episodios e
			ON e.temporada_id = t.id
		   AND e.eliminado_en IS NULL
		WHERE t.contenido_id = $1
		  AND t.eliminado_en IS NULL
		ORDER BY t.numero_temporada, e.numero_episodio
	`, contentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	seasons := make([]domain.Season, 0)
	seasonIndex := make(map[string]int)
	for rows.Next() {
		var (
			seasonID      string
			seasonContent string
			seasonNumber  int16
			seasonTitle   string
			seasonDesc    string
			episodeID     *string
			episodeSeason *string
			episodeNumber *int16
			episodeTitle  *string
			episodeSyn    *string
			episodeDur    *int32
			episodeURL    *string
		)

		if err := rows.Scan(
			&seasonID,
			&seasonContent,
			&seasonNumber,
			&seasonTitle,
			&seasonDesc,
			&episodeID,
			&episodeSeason,
			&episodeNumber,
			&episodeTitle,
			&episodeSyn,
			&episodeDur,
			&episodeURL,
		); err != nil {
			return nil, err
		}

		idx, exists := seasonIndex[seasonID]
		if !exists {
			seasons = append(seasons, domain.Season{
				ID:          seasonID,
				ContentID:   seasonContent,
				Number:      int(seasonNumber),
				Title:       seasonTitle,
				Description: seasonDesc,
				Episodes:    []domain.Episode{},
			})
			idx = len(seasons) - 1
			seasonIndex[seasonID] = idx
		}

		if episodeID != nil && episodeSeason != nil && episodeNumber != nil && episodeTitle != nil && episodeDur != nil && episodeURL != nil {
			seasons[idx].Episodes = append(seasons[idx].Episodes, domain.Episode{
				ID:              *episodeID,
				SeasonID:        *episodeSeason,
				Number:          int(*episodeNumber),
				Title:           *episodeTitle,
				Synopsis:        valueOrEmpty(episodeSyn),
				DurationMinutes: int(*episodeDur),
				VideoURL:        *episodeURL,
			})
		}
	}

	return seasons, rows.Err()
}

func (r *ContentRepository) CreateEpisodeBatch(ctx context.Context, contentID string, batch domain.EpisodeBatch, actorAccountID string) ([]domain.Episode, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err = setAuditUser(ctx, tx, actorAccountID); err != nil {
		return nil, err
	}

	var contentType string
	err = tx.QueryRow(ctx, `
		SELECT tipo::text
		FROM contenidos
		WHERE id = $1 AND eliminado_en IS NULL
	`, contentID).Scan(&contentType)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrContentNotFound
	}
	if err != nil {
		return nil, err
	}
	if domain.ContentType(contentType) != domain.ContentTypeSeries {
		return nil, domain.ErrInvalidSeriesContent
	}

	var seasonID string
	err = tx.QueryRow(ctx, `
		INSERT INTO temporadas (contenido_id, numero_temporada, titulo, descripcion)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''))
		ON CONFLICT (contenido_id, numero_temporada)
		DO UPDATE SET
			titulo = COALESCE(NULLIF(EXCLUDED.titulo, ''), temporadas.titulo),
			descripcion = COALESCE(NULLIF(EXCLUDED.descripcion, ''), temporadas.descripcion),
			actualizado_en = NOW(),
			eliminado_en = NULL
		RETURNING id
	`, contentID, batch.SeasonNumber, batch.SeasonTitle, batch.SeasonDescription).Scan(&seasonID)
	if err != nil {
		return nil, err
	}

	createdEpisodes := make([]domain.Episode, 0, len(batch.Episodes))
	for _, episode := range batch.Episodes {
		var created domain.Episode
		var episodeNumber int16

		err = tx.QueryRow(ctx, `
			INSERT INTO episodios (
				temporada_id,
				numero_episodio,
				titulo,
				sinopsis,
				duracion_minutos,
				url_video
			)
			VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6)
			ON CONFLICT (temporada_id, numero_episodio)
			DO UPDATE SET
				titulo = EXCLUDED.titulo,
				sinopsis = EXCLUDED.sinopsis,
				duracion_minutos = EXCLUDED.duracion_minutos,
				url_video = EXCLUDED.url_video,
				actualizado_en = NOW(),
				eliminado_en = NULL
			RETURNING id, temporada_id, numero_episodio, titulo, COALESCE(sinopsis, ''), duracion_minutos, url_video
		`, seasonID, episode.Number, episode.Title, episode.Synopsis, episode.DurationMinutes, episode.VideoURL).Scan(
			&created.ID,
			&created.SeasonID,
			&episodeNumber,
			&created.Title,
			&created.Synopsis,
			&created.DurationMinutes,
			&created.VideoURL,
		)
		if err != nil {
			return nil, err
		}

		created.Number = int(episodeNumber)
		createdEpisodes = append(createdEpisodes, created)
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return createdEpisodes, nil
}

func (r *ContentRepository) ListAudit(ctx context.Context, limit int) ([]domain.AuditEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			id::text,
			tabla_origen,
			entidad_id::text,
			CASE
				WHEN evento = 'actualizacion'
				 AND estado_anterior->>'eliminado_en' IS NULL
				 AND estado_nuevo->>'eliminado_en' IS NOT NULL
				THEN 'eliminacion'
				ELSE evento::text
			END AS evento,
			estado_anterior,
			CASE
				WHEN evento = 'actualizacion'
				 AND estado_anterior->>'eliminado_en' IS NULL
				 AND estado_nuevo->>'eliminado_en' IS NOT NULL
				THEN NULL
				ELSE estado_nuevo
			END AS estado_nuevo,
			COALESCE(usuario_accion::text, ''),
			fecha_evento
		FROM instantaneas
		ORDER BY fecha_evento DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]domain.AuditEntry, 0)
	for rows.Next() {
		var entry domain.AuditEntry
		var previousState []byte
		var newState []byte
		if err := rows.Scan(
			&entry.ID,
			&entry.TableName,
			&entry.EntityID,
			&entry.Event,
			&previousState,
			&newState,
			&entry.UserID,
			&entry.CreatedAt,
		); err != nil {
			return nil, err
		}
		entry.PreviousState = normalizeJSON(previousState)
		entry.NewState = normalizeJSON(newState)
		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	r.resolveAuditUserEmails(ctx, entries)
	return entries, nil
}

func (r *ContentRepository) ListPendingPublicationAlerts(ctx context.Context, limit int) ([]domain.Content, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, titulo, tipo::text, sinopsis, idioma,
		       url_portada, url_trailer,
		       fecha_lanzamiento, fn_porcentaje_recomendacion(id) AS porcentaje_recomendacion
		FROM contenidos
		WHERE eliminado_en IS NULL
		  AND alerta_publicacion_enviada_en IS NULL
		  AND (fecha_lanzamiento IS NULL OR fecha_lanzamiento <= CURRENT_DATE)
		ORDER BY fecha_lanzamiento NULLS FIRST, creado_en
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanContentRows(rows)
}

func (r *ContentRepository) MarkPublicationAlertSent(ctx context.Context, contentID string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE contenidos
		SET alerta_publicacion_enviada_en = COALESCE(alerta_publicacion_enviada_en, NOW())
		WHERE id = $1
		  AND eliminado_en IS NULL
		  AND alerta_publicacion_enviada_en IS NULL
	`, contentID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrContentNotFound
	}
	return nil
}

func (r *ContentRepository) resolveAuditUserEmails(ctx context.Context, entries []domain.AuditEntry) {
	if r.userDB == nil || len(entries) == 0 {
		return
	}

	userIDs := make([]string, 0, len(entries))
	seen := make(map[string]struct{})
	for _, entry := range entries {
		if entry.UserID == "" {
			continue
		}
		if _, ok := seen[entry.UserID]; ok {
			continue
		}
		seen[entry.UserID] = struct{}{}
		userIDs = append(userIDs, entry.UserID)
	}
	if len(userIDs) == 0 {
		return
	}

	rows, err := r.userDB.Query(ctx, `
		SELECT id::text, correo
		FROM usuarios.cuentas
		WHERE id::text = ANY($1)
	`, userIDs)
	if err != nil {
		return
	}
	defer rows.Close()

	emailsByID := make(map[string]string)
	for rows.Next() {
		var id string
		var email string
		if err := rows.Scan(&id, &email); err != nil {
			return
		}
		emailsByID[id] = email
	}
	if rows.Err() != nil {
		return
	}

	for i := range entries {
		if email := emailsByID[entries[i].UserID]; email != "" {
			entries[i].UserID = email
		}
	}
}

func setAuditUser(ctx context.Context, tx pgx.Tx, actorAccountID string) error {
	if actorAccountID == "" {
		return nil
	}
	_, err := tx.Exec(ctx, "SELECT set_config('app.usuario_accion', $1, true)", actorAccountID)
	return err
}

func normalizeJSON(raw []byte) json.RawMessage {
	if len(raw) == 0 {
		return nil
	}
	return json.RawMessage(raw)
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func scanContentRows(rows pgx.Rows) ([]domain.Content, error) {
	var contents []domain.Content
	for rows.Next() {
		var content domain.Content
		var contentType string
		var releaseDate pgtype.Date
		var pct pgtype.Numeric

		if err := rows.Scan(
			&content.ID, &content.Title, &contentType, &content.Synopsis,
			&content.Language, &content.PosterURL, &content.TrailerURL,
			&releaseDate, &pct,
		); err != nil {
			return nil, err
		}
		content.Type = domain.ContentType(contentType)
		if releaseDate.Valid {
			t := releaseDate.Time
			content.ReleaseDate = &t
		}
		if pct.Valid {
			f, _ := pct.Float64Value()
			content.RecommendationPct = f.Float64
		}
		contents = append(contents, content)
	}
	return contents, rows.Err()
}
