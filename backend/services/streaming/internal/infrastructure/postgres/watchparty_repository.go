package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"quetzaltv/services/streaming/internal/domain"
)

type WatchPartyRepository struct {
	db *pgxpool.Pool
}

func NewWatchPartyRepository(db *pgxpool.Pool) *WatchPartyRepository {
	return &WatchPartyRepository{db: db}
}

func scanSala(row pgx.Row) (*domain.SalaWatchParty, error) {
	var s domain.SalaWatchParty
	err := row.Scan(
		&s.ID, &s.CreadorPerfilID, &s.CreadorCuentaID,
		&s.ContenidoID, &s.TipoContenido, &s.CodigoInvite,
		&s.Estado, &s.EstadoReproduccion,
		&s.PosicionSegundos, &s.DuracionSegundos,
		&s.CreadoEn, &s.ActualizadoEn,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *WatchPartyRepository) CreateSala(ctx context.Context, s *domain.SalaWatchParty) (*domain.SalaWatchParty, error) {
	return scanSala(r.db.QueryRow(ctx, `
		INSERT INTO salas_watch_party
			(creador_perfil_id, creador_cuenta_id, contenido_id, tipo_contenido,
			 codigo_invite, estado, estado_reproduccion, posicion_segundos, duracion_segundos)
		VALUES ($1, $2, $3, $4, fn_generar_codigo_invite(), 'activa', 'pausada', $5, $6)
		RETURNING id, creador_perfil_id, creador_cuenta_id, contenido_id, tipo_contenido,
		          codigo_invite, estado, estado_reproduccion,
		          posicion_segundos, duracion_segundos, creado_en, actualizado_en
	`, s.CreadorPerfilID, s.CreadorCuentaID, s.ContenidoID, s.TipoContenido,
		s.PosicionSegundos, s.DuracionSegundos))
}

func (r *WatchPartyRepository) GetSalaByID(ctx context.Context, id string) (*domain.SalaWatchParty, error) {
	return scanSala(r.db.QueryRow(ctx, `
		SELECT id, creador_perfil_id, creador_cuenta_id, contenido_id, tipo_contenido,
		       codigo_invite, estado, estado_reproduccion,
		       posicion_segundos, duracion_segundos, creado_en, actualizado_en
		FROM salas_watch_party WHERE id = $1 AND estado = 'activa'
	`, id))
}

func (r *WatchPartyRepository) GetSalaByCodigo(ctx context.Context, codigo string) (*domain.SalaWatchParty, error) {
	return scanSala(r.db.QueryRow(ctx, `
		SELECT id, creador_perfil_id, creador_cuenta_id, contenido_id, tipo_contenido,
		       codigo_invite, estado, estado_reproduccion,
		       posicion_segundos, duracion_segundos, creado_en, actualizado_en
		FROM salas_watch_party WHERE codigo_invite = $1 AND estado = 'activa'
	`, codigo))
}

func (r *WatchPartyRepository) CloseSala(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE salas_watch_party SET estado = 'finalizada' WHERE id = $1`, id)
	return err
}

func (r *WatchPartyRepository) UpdateSalaState(ctx context.Context, id string, estado string, posicion int) error {
	_, err := r.db.Exec(ctx, `
		UPDATE salas_watch_party SET estado_reproduccion = $1, posicion_segundos = $2, actualizado_en = NOW()
		WHERE id = $3
	`, estado, posicion, id)
	return err
}

func (r *WatchPartyRepository) AddParticipante(ctx context.Context, p *domain.ParticipanteWatchParty) error {
	return r.db.QueryRow(ctx, `
		INSERT INTO participantes_watch_party (sala_id, perfil_id, perfil_nombre, cuenta_id, es_anfitrion, conectado)
		VALUES ($1, $2, $3, $4, $5, TRUE)
		ON CONFLICT (sala_id, perfil_id) DO UPDATE SET conectado = TRUE, perfil_nombre = EXCLUDED.perfil_nombre
		RETURNING id
	`, p.SalaID, p.PerfilID, p.PerfilNombre, p.CuentaID, p.EsAnfitrion).Scan(&p.ID)
}

func (r *WatchPartyRepository) GetParticipantes(ctx context.Context, salaID string) ([]domain.ParticipanteWatchParty, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, sala_id, perfil_id, perfil_nombre, cuenta_id, es_anfitrion, conectado, ultimo_latido, creado_en
		FROM participantes_watch_party WHERE sala_id = $1 ORDER BY creado_en
	`, salaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.ParticipanteWatchParty
	for rows.Next() {
		var p domain.ParticipanteWatchParty
		if err := rows.Scan(&p.ID, &p.SalaID, &p.PerfilID, &p.PerfilNombre,
			&p.CuentaID, &p.EsAnfitrion, &p.Conectado, &p.UltimoLatido, &p.CreadoEn); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, nil
}

func (r *WatchPartyRepository) GetParticipante(ctx context.Context, salaID, perfilID string) (*domain.ParticipanteWatchParty, error) {
	var p domain.ParticipanteWatchParty
	err := r.db.QueryRow(ctx, `
		SELECT id, sala_id, perfil_id, perfil_nombre, cuenta_id, es_anfitrion, conectado, ultimo_latido, creado_en
		FROM participantes_watch_party WHERE sala_id = $1 AND perfil_id = $2
	`, salaID, perfilID).Scan(
		&p.ID, &p.SalaID, &p.PerfilID, &p.PerfilNombre,
		&p.CuentaID, &p.EsAnfitrion, &p.Conectado, &p.UltimoLatido, &p.CreadoEn,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *WatchPartyRepository) MarkDisconnected(ctx context.Context, perfilID, salaID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE participantes_watch_party SET conectado = FALSE
		WHERE perfil_id = $1 AND sala_id = $2
	`, perfilID, salaID)
	return err
}

func (r *WatchPartyRepository) UpdateHeartbeat(ctx context.Context, participanteID string) error {
	if _, err := time.Parse(time.RFC3339, participanteID); err == nil {
		return nil
	}
	_, err := r.db.Exec(ctx, `
		UPDATE participantes_watch_party SET ultimo_latido = NOW()
		WHERE id = $1
	`, participanteID)
	return err
}
