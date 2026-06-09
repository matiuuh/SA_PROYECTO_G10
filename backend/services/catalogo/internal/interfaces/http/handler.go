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

type createContentResponse struct {
	ID      string `json:"id"`
	Message string `json:"message"`
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
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}

	id := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/v1/catalog/"))
	if id == "" {
		writeError(w, http.StatusBadRequest, "Debes indicar el identificador del contenido.")
		return
	}

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

func (h *Handler) requireAdmin(r *http.Request) (string, error) {
	if len(h.jwtSecret) == 0 {
		return "", errors.New("server_jwt_secret_missing")
	}

	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return "", errors.New("missing_bearer")
	}

	tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if tokenString == "" {
		return "", errors.New("missing_bearer")
	}

	token, err := jwt.ParseWithClaims(tokenString, &jwtClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid_signing_method")
		}
		return h.jwtSecret, nil
	})
	if err != nil {
		return "", errors.New("invalid_token")
	}

	claims, ok := token.Claims.(*jwtClaims)
	if !ok || !token.Valid {
		return "", errors.New("invalid_token")
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
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Content-Type", "application/json")
}
