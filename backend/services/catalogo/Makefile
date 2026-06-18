PROTO_DIR   := ../../proto
OUT_DIR     := .

.PHONY: proto build run tidy test

# Genera el codigo Go a partir del .proto.
# --go_opt=module=<modulo> deposita los archivos en pkg/pb/catalogo/v1/
# Requiere: protoc, protoc-gen-go, protoc-gen-go-grpc
proto:
	protoc \
		--proto_path=$(PROTO_DIR) \
		--go_out=$(OUT_DIR) \
		--go_opt=module=quetzaltv/services/catalogo \
		--go-grpc_out=$(OUT_DIR) \
		--go-grpc_opt=module=quetzaltv/services/catalogo \
		$(PROTO_DIR)/catalogo/v1/catalogo.proto \
		$(PROTO_DIR)/notificaciones/v1/notificaciones.proto
	@echo "Proto generado en pkg/pb/catalogo/v1/ y pkg/pb/notificaciones/v1/"

build: proto
	go build -o bin/catalogo-service ./cmd/server

run: build
	./bin/catalogo-service

tidy:
	go mod tidy

test:
	go test -cover ./internal/application ./internal/domain
