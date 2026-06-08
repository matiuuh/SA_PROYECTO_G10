# Servicio Usuario

Microservicio de autenticacion y gestion base de cuentas para `Quetzal TV`.

## Alcance inicial

Esta primera version implementa:

- registro de cuenta
- inicio de sesion
- consulta del usuario autenticado
- cierre de sesion

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
- `GET /health`

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

## Siguiente paso sugerido

Agregar migraciones versionadas y luego extender autenticacion con `refresh tokens`, `oauth` y manejo de perfiles.
