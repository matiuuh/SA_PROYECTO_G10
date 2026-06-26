// Nota: este archivo depende del codigo generado por protoc.
// Ejecuta `make proto` desde la raiz del servicio antes de compilar.
package grpc

import (
	"context"
	"errors"
	"log"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"quetzaltv/services/catalogo/internal/application"
	"quetzaltv/services/catalogo/internal/domain"
	"quetzaltv/services/catalogo/internal/infrastructure/alerts"
	catalogov1 "quetzaltv/services/catalogo/pkg/pb/catalogo/v1"
)

// Handler implementa catalogov1.CatalogoServiceServer.
type Handler struct {
	catalogov1.UnimplementedCatalogoServiceServer
	svc    *application.CatalogoService
	alerts *alerts.Dispatcher
}

func NewHandler(svc *application.CatalogoService, dispatcher *alerts.Dispatcher) *Handler {
	return &Handler{svc: svc, alerts: dispatcher}
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

func (h *Handler) ListarContenido(
	ctx context.Context,
	_ *catalogov1.ListarContenidoRequest,
) (*catalogov1.ListarContenidoResponse, error) {
	contents, err := h.svc.List(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &catalogov1.ListarContenidoResponse{
		Contenidos: toProtoList(contents),
	}, nil
}

func (h *Handler) BuscarContenido(
	ctx context.Context,
	req *catalogov1.BuscarContenidoRequest,
) (*catalogov1.ListarContenidoResponse, error) {
	contents, err := h.svc.Search(ctx, req.Query)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &catalogov1.ListarContenidoResponse{
		Contenidos: toProtoList(contents),
	}, nil
}

func (h *Handler) FiltrarContenido(
	ctx context.Context,
	req *catalogov1.FiltrarContenidoRequest,
) (*catalogov1.ListarContenidoResponse, error) {
	contents, err := h.svc.FilterByGenres(ctx, req.GeneroIds)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &catalogov1.ListarContenidoResponse{
		Contenidos: toProtoList(contents),
	}, nil
}

func (h *Handler) ObtenerDetalle(
	ctx context.Context,
	req *catalogov1.ObtenerDetalleRequest,
) (*catalogov1.ObtenerDetalleResponse, error) {
	detail, err := h.svc.GetDetail(ctx, req.ContenidoId)
	if errors.Is(err, domain.ErrContentNotFound) {
		return nil, status.Error(codes.NotFound, "contenido no encontrado")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &catalogov1.ObtenerDetalleResponse{
		Detalle: toProtoDetail(detail),
	}, nil
}

// ─── Calificacion ─────────────────────────────────────────────────────────────

func (h *Handler) CalificarContenido(
	ctx context.Context,
	req *catalogov1.CalificarContenidoRequest,
) (*catalogov1.CalificarContenidoResponse, error) {
	rating := &domain.Rating{
		ContentID: req.ContenidoId,
		ProfileID: req.PerfilId,
		Reaction:  protoToReaction(req.Reaccion),
	}
	pct, err := h.svc.Rate(ctx, rating)
	if errors.Is(err, domain.ErrContentNotFound) {
		return nil, status.Error(codes.NotFound, "contenido no encontrado")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &catalogov1.CalificarContenidoResponse{
		PorcentajeRecomendacion: pct,
	}, nil
}

// ─── Administracion ───────────────────────────────────────────────────────────

func (h *Handler) CrearContenido(
	ctx context.Context,
	req *catalogov1.CrearContenidoRequest,
) (*catalogov1.Contenido, error) {
	c := &domain.Content{
		Title:              req.Titulo,
		Type:               protoToContentType(req.Tipo),
		Synopsis:           req.Sinopsis,
		TechnicalSheet:     req.FichaTecnica,
		AgeRating:          req.ClasificacionEdad,
		Language:           req.Idioma,
		PosterURL:          req.UrlPortada,
		TrailerURL:         req.UrlTrailer,
		CreatedByAccountID: req.CreadoPorCuentaId,
	}
	if req.FechaLanzamiento != "" {
		releaseDate, err := parseReleaseDate(req.FechaLanzamiento)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, err.Error())
		}
		c.ReleaseDate = &releaseDate
	}
	if req.DuracionMinutos > 0 {
		v := int(req.DuracionMinutos)
		c.DurationMinutes = &v
	}

	id, err := h.svc.Create(ctx, c, req.GeneroIds)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	c.ID = id
	h.dispatchNewContentAlert(c)
	return toProtoContent(*c), nil
}

func (h *Handler) ActualizarContenido(
	ctx context.Context,
	req *catalogov1.ActualizarContenidoRequest,
) (*catalogov1.Contenido, error) {
	c := &domain.Content{
		Title:          req.Titulo,
		Synopsis:       req.Sinopsis,
		TechnicalSheet: req.FichaTecnica,
		AgeRating:      req.ClasificacionEdad,
		PosterURL:      req.UrlPortada,
		TrailerURL:     req.UrlTrailer,
	}
	if req.DuracionMinutos > 0 {
		v := int(req.DuracionMinutos)
		c.DurationMinutes = &v
	}

	if err := h.svc.Update(ctx, req.ContenidoId, c, ""); err != nil {
		if errors.Is(err, domain.ErrContentNotFound) {
			return nil, status.Error(codes.NotFound, "contenido no encontrado")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}
	c.ID = req.ContenidoId
	return toProtoContent(*c), nil
}

func parseReleaseDate(s string) (time.Time, error) {
	formats := []string{
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, errors.New("fecha_lanzamiento invalida, use YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss")
}

func (h *Handler) EliminarContenido(
	ctx context.Context,
	req *catalogov1.EliminarContenidoRequest,
) (*catalogov1.EliminarContenidoResponse, error) {
	if err := h.svc.Delete(ctx, req.ContenidoId, ""); err != nil {
		if errors.Is(err, domain.ErrContentNotFound) {
			return nil, status.Error(codes.NotFound, "contenido no encontrado")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &catalogov1.EliminarContenidoResponse{Ok: true}, nil
}

// ─── Conversiones dominio <-> proto ───────────────────────────────────────────

func toProtoContent(c domain.Content) *catalogov1.Contenido {
	p := &catalogov1.Contenido{
		Id:                      c.ID,
		Titulo:                  c.Title,
		Tipo:                    contentTypeToProto(c.Type),
		Sinopsis:                c.Synopsis,
		Idioma:                  c.Language,
		UrlPortada:              c.PosterURL,
		PorcentajeRecomendacion: c.RecommendationPct,
		UrlTrailer:              c.TrailerURL,
	}
	if c.ReleaseDate != nil {
		p.FechaLanzamiento = c.ReleaseDate.Format("2006-01-02T15:04:05")
	}
	return p
}

func toProtoList(cs []domain.Content) []*catalogov1.Contenido {
	out := make([]*catalogov1.Contenido, len(cs))
	for i, c := range cs {
		out[i] = toProtoContent(c)
	}
	return out
}

func toProtoDetail(d *domain.ContentDetail) *catalogov1.DetalleContenido {
	det := &catalogov1.DetalleContenido{
		Id:                      d.ID,
		Titulo:                  d.Title,
		Tipo:                    contentTypeToProto(d.Type),
		Sinopsis:                d.Synopsis,
		FichaTecnica:            d.TechnicalSheet,
		ClasificacionEdad:       d.AgeRating,
		Idioma:                  d.Language,
		UrlPortada:              d.PosterURL,
		UrlTrailer:              d.TrailerURL,
		TotalLikes:              int32(d.TotalLikes),
		TotalDislikes:           int32(d.TotalDislikes),
		PorcentajeRecomendacion: d.RecommendationPct,
	}
	if d.ReleaseDate != nil {
		det.FechaLanzamiento = d.ReleaseDate.Format("2006-01-02T15:04:05")
	}
	if d.DurationMinutes != nil {
		det.DuracionMinutos = int32(*d.DurationMinutes)
	}
	for _, g := range d.Genres {
		det.Generos = append(det.Generos, &catalogov1.Genero{
			Id: g.ID, Nombre: g.Name, Descripcion: g.Description,
		})
	}
	for _, m := range d.Cast {
		det.Reparto = append(det.Reparto, &catalogov1.MiembroReparto{
			Id: m.ID, NombreArtistico: m.ArtisticName,
			NombreReal: m.RealName, Nacionalidad: m.Nationality,
			Personaje: m.Character,
		})
	}
	return det
}

func contentTypeToProto(t domain.ContentType) catalogov1.TipoContenido {
	if t == domain.ContentTypeMovie {
		return catalogov1.TipoContenido_TIPO_CONTENIDO_PELICULA
	}
	return catalogov1.TipoContenido_TIPO_CONTENIDO_SERIE
}

func protoToContentType(t catalogov1.TipoContenido) domain.ContentType {
	if t == catalogov1.TipoContenido_TIPO_CONTENIDO_PELICULA {
		return domain.ContentTypeMovie
	}
	return domain.ContentTypeSeries
}

func protoToReaction(r catalogov1.TipoReaccion) domain.ReactionType {
	if r == catalogov1.TipoReaccion_TIPO_REACCION_LIKE {
		return domain.ReactionLike
	}
	return domain.ReactionDislike
}

func (h *Handler) dispatchNewContentAlert(content *domain.Content) {
	if h.alerts == nil || content == nil {
		return
	}
	if !isReleased(content.ReleaseDate) {
		return
	}

	contentCopy := *content
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		if err := h.alerts.DispatchNewContentAlert(ctx, contentCopy); err != nil {
			log.Printf("[catalogo] fallo al despachar alerta de nuevo contenido para %q: %v", contentCopy.Title, err)
			return
		}
		if err := h.svc.MarkPublicationAlertSent(ctx, contentCopy.ID); err != nil {
			log.Printf("[catalogo] no se pudo marcar alerta de nuevo contenido para %q: %v", contentCopy.Title, err)
		}
	}()
}

func isReleased(releaseDate *time.Time) bool {
	if releaseDate == nil {
		return true
	}
	return !releaseDate.After(time.Now())
}
