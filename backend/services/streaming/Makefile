PROTO_DIR   := ../../proto
OUT_DIR     := .

.PHONY: proto build run tidy test

# Genera el codigo Go a partir del .proto.
# --go_opt=module=<modulo> deposita los archivos en pkg/pb/streaming/v1/
# Requiere: protoc, protoc-gen-go, protoc-gen-go-grpc
proto:
	protoc \
		--proto_path=$(PROTO_DIR) \
		--go_out=$(OUT_DIR) \
		--go_opt=module=quetzaltv/services/streaming \
		--go-grpc_out=$(OUT_DIR) \
		--go-grpc_opt=module=quetzaltv/services/streaming \
		$(PROTO_DIR)/streaming/v1/streaming.proto
	@echo "Proto generado en pkg/pb/streaming/v1/"

build: proto
	go build -o bin/streaming-service ./cmd/server

run: build
	./bin/streaming-service

tidy:
	go mod tidy

test:
	go test -cover ./internal/application ./internal/domain
