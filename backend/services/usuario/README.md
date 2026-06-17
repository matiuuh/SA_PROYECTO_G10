# Servicio Usuario

Microservicio de autenticacion y gestion base de cuentas para `Quetzal TV`.

## Alcance inicial

Esta primera version implementa:

- registro de cuenta
- inicio de sesion
- consulta del usuario autenticado
- cierre de sesion
- gestion de perfiles por cuenta
- servidor gRPC para validacion de token y consulta de cuentas

La implementacion soporta dos modos:

- `inmemory`: para pruebas rapidas
- `postgres`: para trabajar con la base real del servicio

## Estructura

```text
usuario/
├── app/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   ├── interfaces/
│   └── main.py
├── database/
├── tests/
├── requirements.txt
├── Dockerfile
└── .env.example
```

## Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/profiles`
- `POST /api/v1/profiles`
- `PATCH /api/v1/profiles/{profile_id}`
- `POST /api/v1/profiles/sync-availability`
- `DELETE /api/v1/profiles/{profile_id}`
- `GET /health`

## gRPC

Puerto por defecto: `5001`

Operaciones expuestas:

- `ValidateToken`
- `GetAccountById`
- `GetAccountByEmail`

## Ejecutar localmente

```bash
cd backend/services/usuario
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Se recomienda usar `Python 3.12` o `Python 3.13`. Con `Python 3.14` algunas dependencias pueden intentar compilar componentes nativos y fallar en Windows si no estan instalados los compiladores de Visual C++.

## Variables de entorno

Copiar `.env.example` y ajustar valores si hace falta.

Si quieres usar PostgreSQL real, define:

```env
STORAGE_BACKEND=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quetzal_usuario
DB_USER=postgres
DB_PASSWORD=postgres
```

## Reglas de perfiles

- al registrar una cuenta se crea automaticamente un perfil principal
- cada cuenta puede tener hasta `5` perfiles
- un perfil puede quedar inactivo si la suscripcion actual ya no permite mantenerlo habilitado
- no se puede dejar una cuenta sin perfiles
- si se elimina el perfil principal, el sistema promueve otro automaticamente
