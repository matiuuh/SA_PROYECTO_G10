package http

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"quetzaltv/services/streaming/internal/domain"
	"quetzaltv/services/streaming/internal/infrastructure/postgres"
)

type WatchPartyHandler struct {
	repo    *postgres.WatchPartyRepository
	clients map[string]*wpClient // perfilID → client
	rooms   map[string]map[string]bool // salaID → set<perfilID>
	mu      sync.Mutex
	upgrader websocket.Upgrader
}

type wpClient struct {
	conn           *websocket.Conn
	salaID         string
	perfilID       string
	perfilNombre   string
	cuentaID       string
	participanteID string
}

func NewWatchPartyHandler(repo *postgres.WatchPartyRepository) *WatchPartyHandler {
	return &WatchPartyHandler{
		repo:    repo,
		clients: make(map[string]*wpClient),
		rooms:   make(map[string]map[string]bool),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *WatchPartyHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/v1/watch-party", h.handleREST)
	mux.HandleFunc("/api/v1/watch-party/", h.handleREST)
}

func (h *WatchPartyHandler) handleREST(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		writePreflight(w)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/watch-party")
	path = strings.TrimPrefix(path, "/")

	switch {
	case r.Method == http.MethodPost && path == "":
		h.handleCreateSala(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(path, "join/"):
		h.handleJoinByCodigo(w, r, strings.TrimPrefix(path, "join/"))
	case r.Method == http.MethodGet && path != "" && !strings.HasPrefix(path, "join/") && path != "ws":
		h.handleGetSala(w, r, path)
	case r.Method == http.MethodDelete && path != "" && path != "ws":
		h.handleCloseSala(w, r, path)
	case strings.HasPrefix(path, "ws"):
		h.handleWebSocket(w, r)
	default:
		writeError(w, http.StatusNotFound, "Ruta no encontrada")
	}
}

func (h *WatchPartyHandler) handleCreateSala(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PerfilID       string `json:"perfil_id"`
		CuentaID       string `json:"cuenta_id"`
		ContenidoID    string `json:"contenido_id"`
		TipoContenido  string `json:"tipo_contenido"`
		DuracionSegundos int  `json:"duracion_segundos"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "JSON invalido")
		return
	}

	if body.CuentaID == "" {
		writeError(w, http.StatusBadRequest, "cuenta_id es requerido")
		return
	}

	// Premium check via suscripcion service
	premium, err := h.checkPremium(body.CuentaID)
	if err != nil {
		log.Printf("[watchparty] error checking premium: %v", err)
		writeError(w, http.StatusInternalServerError, "Error al verificar plan")
		return
	}
	if !premium {
		writeError(w, http.StatusForbidden, "Solo usuarios con plan Premium pueden crear Watch Parties.")
		return
	}

	sala := &domain.SalaWatchParty{
		CreadorPerfilID:  body.PerfilID,
		CreadorCuentaID:  body.CuentaID,
		ContenidoID:      body.ContenidoID,
		TipoContenido:    body.TipoContenido,
		PosicionSegundos: 0,
		DuracionSegundos: body.DuracionSegundos,
	}

	created, err := h.repo.CreateSala(r.Context(), sala)
	if err != nil {
		log.Printf("[watchparty] error creating sala: %v", err)
		writeError(w, http.StatusInternalServerError, "Error al crear sala")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"sala": created})
}

func (h *WatchPartyHandler) handleGetSala(w http.ResponseWriter, r *http.Request, id string) {
	sala, err := h.repo.GetSalaByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Sala no encontrada o ya finalizada.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sala": sala})
}

func (h *WatchPartyHandler) handleJoinByCodigo(w http.ResponseWriter, r *http.Request, codigo string) {
	sala, err := h.repo.GetSalaByCodigo(r.Context(), codigo)
	if err != nil {
		writeError(w, http.StatusNotFound, "Codigo invalido o sala finalizada.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sala": sala})
}

func (h *WatchPartyHandler) handleCloseSala(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.repo.CloseSala(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "Error al cerrar sala")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *WatchPartyHandler) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[watchparty] ws upgrade error: %v", err)
		return
	}

	codigo := r.URL.Query().Get("codigo")
	perfilID := r.URL.Query().Get("perfil_id")
	perfilNombre := r.URL.Query().Get("perfil_nombre")
	cuentaID := r.URL.Query().Get("cuenta_id")

	if codigo == "" || perfilID == "" {
		_ = conn.WriteJSON(map[string]string{"type": "error", "message": "Faltan parametros: codigo y perfil_id son requeridos."})
		conn.Close()
		return
	}

	sala, err := h.repo.GetSalaByCodigo(r.Context(), codigo)
	if err != nil {
		_ = conn.WriteJSON(map[string]string{"type": "error", "message": "Codigo de sala invalido o sala finalizada."})
		conn.Close()
		return
	}

	esAnfitrion := sala.CreadorPerfilID == perfilID

	existing, _ := h.repo.GetParticipante(r.Context(), sala.ID, perfilID)
	var participante *domain.ParticipanteWatchParty
	if existing != nil {
		participante = existing
	} else {
		participante = &domain.ParticipanteWatchParty{
			SalaID:       sala.ID,
			PerfilID:     perfilID,
			PerfilNombre: perfilNombre,
			CuentaID:     cuentaID,
			EsAnfitrion:  esAnfitrion,
		}
		if err := h.repo.AddParticipante(r.Context(), participante); err != nil {
			_ = conn.WriteJSON(map[string]string{"type": "error", "message": "Error al unirse a la sala."})
			conn.Close()
			return
		}
	}

	client := &wpClient{
		conn:           conn,
		salaID:         sala.ID,
		perfilID:       perfilID,
		perfilNombre:   perfilNombre,
		cuentaID:       cuentaID,
		participanteID: participante.ID,
	}

	h.mu.Lock()
	if _, ok := h.rooms[sala.ID]; !ok {
		h.rooms[sala.ID] = make(map[string]bool)
	}
	h.rooms[sala.ID][perfilID] = true
	if old, ok := h.clients[perfilID]; ok {
		old.conn.Close()
	}
	h.clients[perfilID] = client
	h.mu.Unlock()

	participantes, _ := h.repo.GetParticipantes(r.Context(), sala.ID)

	_ = conn.WriteJSON(map[string]any{
		"type":         "joined",
		"sala":         sala,
		"participantes": participantes,
	})

	h.broadcastToRoom(sala.ID, map[string]any{
		"type":        "participant_joined",
		"participant": participante,
	}, perfilID)

	// Read loop
	go h.readLoop(client, conn)
}

func (h *WatchPartyHandler) readLoop(client *wpClient, conn *websocket.Conn) {
	defer func() {
		h.mu.Lock()
		delete(h.clients, client.perfilID)
		if room, ok := h.rooms[client.salaID]; ok {
			delete(room, client.perfilID)
			if len(room) == 0 {
				delete(h.rooms, client.salaID)
			}
		}
		h.mu.Unlock()

		_ = h.repo.MarkDisconnected(context.Background(), client.perfilID, client.salaID)
		h.broadcastToRoom(client.salaID, map[string]any{
			"type":      "participant_left",
			"perfil_id": client.perfilID,
		}, "")
		conn.Close()
	}()

	pingTicker := time.NewTicker(25 * time.Second)
	defer pingTicker.Stop()

	go func() {
		for range pingTicker.C {
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}()

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg domain.WsMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			_ = conn.WriteJSON(map[string]string{"type": "error", "message": "Mensaje JSON invalido."})
			continue
		}

		switch msg.Type {
		case "play":
			pos := 0
			if msg.Position != nil {
				pos = int(*msg.Position)
			}
			_ = h.repo.UpdateSalaState(context.Background(), client.salaID, "reproduciendo", pos)
			h.broadcastToRoom(client.salaID, map[string]any{
				"type":         "play",
				"position":     pos,
				"triggered_by": client.perfilID,
			}, client.perfilID)

		case "pause":
			pos := 0
			if msg.Position != nil {
				pos = int(*msg.Position)
			}
			_ = h.repo.UpdateSalaState(context.Background(), client.salaID, "pausada", pos)
			h.broadcastToRoom(client.salaID, map[string]any{
				"type":         "pause",
				"position":     pos,
				"triggered_by": client.perfilID,
			}, client.perfilID)

		case "seek":
			pos := 0
			if msg.Position != nil {
				pos = int(*msg.Position)
			}
			_ = h.repo.UpdateSalaState(context.Background(), client.salaID, "pausada", pos)
			h.broadcastToRoom(client.salaID, map[string]any{
				"type":         "seek",
				"position":     pos,
				"triggered_by": client.perfilID,
			}, client.perfilID)

		case "chat_message":
			h.broadcastToRoom(client.salaID, map[string]any{
				"type":           "chat_message",
				"perfil_id":      client.perfilID,
				"perfil_nombre":  client.perfilNombre,
				"text":           msg.Text,
			}, "")

		case "sync_request":
			if sala, err := h.repo.GetSalaByID(context.Background(), client.salaID); err == nil {
				_ = conn.WriteJSON(map[string]any{
					"type":                "state_sync",
					"estado_reproduccion": sala.EstadoReproduccion,
					"position":            sala.PosicionSegundos,
				})
			}

		case "ping":
			_ = h.repo.UpdateHeartbeat(context.Background(), client.participanteID)
			_ = conn.WriteJSON(map[string]string{"type": "pong"})
		}
	}
}

func (h *WatchPartyHandler) broadcastToRoom(salaID string, msg map[string]any, excludePerfil string) {
	h.mu.Lock()
	room, ok := h.rooms[salaID]
	if !ok {
		h.mu.Unlock()
		return
	}
	members := make([]string, 0, len(room))
	for pid := range room {
		members = append(members, pid)
	}
	h.mu.Unlock()

	for _, pid := range members {
		if pid == excludePerfil {
			continue
		}
		h.mu.Lock()
		client, ok := h.clients[pid]
		h.mu.Unlock()
		if !ok {
			continue
		}
		_ = client.conn.WriteJSON(msg)
	}
}

func (h *WatchPartyHandler) checkPremium(cuentaID string) (bool, error) {
	suscURL := os.Getenv("SUSCRIPCION_SERVICE_URL")
	if suscURL == "" {
		suscURL = "http://suscripcion:8002"
	}
	resp, err := http.Get(suscURL + "/api/v1/internal/subscriptions/account/" + cuentaID + "/status")
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, nil
	}

	var data struct {
		Suscripcion *struct {
			PlanID string `json:"plan_id"`
		} `json:"suscripcion"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return false, err
	}
	if data.Suscripcion == nil {
		return false, nil
	}
	return data.Suscripcion.PlanID == "b0000000-0000-0000-0000-000000000003", nil
}
