# ── Stage 1: build ────────────────────────────────────────────────────────────
# Build context: backend/   (docker-compose pasa context: ./backend)
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git protobuf protobuf-dev

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.35.1 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1

WORKDIR /app

COPY services/streaming/go.mod* ./
RUN go mod download

COPY services/streaming/ .
COPY proto /proto

# --go_opt=module=<modulo> deposita los archivos en pkg/pb/streaming/v1/
RUN protoc \
    --proto_path=/proto \
    --go_out=. \
    --go_opt=module=quetzaltv/services/streaming \
    --go-grpc_out=. \
    --go-grpc_opt=module=quetzaltv/services/streaming \
    /proto/streaming/v1/streaming.proto

RUN go mod tidy && go build -o /streaming-service ./cmd/server

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /streaming-service /usr/local/bin/streaming-service

EXPOSE 5004

ENTRYPOINT ["streaming-service"]
