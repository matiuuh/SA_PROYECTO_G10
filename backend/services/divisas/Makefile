PROTO_DIR := ../../proto
PROTO_FILE := $(PROTO_DIR)/divisas/v1/divisas.proto

.PHONY: build run dev clean

# Compila el TypeScript a dist/
build:
	npm run build

# Ejecuta el servidor compilado
run: build
	node dist/server.js

# Ejecuta en modo desarrollo con ts-node (sin compilar)
dev:
	npx ts-node src/server.ts

# Limpia artefactos de compilación
clean:
	rm -rf dist/
