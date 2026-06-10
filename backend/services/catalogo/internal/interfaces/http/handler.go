package http

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"quetzaltv/services/catalogo/internal/application"
	"quetzaltv/services/catalogo/internal/domain"
	"quetzaltv/services/catalogo/internal/infrastructure/alerts"
)

type Handler struct {
	svc       *application.CatalogoService
	jwtSecret []byte
	alerts    *alerts.Dispatcher
}

type contentResponse struct {
	ID                      string  `json:"id"`
	Titulo                  string  `json:"titulo"`
	Tipo                    string  `json:"tipo"`
	Sinopsis                string  `json:"sinopsis"`
	Idioma                  string  `json:"idioma"`
	UrlPortada              string  `json:"url_portada"`
	FechaLanzamiento        string  `json:"fecha_lanzamiento,omitempty"`
	PorcentajeRecomendacion float64 `json:"porcentaje_recomendacion"`
	UrlTrailer              string  `json:"url_trailer"`
}

type detailResponse struct {
	ID                      string               `json:"id"`
	Titulo                  string               `json:"titulo"`
	Tipo                    string               `json:"tipo"`
	Sinopsis                string               `json:"sinopsis"`
	FichaTecnica            string               `json:"ficha_tecnica"`
	FechaLanzamiento        string               `json:"fecha_lanzamiento,omitempty"`
	ClasificacionEdad       string               `json:"clasificacion_edad"`
	DuracionMinutos         *int                 `json:"duracion_minutos"`
	Idioma                  string               `json:"idioma"`
	UrlPortada              string               `json:"url_portada"`
	UrlTrailer              string               `json:"url_trailer"`
	TotalLikes              int                  `json:"total_likes"`
	TotalDislikes           int                  `json:"total_dislikes"`
	PorcentajeRecomendacion float64              `json:"porcentaje_recomendacion"`
	Generos                 []genreResponse      `json:"generos"`
	Reparto                 []castMemberResponse `json:"reparto"`
}

type genreResponse struct {
	ID          int64  `json:"id"`
	Nombre      string `json:"nombre"`
	Descripcion string `json:"descripcion"`
}

type castMemberResponse struct {
	ID              int64  `json:"id"`
	NombreArtistico string `json:"nombre_artistico"`
	NombreReal      string `json:"nombre_real"`
	Nacionalidad    string `json:"nacionalidad"`
	Personaje       string `json:"personaje"`
}

type seasonResponse struct {
	ID          string            `json:"id"`
	ContenidoID string            `json:"contenido_id"`
	Numero      int               `json:"numero"`
	Titulo      string            `json:"titulo"`
	Descripcion string            `json:"descripcion"`
	Episodios   []episodeResponse `json:"episodios"`
}

type episodeResponse struct {
	ID              string `json:"id"`
	TemporadaID     string `json:"temporada_id"`
	Numero          int    `json:"numero"`
	Titulo          string `json:"titulo"`
	Sinopsis        string `json:"sinopsis"`
	DuracionMinutos int    `json:"duracion_minutos"`
	UrlVideo        string `json:"url_video"`
}

type createContentRequest struct {
	Titulo            string `json:"titulo"`
	Tipo              string `json:"tipo"`
	Sinopsis          string `json:"sinopsis"`
	FichaTecnica      string `json:"ficha_tecnica"`
	FechaLanzamiento  string `json:"fecha_lanzamiento"`
	ClasificacionEdad string `json:"clasificacion_edad"`
	DuracionMinutos   *int   `json:"duracion_minutos"`
	Idioma            string `json:"idioma"`
	UrlPortada        string `json:"url_portada"`
	UrlTrailer        string `json:"url_trailer"`
}

type updateContentRequest struct {
	Titulo            string `json:"titulo"`
	Sinopsis          string `json:"sinopsis"`
	FichaTecnica      string `json:"ficha_tecnica"`
	FechaLanzamiento  string `json:"fecha_lanzamiento"`
	ClasificacionEdad string `json:"clasificacion_edad"`
	DuracionMinutos   *int   `json:"duracion_minutos"`
	Idioma            string `json:"idioma"`
	UrlPortada        string `json:"url_portada"`
	UrlTrailer        string `json:"url_trailer"`
}

type createContentResponse struct {
	ID      string `json:"id"`
	Message string `json:"message"`
}

type rateContentRequest struct {
	PerfilID string `json:"perfil_id"`
}

type rateContentResponse struct {
	Message                 string  `json:"message"`
	TotalLikes              int     `json:"total_likes"`
	TotalDislikes           int     `json:"total_dislikes"`
	PorcentajeRecomendacion float64 `json:"porcentaje_recomendacion"`
}

type createEpisodeBatchRequest struct {
	NumeroTemporada      int                    `json:"numero_temporada"`
	TituloTemporada      string                 `json:"titulo_temporada"`
	DescripcionTemporada string                 `json:"descripcion_temporada"`
	Episodios            []createEpisodeRequest `json:"episodios"`
}

type createEpisodeRequest struct {
	Numero          int    `json:"numero"`
	Titulo          string `json:"titulo"`
	Sinopsis        string `json:"sinopsis"`
	DuracionMinutos int    `json:"duracion_minutos"`
	UrlVideo        string `json:"url_video"`
}

type jwtClaims struct {
	Role  string `json:"role"`
	Email string `json:"email"`
	jwt.RegisteredClaims
}

func NewHandler(svc *application.CatalogoService, dispatcher *alerts.Dispatcher) *Handler {
	return &Handler{
		svc:       svc,
		jwtSecret: []byte(strings.TrimSpace(os.Getenv("JWT_SECRET"))),
		alerts:    dispatcher,
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", h.handleHealth)
	mux.HandleFunc("/api/v1/admin/catalog/series/", h.handleAdminSeries)
	mux.HandleFunc("/api/v1/admin/catalog/content/", h.handleAdminContentByID)
	mux.HandleFunc("/api/v1/admin/catalog/content", h.handleCreateContent)
	mux.HandleFunc("/api/v1/catalog/search", h.handleSearch)
	mux.HandleFunc("/api/v1/catalog/", h.handleDetail)
	mux.HandleFunc("/api/v1/catalog", h.handleList)
}

func (h *Handler) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) handleList(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}

	contents, err := h.svc.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo cargar el catalogo.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"contenidos": toContentResponseList(contents),
	})
}

func (h *Handler) handleSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	contents, err := h.svc.Search(r.Context(), query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo buscar contenido.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"contenidos": toContentResponseList(contents),
	})
}

func (h *Handler) handleDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}

	path := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/catalog/"))
	if path == "" {
		writeError(w, http.StatusBadRequest, "Debes indicar el identificador del contenido.")
		return
	}

	if strings.HasSuffix(path, "/like") {
		if r.Method != http.MethodPost {
			writeMethodNotAllowed(w)
			return
		}
		id := strings.TrimSpace(strings.TrimSuffix(path, "/like"))
		id = strings.TrimSuffix(id, "/")
		if id == "" {
			writeError(w, http.StatusBadRequest, "Debes indicar el identificador del contenido.")
			return
		}
		h.handleLikeContent(w, r, id)
		return
	}

	if strings.HasSuffix(path, "/dislike") {
		if r.Method != http.MethodPost {
			writeMethodNotAllowed(w)
			return
		}
		id := strings.TrimSpace(strings.TrimSuffix(path, "/dislike"))
		id = strings.TrimSuffix(id, "/")
		if id == "" {
			writeError(w, http.StatusBadRequest, "Debes indicar el identificador del contenido.")
			return
		}
		h.handleDislikeContent(w, r, id)
		return
	}

	if strings.HasSuffix(path, "/seasons") {
		if r.Method != http.MethodGet {
			writeMethodNotAllowed(w)
			return
		}
		id := strings.TrimSpace(strings.TrimSuffix(path, "/seasons"))
		id = strings.TrimSuffix(id, "/")
		if id == "" {
			writeError(w, http.StatusBadRequest, "Debes indicar el identificador del contenido.")
			return
		}
		h.handleListSeasons(w, r, id)
		return
	}

	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}

	id := path
	detail, err := h.svc.GetDetail(r.Context(), id)
	if errors.Is(err, domain.ErrContentNotFound) {
		writeError(w, http.StatusNotFound, "Contenido no encontrado.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo obtener el detalle del contenido.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"detalle": toDetailResponse(detail),
	})
}

func (h *Handler) handleLikeContent(w http.ResponseWriter, r *http.Request, contentID string) {
	h.handleRateContent(w, r, contentID, domain.ReactionLike, "Like registrado correctamente.", "No se pudo registrar el like del contenido.")
}

func (h *Handler) handleDislikeContent(w http.ResponseWriter, r *http.Request, contentID string) {
	h.handleRateContent(w, r, contentID, domain.ReactionDislike, "Dislike registrado correctamente.", "No se pudo registrar el dislike del contenido.")
}

func (h *Handler) handleRateContent(
	w http.ResponseWriter,
	r *http.Request,
	contentID string,
	reaction domain.ReactionType,
	successMessage string,
	errorMessage string,
) {
	if _, err := h.requireAuthenticated(r); err != nil {
		writeAuthError(w, err)
		return
	}

	var req rateContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "El cuerpo de la solicitud no es JSON valido.")
		return
	}

	profileID := strings.TrimSpace(req.PerfilID)
	if profileID == "" {
		writeError(w, http.StatusBadRequest, "Debes indicar el perfil que emite la reaccion.")
		return
	}

	_, err := h.svc.Rate(r.Context(), &domain.Rating{
		ContentID: contentID,
		ProfileID: profileID,
		Reaction:  reaction,
	})
	if errors.Is(err, domain.ErrContentNotFound) {
		writeError(w, http.StatusNotFound, "Contenido no encontrado.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, errorMessage)
		return
	}

	detail, err := h.svc.GetDetail(r.Context(), contentID)
	if errors.Is(err, domain.ErrContentNotFound) {
		writeError(w, http.StatusNotFound, "Contenido no encontrado.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo actualizar el detalle del contenido.")
		return
	}

	writeJSON(w, http.StatusOK, rateContentResponse{
		Message:                 successMessage,
		TotalLikes:              detail.TotalLikes,
		TotalDislikes:           detail.TotalDislikes,
		PorcentajeRecomendacion: detail.RecommendationPct,
	})
}

func (h *Handler) handleListSeasons(w http.ResponseWriter, r *http.Request, contentID string) {
	seasons, err := h.svc.ListSeasonsByContent(r.Context(), contentID)
	if errors.Is(err, domain.ErrContentNotFound) {
		writeError(w, http.StatusNotFound, "Contenido no encontrado.")
		return
	}
	if errors.Is(err, domain.ErrInvalidSeriesContent) {
		writeError(w, http.StatusBadRequest, "Solo las series pueden consultar temporadas y episodios.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo obtener la estructura de temporadas.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"temporadas": toSeasonResponseList(seasons),
	})
}

func (h *Handler) requireAuthenticated(r *http.Request) (*jwtClaims, error) {
	if len(h.jwtSecret) == 0 {
		return nil, errors.New("server_jwt_secret_missing")
	}

	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, errors.New("missing_bearer")
	}

	tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if tokenString == "" {
		return nil, errors.New("missing_bearer")
	}

	token, err := jwt.ParseWithClaims(tokenString, &jwtClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid_signing_method")
		}
		return h.jwtSecret, nil
	})
	if err != nil {
		return nil, errors.New("invalid_token")
	}

	claims, ok := token.Claims.(*jwtClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid_token")
	}

	if strings.TrimSpace(claims.Subject) == "" {
		return nil, errors.New("invalid_token")
	}

	return claims, nil
}

func (h *Handler) handleCreateContent(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}
	if r.Method != http.MethodPost {
		writeMethodNotAllowed(w)
		return
	}

	accountID, err := h.requireAdmin(r)
	if err != nil {
		writeAuthError(w, err)
		return
	}

	var req createContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "El cuerpo de la solicitud no es JSON valido.")
		return
	}

	content, err := parseCreateContentRequest(req, accountID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	id, err := h.svc.Create(r.Context(), content, []int64{})
	if errors.Is(err, domain.ErrDuplicateContent) {
		writeError(w, http.StatusConflict, "Ya existe contenido equivalente registrado.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo registrar el contenido.")
		return
	}

	content.ID = id
	h.dispatchNewContentAlert(content)

	writeJSON(w, http.StatusCreated, createContentResponse{
		ID:      id,
		Message: "Contenido registrado correctamente.",
	})
}

func (h *Handler) handleAdminContentByID(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}

	contentID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/admin/catalog/content/"))
	contentID = strings.TrimSuffix(contentID, "/")
	if contentID == "" {
		writeError(w, http.StatusBadRequest, "Debes indicar el identificador del contenido.")
		return
	}

	if _, err := h.requireAdmin(r); err != nil {
		writeAuthError(w, err)
		return
	}

	switch r.Method {
	case http.MethodPut:
		h.handleUpdateContent(w, r, contentID)
	case http.MethodDelete:
		h.handleDeleteContent(w, r, contentID)
	default:
		writeMethodNotAllowed(w)
	}
}

func (h *Handler) handleAdminSeries(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}

	if _, err := h.requireAdmin(r); err != nil {
		writeAuthError(w, err)
		return
	}

	path := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/admin/catalog/series/"))
	path = strings.Trim(path, "/")
	if path == "" {
		writeError(w, http.StatusBadRequest, "Debes indicar la serie a administrar.")
		return
	}

	if !strings.HasSuffix(path, "episodes/batch") {
		writeMethodNotAllowed(w)
		return
	}

	if r.Method != http.MethodPost {
		writeMethodNotAllowed(w)
		return
	}

	contentID := strings.TrimSpace(strings.TrimSuffix(path, "episodes/batch"))
	contentID = strings.Trim(contentID, "/")
	if contentID == "" {
		writeError(w, http.StatusBadRequest, "Debes indicar la serie a administrar.")
		return
	}

	h.handleCreateEpisodeBatch(w, r, contentID)
}

func (h *Handler) handleUpdateContent(w http.ResponseWriter, r *http.Request, contentID string) {
	var req updateContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "El cuerpo de la solicitud no es JSON valido.")
		return
	}

	content, err := parseUpdateContentRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.svc.Update(r.Context(), contentID, content); err != nil {
		if errors.Is(err, domain.ErrContentNotFound) {
			writeError(w, http.StatusNotFound, "Contenido no encontrado.")
			return
		}
		writeError(w, http.StatusInternalServerError, "No se pudo actualizar el contenido.")
		return
	}

	detail, err := h.svc.GetDetail(r.Context(), contentID)
	if errors.Is(err, domain.ErrContentNotFound) {
		writeError(w, http.StatusNotFound, "Contenido no encontrado.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudo obtener el contenido actualizado.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"message": "Contenido actualizado correctamente.",
		"detalle": toDetailResponse(detail),
	})
}

func (h *Handler) handleDeleteContent(w http.ResponseWriter, r *http.Request, contentID string) {
	if err := h.svc.Delete(r.Context(), contentID); err != nil {
		if errors.Is(err, domain.ErrContentNotFound) {
			writeError(w, http.StatusNotFound, "Contenido no encontrado.")
			return
		}
		writeError(w, http.StatusInternalServerError, "No se pudo eliminar el contenido.")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Contenido eliminado correctamente.",
	})
}

func (h *Handler) handleCreateEpisodeBatch(w http.ResponseWriter, r *http.Request, contentID string) {
	var req createEpisodeBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "El cuerpo de la solicitud no es JSON valido.")
		return
	}

	batch, err := parseEpisodeBatchRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	episodes, err := h.svc.CreateEpisodeBatch(r.Context(), contentID, batch)
	if errors.Is(err, domain.ErrContentNotFound) {
		writeError(w, http.StatusNotFound, "Serie no encontrada.")
		return
	}
	if errors.Is(err, domain.ErrInvalidSeriesContent) {
		writeError(w, http.StatusBadRequest, "El contenido seleccionado no corresponde a una serie.")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "No se pudieron registrar los episodios.")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"message":   "Episodios registrados correctamente.",
		"episodios": toEpisodeResponseList(episodes),
	})
}

func (h *Handler) requireAdmin(r *http.Request) (string, error) {
	claims, err := h.requireAuthenticated(r)
	if err != nil {
		return "", err
	}

	if strings.TrimSpace(claims.Role) != "administrador" {
		return "", errors.New("forbidden_role")
	}

	accountID := strings.TrimSpace(claims.Subject)
	if accountID == "" {
		return "", errors.New("invalid_token")
	}

	return accountID, nil
}

func parseCreateContentRequest(req createContentRequest, createdByAccountID string) (*domain.Content, error) {
	title := strings.TrimSpace(req.Titulo)
	synopsis := strings.TrimSpace(req.Sinopsis)
	language := strings.TrimSpace(req.Idioma)
	posterURL := strings.TrimSpace(req.UrlPortada)
	contentType := domain.ContentType(strings.TrimSpace(req.Tipo))

	if title == "" {
		return nil, errors.New("Debes indicar el titulo del contenido.")
	}
	if synopsis == "" {
		return nil, errors.New("Debes indicar la sinopsis del contenido.")
	}
	if contentType != domain.ContentTypeMovie && contentType != domain.ContentTypeSeries {
		return nil, errors.New("El tipo de contenido no es valido.")
	}
	if language == "" {
		return nil, errors.New("Debes indicar el idioma principal del contenido.")
	}
	if posterURL == "" {
		return nil, errors.New("Debes indicar la URL de la portada.")
	}
	if req.DuracionMinutos != nil && *req.DuracionMinutos <= 0 {
		return nil, errors.New("La duracion debe ser mayor que cero.")
	}
	if contentType == domain.ContentTypeMovie && req.DuracionMinutos == nil {
		return nil, errors.New("Las peliculas deben incluir duracion en minutos.")
	}

	content := &domain.Content{
		Title:              title,
		Type:               contentType,
		Synopsis:           synopsis,
		TechnicalSheet:     strings.TrimSpace(req.FichaTecnica),
		AgeRating:          strings.TrimSpace(req.ClasificacionEdad),
		Language:           language,
		PosterURL:          posterURL,
		TrailerURL:         strings.TrimSpace(req.UrlTrailer),
		CreatedByAccountID: createdByAccountID,
	}

	if strings.TrimSpace(req.FechaLanzamiento) != "" {
		releaseDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.FechaLanzamiento))
		if err != nil {
			return nil, errors.New("La fecha de lanzamiento debe usar el formato YYYY-MM-DD.")
		}
		content.ReleaseDate = &releaseDate
	}

	if req.DuracionMinutos != nil {
		duration := *req.DuracionMinutos
		content.DurationMinutes = &duration
	}

	return content, nil
}

func parseUpdateContentRequest(req updateContentRequest) (*domain.Content, error) {
	title := strings.TrimSpace(req.Titulo)
	synopsis := strings.TrimSpace(req.Sinopsis)
	language := strings.TrimSpace(req.Idioma)
	posterURL := strings.TrimSpace(req.UrlPortada)

	if title == "" {
		return nil, errors.New("Debes indicar el titulo del contenido.")
	}
	if synopsis == "" {
		return nil, errors.New("Debes indicar la sinopsis del contenido.")
	}
	if language == "" {
		return nil, errors.New("Debes indicar el idioma principal del contenido.")
	}
	if posterURL == "" {
		return nil, errors.New("Debes indicar la URL de la portada.")
	}
	if req.DuracionMinutos != nil && *req.DuracionMinutos <= 0 {
		return nil, errors.New("La duracion debe ser mayor que cero.")
	}

	content := &domain.Content{
		Title:          title,
		Synopsis:       synopsis,
		TechnicalSheet: strings.TrimSpace(req.FichaTecnica),
		AgeRating:      strings.TrimSpace(req.ClasificacionEdad),
		Language:       language,
		PosterURL:      posterURL,
		TrailerURL:     strings.TrimSpace(req.UrlTrailer),
	}

	if strings.TrimSpace(req.FechaLanzamiento) != "" {
		releaseDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.FechaLanzamiento))
		if err != nil {
			return nil, errors.New("La fecha de lanzamiento debe usar el formato YYYY-MM-DD.")
		}
		content.ReleaseDate = &releaseDate
	}

	if req.DuracionMinutos != nil {
		duration := *req.DuracionMinutos
		content.DurationMinutes = &duration
	}

	return content, nil
}

func parseEpisodeBatchRequest(req createEpisodeBatchRequest) (domain.EpisodeBatch, error) {
	if req.NumeroTemporada <= 0 {
		return domain.EpisodeBatch{}, errors.New("Debes indicar un numero de temporada valido.")
	}
	if len(req.Episodios) == 0 {
		return domain.EpisodeBatch{}, errors.New("Debes agregar al menos un episodio.")
	}

	batch := domain.EpisodeBatch{
		SeasonNumber:      req.NumeroTemporada,
		SeasonTitle:       strings.TrimSpace(req.TituloTemporada),
		SeasonDescription: strings.TrimSpace(req.DescripcionTemporada),
		Episodes:          make([]domain.Episode, 0, len(req.Episodios)),
	}

	for _, episode := range req.Episodios {
		if episode.Numero <= 0 {
			return domain.EpisodeBatch{}, errors.New("Todos los episodios deben tener un numero mayor que cero.")
		}
		if strings.TrimSpace(episode.Titulo) == "" {
			return domain.EpisodeBatch{}, errors.New("Todos los episodios deben incluir titulo.")
		}
		if episode.DuracionMinutos <= 0 {
			return domain.EpisodeBatch{}, errors.New("Todos los episodios deben incluir una duracion valida.")
		}
		if strings.TrimSpace(episode.UrlVideo) == "" {
			return domain.EpisodeBatch{}, errors.New("Todos los episodios deben incluir la URL del video.")
		}

		batch.Episodes = append(batch.Episodes, domain.Episode{
			Number:          episode.Numero,
			Title:           strings.TrimSpace(episode.Titulo),
			Synopsis:        strings.TrimSpace(episode.Sinopsis),
			DurationMinutes: episode.DuracionMinutos,
			VideoURL:        strings.TrimSpace(episode.UrlVideo),
		})
	}

	return batch, nil
}

func (h *Handler) dispatchNewContentAlert(content *domain.Content) {
	if h.alerts == nil || content == nil {
		return
	}

	contentCopy := *content
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		if err := h.alerts.DispatchNewContentAlert(ctx, contentCopy); err != nil {
			log.Printf("[catalogo] fallo al despachar alerta de nuevo contenido para %q: %v", contentCopy.Title, err)
		}
	}()
}

func toContentResponseList(contents []domain.Content) []contentResponse {
	out := make([]contentResponse, 0, len(contents))
	for _, content := range contents {
		out = append(out, toContentResponse(content))
	}
	return out
}

func toContentResponse(content domain.Content) contentResponse {
	response := contentResponse{
		ID:                      content.ID,
		Titulo:                  content.Title,
		Tipo:                    string(content.Type),
		Sinopsis:                content.Synopsis,
		Idioma:                  content.Language,
		UrlPortada:              content.PosterURL,
		PorcentajeRecomendacion: content.RecommendationPct,
		UrlTrailer:              content.TrailerURL,
	}
	if content.ReleaseDate != nil {
		response.FechaLanzamiento = content.ReleaseDate.Format("2006-01-02")
	}
	return response
}

func toDetailResponse(detail *domain.ContentDetail) detailResponse {
	response := detailResponse{
		ID:                      detail.ID,
		Titulo:                  detail.Title,
		Tipo:                    string(detail.Type),
		Sinopsis:                detail.Synopsis,
		FichaTecnica:            detail.TechnicalSheet,
		ClasificacionEdad:       detail.AgeRating,
		DuracionMinutos:         detail.DurationMinutes,
		Idioma:                  detail.Language,
		UrlPortada:              detail.PosterURL,
		UrlTrailer:              detail.TrailerURL,
		TotalLikes:              detail.TotalLikes,
		TotalDislikes:           detail.TotalDislikes,
		PorcentajeRecomendacion: detail.RecommendationPct,
	}
	if detail.ReleaseDate != nil {
		response.FechaLanzamiento = detail.ReleaseDate.Format("2006-01-02")
	}
	for _, genre := range detail.Genres {
		response.Generos = append(response.Generos, genreResponse{
			ID:          genre.ID,
			Nombre:      genre.Name,
			Descripcion: genre.Description,
		})
	}
	for _, member := range detail.Cast {
		response.Reparto = append(response.Reparto, castMemberResponse{
			ID:              member.ID,
			NombreArtistico: member.ArtisticName,
			NombreReal:      member.RealName,
			Nacionalidad:    member.Nationality,
			Personaje:       member.Character,
		})
	}
	return response
}

func toSeasonResponseList(seasons []domain.Season) []seasonResponse {
	out := make([]seasonResponse, 0, len(seasons))
	for _, season := range seasons {
		out = append(out, seasonResponse{
			ID:          season.ID,
			ContenidoID: season.ContentID,
			Numero:      season.Number,
			Titulo:      season.Title,
			Descripcion: season.Description,
			Episodios:   toEpisodeResponseList(season.Episodes),
		})
	}
	return out
}

func toEpisodeResponseList(episodes []domain.Episode) []episodeResponse {
	out := make([]episodeResponse, 0, len(episodes))
	for _, episode := range episodes {
		out = append(out, episodeResponse{
			ID:              episode.ID,
			TemporadaID:     episode.SeasonID,
			Numero:          episode.Number,
			Titulo:          episode.Title,
			Sinopsis:        episode.Synopsis,
			DuracionMinutos: episode.DurationMinutes,
			UrlVideo:        episode.VideoURL,
		})
	}
	return out
}

func writePreflight(w http.ResponseWriter) {
	setCommonHeaders(w)
	w.WriteHeader(http.StatusNoContent)
}

func writeMethodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, "Metodo no permitido.")
}

func writeAuthError(w http.ResponseWriter, err error) {
	switch err.Error() {
	case "missing_bearer":
		writeError(w, http.StatusUnauthorized, "Debes enviar un token Bearer valido.")
	case "forbidden_role":
		writeError(w, http.StatusForbidden, "Solo los administradores pueden registrar contenido.")
	case "server_jwt_secret_missing":
		writeError(w, http.StatusInternalServerError, "El servidor no tiene configurado JWT_SECRET.")
	default:
		writeError(w, http.StatusUnauthorized, "No fue posible validar la sesion.")
	}
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
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Content-Type", "application/json")
}
