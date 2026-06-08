// Nota: este archivo depende del codigo generado por protoc.
// Ejecuta `make proto` desde la raiz del servicio antes de compilar.
package grpc

import (
	"context"
	"errors"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	streamingv1 "quetzaltv/services/streaming/pkg/pb/streaming/v1"
	"quetzaltv/services/streaming/internal/application"
	"quetzaltv/services/streaming/internal/domain"
)

// Handler implementa streamingv1.StreamingServiceServer.
type Handler struct {
	streamingv1.UnimplementedStreamingServiceServer
	svc *application.StreamingService
}

func NewHandler(svc *application.StreamingService) *Handler {
	return &Handler{svc: svc}
}

// ─── ActualizarProgreso ───────────────────────────────────────────────────────

func (h *Handler) ActualizarProgreso(
	ctx context.Context,
	req *streamingv1.ActualizarProgresoRequest,
) (*streamingv1.ActualizarProgresoResponse, error) {
	hist := &domain.PlaybackHistory{
		ProfileID:       req.PerfilId,
		ContentID:       req.ContenidoId,
		EpisodeID:       req.EpisodioId,
		ProgressSeconds: int(req.ProgresoSegundos),
	}

	state, err := h.svc.UpdateProgress(ctx, hist, int(req.DuracionTotalSegundos))
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &streamingv1.ActualizarProgresoResponse{
		Ok:     true,
		Estado: stateToProto(state),
	}, nil
}

// ─── ObtenerProgreso ──────────────────────────────────────────────────────────

func (h *Handler) ObtenerProgreso(
	ctx context.Context,
	req *streamingv1.ObtenerProgresoRequest,
) (*streamingv1.HistorialReproduccion, error) {
	hist, err := h.svc.GetProgress(ctx, req.PerfilId, req.ContenidoId, req.EpisodioId)
	if errors.Is(err, domain.ErrHistoryNotFound) {
		return nil, status.Error(codes.NotFound, "historial no encontrado")
	}
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}
	return toProto(hist), nil
}

// ─── ObtenerHistorial ─────────────────────────────────────────────────────────

func (h *Handler) ObtenerHistorial(
	ctx context.Context,
	req *streamingv1.ObtenerHistorialRequest,
) (*streamingv1.ObtenerHistorialResponse, error) {
	history, err := h.svc.GetHistory(ctx, req.PerfilId, int(req.Limite))
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	resp := &streamingv1.ObtenerHistorialResponse{}
	for _, h := range history {
		resp.Historial = append(resp.Historial, toProto(&h))
	}
	return resp, nil
}

// ─── Conversiones dominio <-> proto ───────────────────────────────────────────

func toProto(h *domain.PlaybackHistory) *streamingv1.HistorialReproduccion {
	return &streamingv1.HistorialReproduccion{
		Id:               h.ID,
		PerfilId:         h.ProfileID,
		ContenidoId:      h.ContentID,
		EpisodioId:       h.EpisodeID,
		Estado:           stateToProto(h.State),
		ProgresoSegundos: int32(h.ProgressSeconds),
		ActualizadoEn:    h.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func stateToProto(s domain.PlaybackState) streamingv1.EstadoHistorial {
	if s == domain.PlaybackFinished {
		return streamingv1.EstadoHistorial_ESTADO_HISTORIAL_FINALIZADO
	}
	return streamingv1.EstadoHistorial_ESTADO_HISTORIAL_EN_PROGRESO
}
