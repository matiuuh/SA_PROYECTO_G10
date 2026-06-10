package alerts

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"slices"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"quetzaltv/services/catalogo/internal/domain"
	notificacionesv1 "quetzaltv/services/catalogo/pkg/pb/notificaciones/v1"
)

type Dispatcher struct {
	httpClient               *http.Client
	subscriptionAPIURL       string
	userAPIURL               string
	notificationsGRPCTarget  string
}

type activeAccountsResponse struct {
	CuentaIDs []string `json:"cuenta_ids"`
}

type accountResponse struct {
	ID     string `json:"id"`
	Nombre string `json:"nombre"`
	Correo string `json:"correo"`
	Pais   string `json:"pais"`
	Rol    string `json:"rol"`
}

func NewDispatcherFromEnv() *Dispatcher {
	subscriptionAPIURL := strings.TrimRight(strings.TrimSpace(os.Getenv("SUBSCRIPCION_API_URL")), "/")
	userAPIURL := strings.TrimRight(strings.TrimSpace(os.Getenv("USUARIO_API_URL")), "/")
	notificationsGRPCTarget := strings.TrimSpace(os.Getenv("NOTIFICACIONES_GRPC_TARGET"))

	if subscriptionAPIURL == "" || userAPIURL == "" || notificationsGRPCTarget == "" {
		log.Println("[catalogo] alerta de nuevo contenido deshabilitada por configuracion incompleta")
		return nil
	}

	return &Dispatcher{
		httpClient: &http.Client{Timeout: 8 * time.Second},
		subscriptionAPIURL:      subscriptionAPIURL,
		userAPIURL:              userAPIURL,
		notificationsGRPCTarget: notificationsGRPCTarget,
	}
}

func (d *Dispatcher) DispatchNewContentAlert(ctx context.Context, content domain.Content) error {
	accountIDs, err := d.fetchActiveAccountIDs(ctx)
	if err != nil {
		return err
	}
	if len(accountIDs) == 0 {
		log.Printf("[catalogo] no hay cuentas con suscripcion activa para alertar por %q", content.Title)
		return nil
	}

	emails, err := d.fetchRecipientEmails(ctx, accountIDs)
	if err != nil {
		return err
	}
	if len(emails) == 0 {
		log.Printf("[catalogo] no se encontraron correos elegibles para alertar por %q", content.Title)
		return nil
	}

	return d.sendNotification(ctx, content, emails)
}

func (d *Dispatcher) fetchActiveAccountIDs(ctx context.Context) ([]string, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/api/v1/subscriptions/active/accounts", d.subscriptionAPIURL),
		nil,
	)
	if err != nil {
		return nil, err
	}

	res, err := d.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("no se pudo consultar suscripciones activas: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("suscripcion-service devolvio %s al consultar cuentas activas", res.Status)
	}

	var payload activeAccountsResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("no se pudo decodificar cuentas activas: %w", err)
	}

	return payload.CuentaIDs, nil
}

func (d *Dispatcher) fetchRecipientEmails(ctx context.Context, accountIDs []string) ([]string, error) {
	emails := make([]string, 0, len(accountIDs))

	for _, accountID := range accountIDs {
		account, err := d.fetchAccount(ctx, accountID)
		if err != nil {
			log.Printf("[catalogo] no se pudo resolver la cuenta %s para alertas: %v", accountID, err)
			continue
		}

		email := strings.TrimSpace(account.Correo)
		if email == "" || slices.Contains(emails, email) {
			continue
		}

		emails = append(emails, email)
	}

	return emails, nil
}

func (d *Dispatcher) fetchAccount(ctx context.Context, accountID string) (*accountResponse, error) {
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		fmt.Sprintf("%s/api/v1/internal/accounts/%s", d.userAPIURL, accountID),
		nil,
	)
	if err != nil {
		return nil, err
	}

	res, err := d.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("no se pudo consultar usuario-service: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusNotFound {
		return nil, errors.New("cuenta no encontrada")
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("usuario-service devolvio %s", res.Status)
	}

	var payload accountResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("no se pudo decodificar cuenta: %w", err)
	}

	return &payload, nil
}

func (d *Dispatcher) sendNotification(ctx context.Context, content domain.Content, emails []string) error {
	conn, err := grpc.DialContext(
		ctx,
		d.notificationsGRPCTarget,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		return fmt.Errorf("no se pudo conectar con notificaciones-service: %w", err)
	}
	defer conn.Close()

	stub := notificacionesv1.NewNotificacionesServiceClient(conn)
	description := content.Synopsis
	if strings.TrimSpace(description) == "" {
		description = fmt.Sprintf("Nuevo %s disponible en Quetzal TV.", contentTypeLabel(content.Type))
	}

	_, err = stub.EnviarAlertaNuevaPublicacion(ctx, &notificacionesv1.AlertaPublicacionRequest{
		CorreosDestino: emails,
		TituloContenido: content.Title,
		TipoContenido:   string(content.Type),
		Descripcion:     description,
	})
	if err != nil {
		return fmt.Errorf("no se pudo enviar la alerta de publicacion: %w", err)
	}

	log.Printf("[catalogo] alerta de nuevo contenido enviada a %d cuenta(s) por %q", len(emails), content.Title)
	return nil
}

func contentTypeLabel(contentType domain.ContentType) string {
	if contentType == domain.ContentTypeSeries {
		return "serie"
	}
	return "pelicula"
}
