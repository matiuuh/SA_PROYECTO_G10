package alerts

import (
	"context"
	"log"
	"time"

	"quetzaltv/services/catalogo/internal/domain"
)

type PublicationAlertStore interface {
	ListPendingPublicationAlerts(ctx context.Context, limit int) ([]domain.Content, error)
	MarkPublicationAlertSent(ctx context.Context, contentID string) error
}

func StartPublicationAlertScheduler(ctx context.Context, store PublicationAlertStore, dispatcher *Dispatcher, interval time.Duration) {
	if store == nil || dispatcher == nil {
		return
	}
	if interval <= 0 {
		interval = time.Minute
	}

	go func() {
		runPublicationAlertCycle(ctx, store, dispatcher)

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				runPublicationAlertCycle(ctx, store, dispatcher)
			}
		}
	}()
}

func runPublicationAlertCycle(ctx context.Context, store PublicationAlertStore, dispatcher *Dispatcher) {
	cycleCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	contents, err := store.ListPendingPublicationAlerts(cycleCtx, 50)
	if err != nil {
		log.Printf("[catalogo] no se pudieron listar alertas de publicacion pendientes: %v", err)
		return
	}

	for _, content := range contents {
		if err := dispatcher.DispatchNewContentAlert(cycleCtx, content); err != nil {
			log.Printf("[catalogo] fallo al despachar alerta programada para %q: %v", content.Title, err)
			continue
		}
		if err := store.MarkPublicationAlertSent(cycleCtx, content.ID); err != nil {
			log.Printf("[catalogo] no se pudo marcar alerta de publicacion para %q: %v", content.Title, err)
		}
	}
}
