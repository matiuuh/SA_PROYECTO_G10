package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"cloud.google.com/go/storage"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	streamingv1 "quetzaltv/services/streaming/pkg/pb/streaming/v1"
	"quetzaltv/services/streaming/internal/application"
	gcsstorage "quetzaltv/services/streaming/internal/infrastructure/gcs"
	grpchandler "quetzaltv/services/streaming/internal/interfaces/grpc"
	httphandler "quetzaltv/services/streaming/internal/interfaces/http"
	"quetzaltv/services/streaming/internal/infrastructure/postgres"
)

func main() {
	dbURL := mustEnv("DATABASE_URL")
	port := getEnv("GRPC_PORT", "5004")
	httpPort := getEnv("HTTP_PORT", "8004")

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

	gcsBucket := mustEnv("GCS_BUCKET")
	gcsFolder := getEnv("GCS_TRAILERS_FOLDER", "trailers")
	ttlMinutes := 30

	gcsClient, err := storage.NewClient(ctx)
	if err != nil {
		log.Fatalf("no se pudo crear el cliente de GCS: %v", err)
	}
	defer gcsClient.Close()

	trailerRepo := gcsstorage.NewTrailerRepository(gcsClient, gcsBucket, gcsFolder, time.Duration(ttlMinutes)*time.Minute)
	episodeRepo := gcsstorage.NewEpisodeRepository(gcsClient, gcsBucket, time.Duration(ttlMinutes)*time.Minute)

	repo := postgres.NewPlaybackRepository(pool)
	svc := application.New(repo, trailerRepo, episodeRepo)
	handler := grpchandler.NewHandler(svc)
	httpHandler := httphandler.NewHandler(svc)

	grpcServer := grpc.NewServer()
	streamingv1.RegisterStreamingServiceServer(grpcServer, handler)
	reflection.Register(grpcServer)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatalf("no se pudo iniciar el listener: %v", err)
	}

	httpMux := http.NewServeMux()
	httpHandler.RegisterRoutes(httpMux)

	go func() {
		log.Printf("streaming-service HTTP escuchando en :%s", httpPort)
		if err := http.ListenAndServe(fmt.Sprintf(":%s", httpPort), httpMux); err != nil {
			log.Fatalf("error al servir HTTP: %v", err)
		}
	}()

	log.Printf("streaming-service escuchando en :%s", port)
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
