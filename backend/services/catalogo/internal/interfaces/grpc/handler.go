// Nota: este archivo depende del codigo generado por protoc.
// Ejecuta `make proto` desde la raiz del servicio antes de compilar.
package grpc

import (
	"context"
	"errors"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"quetzaltv/services/catalogo/internal/application"
	"quetzaltv/services/catalogo/internal/domain"
	catalogov1 "quetzaltv/services/catalogo/pkg/pb/catalogo/v1"
)

// Handler implementa catalogov1.CatalogoServiceServer.
type Handler struct {
	catalogov1.UnimplementedCatalogoServiceServer
	svc *application.CatalogoService
}

func NewHandler(svc *application.CatalogoService) *Handler {
	return &Handler{svc: svc}
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
		releaseDate, err := time.Parse("2006-01-02", req.FechaLanzamiento)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "fecha_lanzamiento invalida, use YYYY-MM-DD")
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

	if err := h.svc.Update(ctx, req.ContenidoId, c); err != nil {
		if errors.Is(err, domain.ErrContentNotFound) {
			return nil, status.Error(codes.NotFound, "contenido no encontrado")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}
	c.ID = req.ContenidoId
	return toProtoContent(*c), nil
}

func (h *Handler) EliminarContenido(
	ctx context.Context,
	req *catalogov1.EliminarContenidoRequest,
) (*catalogov1.EliminarContenidoResponse, error) {
	if err := h.svc.Delete(ctx, req.ContenidoId); err != nil {
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
		p.FechaLanzamiento = c.ReleaseDate.Format("2006-01-02")
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
		det.FechaLanzamiento = d.ReleaseDate.Format("2006-01-02")
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
