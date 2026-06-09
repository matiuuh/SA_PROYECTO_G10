# Servicio Suscripcion

Microservicio para administrar planes, contratacion y cancelacion de suscripciones.

## Alcance inicial

Esta primera version implementa:

- listar planes activos
- crear planes
- contratar suscripcion
- consultar suscripcion por cuenta
- cancelar suscripcion

## Endpoints

- `GET /api/v1/plans`
- `POST /api/v1/plans`
- `POST /api/v1/subscriptions`
- `GET /api/v1/subscriptions/account/{cuenta_id}`
- `GET /api/v1/subscriptions/account/{cuenta_id}/status`
- `POST /api/v1/subscriptions/{suscripcion_id}/cancel`
- `GET /health`

## Ejecutar localmente

```bash
cd backend/services/suscripcion
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

Se recomienda usar `Python 3.12` o `Python 3.13`.

## Variables de entorno

Copiar `.env.example` y ajustar:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quetzal_suscripcion
DB_USER=postgres
DB_PASSWORD=postgres
```
