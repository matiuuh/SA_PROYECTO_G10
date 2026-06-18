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

	"quetzaltv/services/catalogo/internal/application"
	"quetzaltv/services/catalogo/internal/infrastructure/alerts"
	gcsstorage "quetzaltv/services/catalogo/internal/infrastructure/gcs"
	"quetzaltv/services/catalogo/internal/infrastructure/postgres"
	grpchandler "quetzaltv/services/catalogo/internal/interfaces/grpc"
	httphandler "quetzaltv/services/catalogo/internal/interfaces/http"
	catalogov1 "quetzaltv/services/catalogo/pkg/pb/catalogo/v1"
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

	var userPool *pgxpool.Pool
	if userDBURL := os.Getenv("USUARIO_DATABASE_URL"); userDBURL != "" {
		userPool, err = pgxpool.New(ctx, userDBURL)
		if err != nil {
			log.Printf("[catalogo] advertencia: no se pudo conectar a usuarios para auditoria: %v", err)
		} else if err := userPool.Ping(ctx); err != nil {
			log.Printf("[catalogo] advertencia: ping a usuarios para auditoria fallo: %v", err)
			userPool.Close()
			userPool = nil
		} else {
			defer userPool.Close()
			log.Println("[catalogo] resolucion de correos para auditoria habilitada")
		}
	}

	gcsBucket := getEnv("GCS_BUCKET", "")
	gcsFolder := getEnv("GCS_TRAILERS_FOLDER", "trailers")

	var uploader *gcsstorage.Uploader
	if gcsBucket != "" {
		gcsClient, err := storage.NewClient(ctx)
		if err != nil {
			log.Printf("[catalogo] advertencia: no se pudo crear el cliente GCS, subida de trailers deshabilitada: %v", err)
		} else {
			defer gcsClient.Close()
			uploader = gcsstorage.NewUploader(gcsClient, gcsBucket, gcsFolder, 15*time.Minute)
			log.Printf("[catalogo] GCS habilitado: bucket=%s folder=%s", gcsBucket, gcsFolder)
		}
	} else {
		log.Println("[catalogo] GCS_BUCKET no configurado, subida de trailers deshabilitada")
	}

	repo := postgres.NewContentRepositoryWithUserDB(pool, userPool)
	svc := application.New(repo)
	alertDispatcher := alerts.NewDispatcherFromEnv()
	alerts.StartPublicationAlertScheduler(ctx, svc, alertDispatcher, time.Minute)
	handler := grpchandler.NewHandler(svc, alertDispatcher)
	httpHandler := httphandler.NewHandler(svc, alertDispatcher, uploader)

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
