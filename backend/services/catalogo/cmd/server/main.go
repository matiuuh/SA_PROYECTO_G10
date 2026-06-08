package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	catalogov1 "quetzaltv/services/catalogo/pkg/pb/catalogo/v1"
	"quetzaltv/services/catalogo/internal/application"
	grpchandler "quetzaltv/services/catalogo/internal/interfaces/grpc"
	"quetzaltv/services/catalogo/internal/infrastructure/postgres"
)

func main() {
	dbURL := mustEnv("DATABASE_URL")
	port := getEnv("GRPC_PORT", "5003")

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
	handler := grpchandler.NewHandler(svc)

	grpcServer := grpc.NewServer()
	catalogov1.RegisterCatalogoServiceServer(grpcServer, handler)
	reflection.Register(grpcServer)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatalf("no se pudo iniciar el listener: %v", err)
	}

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
