package domain

import "time"

type SalaWatchParty struct {
	ID                 string    `json:"id"`
	CreadorPerfilID    string    `json:"creadorPerfilId"`
	CreadorCuentaID    string    `json:"creadorCuentaId"`
	ContenidoID        string    `json:"contenidoId"`
	TipoContenido      string    `json:"tipoContenido"`
	CodigoInvite       string    `json:"codigoInvite"`
	Estado             string    `json:"estado"`
	EstadoReproduccion string    `json:"estadoReproduccion"`
	PosicionSegundos   int       `json:"posicionSegundos"`
	DuracionSegundos   int       `json:"duracionSegundos"`
	CreadoEn           time.Time `json:"creadoEn"`
	ActualizadoEn      time.Time `json:"actualizadoEn"`
}

type ParticipanteWatchParty struct {
	ID           string     `json:"id"`
	SalaID       string     `json:"salaId"`
	PerfilID     string     `json:"perfilId"`
	PerfilNombre string     `json:"perfilNombre"`
	CuentaID     string     `json:"cuentaId"`
	EsAnfitrion  bool       `json:"esAnfitrion"`
	Conectado    bool       `json:"conectado"`
	UltimoLatido *time.Time `json:"ultimoLatido"`
	CreadoEn     time.Time  `json:"creadoEn"`
}

type WsMessage struct {
	Type         string   `json:"type"`
	Position     *float64 `json:"position,omitempty"`
	Codigo       string   `json:"codigo,omitempty"`
	PerfilID     string   `json:"perfilId,omitempty"`
	PerfilNombre string   `json:"perfilNombre,omitempty"`
	CuentaID     string   `json:"cuentaId,omitempty"`
	Text         string   `json:"text,omitempty"`
}
