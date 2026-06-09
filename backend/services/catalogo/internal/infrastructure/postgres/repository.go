package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"quetzaltv/services/catalogo/internal/domain"
)

type ContentRepository struct {
	db *pgxpool.Pool
}

func NewContentRepository(db *pgxpool.Pool) *ContentRepository {
	return &ContentRepository{db: db}
}

// ─── List ─────────────────────────────────────────────────────────────────────

func (r *ContentRepository) List(ctx context.Context) ([]domain.Content, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, titulo, tipo::text, sinopsis, idioma,
		       url_portada, url_trailer,
		       fecha_lanzamiento, porcentaje_recomendacion
		FROM v_cartelera_contenido
		ORDER BY titulo
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanContentRows(rows)
}

// ─── Search ───────────────────────────────────────────────────────────────────

func (r *ContentRepository) Search(ctx context.Context, query string) ([]domain.Content, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, titulo, tipo::text, sinopsis, idioma,
		       url_portada, url_trailer,
		       fecha_lanzamiento, porcentaje_recomendacion
		FROM v_cartelera_contenido
		WHERE titulo ILIKE $1
		ORDER BY titulo
	`, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanContentRows(rows)
}

// ─── FilterByGenres ───────────────────────────────────────────────────────────

func (r *ContentRepository) FilterByGenres(ctx context.Context, genreIDs []int64) ([]domain.Content, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT v.id, v.titulo, v.tipo::text, v.sinopsis, v.idioma,
		       v.url_portada, v.url_trailer,
		       v.fecha_lanzamiento, v.porcentaje_recomendacion
		FROM v_cartelera_contenido v
		JOIN contenido_generos cg ON cg.contenido_id = v.id
		WHERE cg.genero_id = ANY($1)
		ORDER BY v.titulo
	`, genreIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanContentRows(rows)
}

// ─── GetDetail ────────────────────────────────────────────────────────────────

func (r *ContentRepository) GetDetail(ctx context.Context, id string) (*domain.ContentDetail, error) {
	var d domain.ContentDetail
	var typeStr string
	var releaseDate pgtype.Date
	var durationMin pgtype.Int4

	err := r.db.QueryRow(ctx, `
		SELECT id, titulo, tipo::text, sinopsis, ficha_tecnica,
		       fecha_lanzamiento, clasificacion_edad, duracion_minutos,
		       idioma, url_portada, url_trailer,
		       total_likes, total_dislikes, porcentaje_recomendacion
		FROM v_detalle_contenido
		WHERE id = $1
	`, id).Scan(
		&d.ID, &d.Title, &typeStr, &d.Synopsis, &d.TechnicalSheet,
		&releaseDate, &d.AgeRating, &durationMin,
		&d.Language, &d.PosterURL, &d.TrailerURL,
		&d.TotalLikes, &d.TotalDislikes, &d.RecommendationPct,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrContentNotFound
	}
	if err != nil {
		return nil, err
	}

	d.Type = domain.ContentType(typeStr)
	if releaseDate.Valid {
		t := releaseDate.Time
		d.ReleaseDate = &t
	}
	if durationMin.Valid {
		v := int(durationMin.Int32)
		d.DurationMinutes = &v
	}

	// Generos
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
		var g domain.Genre
		if err := genreRows.Scan(&g.ID, &g.Name, &g.Description); err != nil {
			return nil, err
		}
		d.Genres = append(d.Genres, g)
	}

	// Reparto
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
		var m domain.CastMember
		if err := castRows.Scan(&m.ID, &m.ArtisticName, &m.RealName, &m.Nationality, &m.Character); err != nil {
			return nil, err
		}
		d.Cast = append(d.Cast, m)
	}

	return &d, nil
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

// ─── Create ───────────────────────────────────────────────────────────────────

func (r *ContentRepository) Create(ctx context.Context, c *domain.Content, genreIDs []int64) (string, error) {
	var newID string

	var releaseDate *time.Time
	if c.ReleaseDate != nil {
		releaseDate = c.ReleaseDate
	}

	var createdBy any
	if c.CreatedByAccountID != "" {
		createdBy = c.CreatedByAccountID
	}

	row := r.db.QueryRow(ctx, `
		CALL sp_registrar_contenido_completo(
			$1, $2::tipo_contenido, $3, $4,
			$5, $6, $7, $8, $9, $10,
			$11, $12, NULL
		)
	`,
		c.Title, string(c.Type), c.Synopsis, c.TechnicalSheet,
		releaseDate, c.AgeRating, c.DurationMinutes, c.Language,
		c.PosterURL, c.TrailerURL,
		createdBy, genreIDs,
	)
	if err := row.Scan(&newID); err != nil {
		return "", err
	}
	return newID, nil
}

// ─── Update ───────────────────────────────────────────────────────────────────

func (r *ContentRepository) Update(ctx context.Context, id string, c *domain.Content) error {
	tag, err := r.db.Exec(ctx, `
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
	`, id, c.Title, c.Synopsis, c.TechnicalSheet,
		c.ReleaseDate, c.AgeRating, c.DurationMinutes, c.Language, c.PosterURL, c.TrailerURL,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrContentNotFound
	}
	return nil
}

// ─── Delete ───────────────────────────────────────────────────────────────────

func (r *ContentRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE contenidos SET eliminado_en = NOW()
		WHERE id = $1 AND eliminado_en IS NULL
	`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrContentNotFound
	}
	return nil
}

// ─── Rate ─────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

func scanContentRows(rows pgx.Rows) ([]domain.Content, error) {
	var contents []domain.Content
	for rows.Next() {
		var c domain.Content
		var typeStr string
		var releaseDate pgtype.Date
		var pct pgtype.Numeric

		if err := rows.Scan(
			&c.ID, &c.Title, &typeStr, &c.Synopsis,
			&c.Language, &c.PosterURL, &c.TrailerURL,
			&releaseDate, &pct,
		); err != nil {
			return nil, err
		}
		c.Type = domain.ContentType(typeStr)
		if releaseDate.Valid {
			t := releaseDate.Time
			c.ReleaseDate = &t
		}
		if pct.Valid {
			f, _ := pct.Float64Value()
			c.RecommendationPct = f.Float64
		}
		contents = append(contents, c)
	}
	return contents, rows.Err()
}
