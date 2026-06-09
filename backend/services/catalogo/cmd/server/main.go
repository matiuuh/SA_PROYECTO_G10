package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	catalogov1 "quetzaltv/services/catalogo/pkg/pb/catalogo/v1"
	"quetzaltv/services/catalogo/internal/application"
	grpchandler "quetzaltv/services/catalogo/internal/interfaces/grpc"
	httphandler "quetzaltv/services/catalogo/internal/interfaces/http"
	"quetzaltv/services/catalogo/internal/infrastructure/alerts"
	"quetzaltv/services/catalogo/internal/infrastructure/postgres"
)

func main() {
	dbURL := mustEnv("DATABASE_URL")
	port := getEnv("GRPC_PORT", "5003")
	httpPort := getEnv("HTTP_PORT", "8003")

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("no se pudo conectar a la base de datos: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping a la base de datos fallo: %v", err)
	}
	log.Println("conexion a postgres establecida")

	repo := postgres.NewContentRepository(pool)
	svc := application.New(repo)
	alertDispatcher := alerts.NewDispatcherFromEnv()
	handler := grpchandler.NewHandler(svc, alertDispatcher)
	httpHandler := httphandler.NewHandler(svc, alertDispatcher)

	grpcServer := grpc.NewServer()
	catalogov1.RegisterCatalogoServiceServer(grpcServer, handler)
	reflection.Register(grpcServer)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatalf("no se pudo iniciar el listener: %v", err)
	}

	httpMux := http.NewServeMux()
	httpHandler.RegisterRoutes(httpMux)

	go func() {
		log.Printf("catalogo-service HTTP escuchando en :%s", httpPort)
		if err := http.ListenAndServe(fmt.Sprintf(":%s", httpPort), httpMux); err != nil {
			log.Fatalf("error al servir HTTP: %v", err)
		}
	}()

	log.Printf("catalogo-service escuchando en :%s", port)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("error al servir gRPC: %v", err)
	}
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("variable de entorno requerida no definida: %s", key)
	}
	return v
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
