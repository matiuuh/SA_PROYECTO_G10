# Motor inteligente de recomendacion

## Objetivo

Se implemento una seccion personalizada llamada **"Recomendados para ti"** en el panel del usuario. Esta seccion usa un motor de recomendacion basado en contenido/generos, inspirado en los sistemas de recomendacion clasicos usados por plataformas como Netflix.

El sistema analiza:

- Historial reciente de reproduccion del perfil.
- Contenido finalizado o en progreso.
- Calificaciones previas del perfil: `like` y `dislike`.
- Generos asociados al catalogo.
- Porcentaje global de recomendacion del contenido.

## Tipo de algoritmo

El algoritmo implementado es un **sistema de recomendacion basado en contenido**.

La idea principal es construir un perfil de gustos a partir de los generos que el usuario ha visto y calificado. Luego, el sistema compara ese perfil con el resto del catalogo y ordena los contenidos por mayor afinidad.

Reglas principales:

- Si el perfil termino un contenido, sus generos ganan mas peso.
- Si el perfil marco `like`, esos generos ganan mas relevancia.
- Si el perfil marco `dislike`, esos generos reducen su peso.
- El contenido ya visto por el perfil no se recomienda de nuevo.
- Si no hay suficiente historial, se usa la popularidad global del catalogo como respaldo.

## Backend

### Servicio catalogo

Se agrego un endpoint para consultar las calificaciones previas de un perfil:

```http
GET /api/v1/catalog/profile/{perfil_id}/ratings
```

Respuesta:

```json
{
  "calificaciones": [
    {
      "contenido_id": "uuid-del-contenido",
      "perfil_id": "uuid-del-perfil",
      "reaccion": "like"
    }
  ]
}
```

Archivos modificados:

- `backend/services/catalogo/internal/domain/content.go`
- `backend/services/catalogo/internal/application/service.go`
- `backend/services/catalogo/internal/infrastructure/postgres/repository.go`
- `backend/services/catalogo/internal/interfaces/http/handler.go`

### Servicio streaming

Se agrego el endpoint principal del motor:

```http
GET /api/v1/recommendations/{perfil_id}?limit=10
```

Respuesta:

```json
{
  "algoritmo": "basado_en_contenido_generos",
  "titulo_seccion": "Recomendados para ti",
  "recomendaciones": [
    {
      "id": "uuid-del-contenido",
      "titulo": "Nombre del contenido",
      "tipo": "pelicula",
      "sinopsis": "Descripcion",
      "idioma": "es",
      "url_portada": "https://...",
      "fecha_lanzamiento": "2026-06-24",
      "porcentaje_recomendacion": 85,
      "url_trailer": "https://...",
      "puntaje": 7.8,
      "motivo": "Porque viste contenido de Accion"
    }
  ]
}
```

Archivos agregados:

- `backend/services/streaming/internal/application/recommendation.go`
- `backend/services/streaming/internal/infrastructure/catalog/client.go`

Archivos modificados:

- `backend/services/streaming/internal/domain/playback.go`
- `backend/services/streaming/internal/application/service.go`
- `backend/services/streaming/internal/interfaces/http/handler.go`
- `backend/services/streaming/cmd/server/main.go`

## Frontend

En el panel del usuario se agrego la fila:

```text
Recomendados para ti
```

Esta fila se carga solo cuando existe un perfil activo. El frontend consulta el endpoint de `streaming`, convierte la respuesta al formato de tarjetas existente y la muestra antes de las recomendaciones globales.

Archivos modificados:

- `frontend/src/types/streaming.ts`
- `frontend/src/lib/streaming-api.ts`
- `frontend/src/pages/private/PanelPage/PanelPage.tsx`

## Configuracion

El servicio `streaming` necesita conocer la URL HTTP del servicio `catalogo` mediante:

```env
CATALOGO_API_URL=http://catalogo-service:8003
```

Se agrego esta variable en:

- `docker-compose.local.yml`
- `docker-compose.cloud-vm2.yml`
- `backend/deploy/compose/docker-compose.yml`
- `backend/deploy/compose/docker-compose.cloud-vm2.yml`
- `k8s/01-configmap.yaml`
- `k8s/06-streaming.yaml`

## Flujo de ejecucion

1. El frontend detecta el perfil activo.
2. El frontend llama a `GET /api/v1/recommendations/{perfil_id}` en `streaming`.
3. `streaming` consulta el historial reciente del perfil en su base de datos.
4. `streaming` consulta a `catalogo` para obtener:
   - catalogo disponible,
   - detalle de generos,
   - calificaciones del perfil.
5. El motor calcula puntajes por afinidad de generos.
6. El frontend renderiza la seccion **"Recomendados para ti"**.

## Pruebas ejecutadas

Se verifico que los cambios compilen y no rompan pruebas existentes:

```bash
go test ./...
```

Ejecutado en:

- `backend/services/catalogo`
- `backend/services/streaming`

Tambien se valido TypeScript del frontend:

```bash
pnpm -s tsc -b
```

Ejecutado en:

- `frontend`

