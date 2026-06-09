package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"quetzaltv/services/streaming/internal/application"
	"quetzaltv/services/streaming/internal/domain"
)

type Handler struct {
	svc *application.StreamingService
}

type progressResponse struct {
	ID                string `json:"id"`
	PerfilID          string `json:"perfil_id"`
	ContenidoID       string `json:"contenido_id"`
	EpisodioID        string `json:"episodio_id"`
	Estado            string `json:"estado"`
	ProgresoSegundos  int    `json:"progreso_segundos"`
	ActualizadoEn     string `json:"actualizado_en"`
}

type updateProgressRequest struct {
	PerfilID               string `json:"perfil_id"`
	ContenidoID            string `json:"contenido_id"`
	EpisodioID             string `json:"episodio_id"`
	ProgresoSegundos       int    `json:"progreso_segundos"`
	DuracionTotalSegundos  int    `json:"duracion_total_segundos"`
}

type updateProgressResponse struct {
	OK     bool   `json:"ok"`
	Estado string `json:"estado"`
}

func NewHandler(svc *application.StreamingService) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", h.handleHealth)
	mux.HandleFunc("/api/v1/progress", h.handleProgress)
	mux.HandleFunc("/api/v1/history/", h.handleHistory)
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) handleProgress(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.handleGetProgress(w, r)
	case http.MethodPost:
		h.handleUpdateProgress(w, r)
	default:
		writeMethodNotAllowed(w)
	}
}

func (h *Handler) handleGetProgress(w http.ResponseWriter, r *http.Request) {
	profileID := strings.TrimSpace(r.URL.Query().Get("perfil_id"))
	contentID := strings.TrimSpace(r.URL.Query().Get("contenido_id"))
	episodeID := strings.TrimSpace(r.URL.Query().Get("episodio_id"))

	if profileID == "" || contentID == "" {
		writeError(w, http.StatusBadRequest, "Debes indicar perfil_id y contenido_id.")
		return
	}

	progress, err := h.svc.GetProgress(r.Context(), profileID, contentID, episodeID)
	if errors.Is(err, domain.ErrHistoryNotFound) {
		writeError(w, http.StatusNotFound, "No existe progreso previo para ese contenido.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo consultar el progreso.")
		return
	}

	writeJSON(w, http.StatusOK, toProgressResponse(progress))
}

func (h *Handler) handleUpdateProgress(w http.ResponseWriter, r *http.Request) {
	var req updateProgressRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "El cuerpo de la solicitud no es JSON valido.")
		return
	}

	req.PerfilID = strings.TrimSpace(req.PerfilID)
	req.ContenidoID = strings.TrimSpace(req.ContenidoID)
	req.EpisodioID = strings.TrimSpace(req.EpisodioID)

	if req.PerfilID == "" || req.ContenidoID == "" {
		writeError(w, http.StatusBadRequest, "Debes indicar perfil_id y contenido_id.")
		return
	}
	if req.ProgresoSegundos < 0 {
		writeError(w, http.StatusBadRequest, "El progreso no puede ser negativo.")
		return
	}
	if req.DuracionTotalSegundos < 0 {
		writeError(w, http.StatusBadRequest, "La duracion total no puede ser negativa.")
		return
	}

	state, err := h.svc.UpdateProgress(r.Context(), &domain.PlaybackHistory{
		ProfileID:       req.PerfilID,
		ContentID:       req.ContenidoID,
		EpisodeID:       req.EpisodioID,
		ProgressSeconds: req.ProgresoSegundos,
	}, req.DuracionTotalSegundos)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo guardar el progreso.")
		return
	}

	writeJSON(w, http.StatusOK, updateProgressResponse{
		OK:     true,
		Estado: string(state),
	})
}

func (h *Handler) handleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}

	profileID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/history/"))
	if profileID == "" {
		writeError(w, http.StatusBadRequest, "Debes indicar el perfil a consultar.")
		return
	}

	limit := 0
	if rawLimit := strings.TrimSpace(r.URL.Query().Get("limit")); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit < 0 {
			writeError(w, http.StatusBadRequest, "El parametro limit no es valido.")
			return
		}
		limit = parsedLimit
	}

	history, err := h.svc.GetHistory(r.Context(), profileID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo obtener el historial.")
		return
	}

	response := make([]progressResponse, 0, len(history))
	for i := range history {
		response = append(response, toProgressResponse(&history[i]))
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"historial": response,
	})
}

func toProgressResponse(progress *domain.PlaybackHistory) progressResponse {
	return progressResponse{
		ID:               progress.ID,
		PerfilID:         progress.ProfileID,
		ContenidoID:      progress.ContentID,
		EpisodioID:       progress.EpisodeID,
		Estado:           string(progress.State),
		ProgresoSegundos: progress.ProgressSeconds,
		ActualizadoEn:    progress.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

func writePreflight(w http.ResponseWriter) {
	setCommonHeaders(w)
	w.WriteHeader(http.StatusNoContent)
}

func writeMethodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, "Metodo no permitido.")
}

func writeError(w http.ResponseWriter, statusCode int, detail string) {
	writeJSON(w, statusCode, map[string]string{"detail": detail})
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	setCommonHeaders(w)
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func setCommonHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Content-Type", "application/json")
}
