El flujo de despliegue es:
  1. SSH a la VM
  2. git pull del repo
  3. Crear/actualizar el .env con los secretos
  4. docker compose -f docker-compose.cloud.yml up -d --build