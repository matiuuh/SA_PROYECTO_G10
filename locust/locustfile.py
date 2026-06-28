"""
Locust — Pruebas de carga ligera · Quetzal TV
=============================================
Simula dos perfiles de usuario concurrente:

  UsuarioAnonimo      — navega catálogo, planes y divisas sin autenticarse.
  UsuarioAutenticado  — inicia sesión, consulta su perfil y recomendaciones.

Uso rápido (modo headless, genera reporte HTML):
  locust -f locust/locustfile.py \
    --headless \
    --users 50 \
    --spawn-rate 5 \
    --run-time 60s \
    --host http://34.16.29.121 \
    --html locust/reporte.html

Variables de entorno opcionales para el usuario autenticado:
  LOCUST_EMAIL     correo de una cuenta existente (default: test@quetzaltv.com)
  LOCUST_PASSWORD  contraseña                     (default: Test1234!)
"""

import os
import random
import logging

from locust import HttpUser, task, between, events

# ── Credenciales de prueba ────────────────────────────────────────────────────
TEST_EMAIL    = os.getenv("LOCUST_EMAIL",    "test@quetzaltv.com")
TEST_PASSWORD = os.getenv("LOCUST_PASSWORD", "Test1234!")

# ── Palabras de búsqueda para variar las peticiones ──────────────────────────
SEARCH_TERMS = ["accion", "drama", "comedia", "terror", "aventura", "anime"]


# ─────────────────────────────────────────────────────────────────────────────
# USUARIO ANÓNIMO
# Simula a alguien que navega la plataforma sin cuenta.
# Peso: 70 % del tráfico total.
# ─────────────────────────────────────────────────────────────────────────────
class UsuarioAnonimo(HttpUser):
    weight      = 7
    wait_time   = between(1, 3)

    @task(1)
    def health_gateway(self):
        self.client.get("/health", name="GET /health")

    @task(5)
    def ver_catalogo(self):
        self.client.get(
            "/api/catalogo/api/v1/catalog",
            name="GET /api/catalogo — listado",
        )

    @task(3)
    def buscar_contenido(self):
        termino = random.choice(SEARCH_TERMS)
        self.client.get(
            f"/api/catalogo/api/v1/catalog/search?q={termino}",
            name="GET /api/catalogo — búsqueda",
        )

    @task(2)
    def ver_planes(self):
        self.client.get(
            "/api/suscripcion/api/v1/plans",
            name="GET /api/suscripcion — planes",
        )

    @task(2)
    def ver_monedas(self):
        self.client.get(
            "/api/divisas/api/v1/monedas",
            name="GET /api/divisas — monedas",
        )

    @task(2)
    def ver_tipo_cambio(self):
        origen  = random.choice(["USD", "EUR", "MXN"])
        destino = "GTQ"
        self.client.get(
            f"/api/divisas/api/v1/tipo-cambio?moneda_origen={origen}&moneda_destino={destino}",
            name="GET /api/divisas — tipo de cambio",
        )

    @task(1)
    def ruta_protegida_sin_token(self):
        """Verifica que el gateway rechaza correctamente con 401."""
        with self.client.get(
            "/api/usuario/api/v1/auth/me",
            name="GET /api/usuario/me — sin JWT (debe ser 401)",
            catch_response=True,
        ) as resp:
            if resp.status_code == 401:
                resp.success()
            else:
                resp.failure(f"Esperado 401, obtenido {resp.status_code}")


# ─────────────────────────────────────────────────────────────────────────────
# USUARIO AUTENTICADO
# Inicia sesión en on_start, luego usa el token JWT en cada tarea.
# Peso: 30 % del tráfico total.
# ─────────────────────────────────────────────────────────────────────────────
class UsuarioAutenticado(HttpUser):
    weight    = 3
    wait_time = between(2, 5)

    def on_start(self):
        """Inicia sesión y guarda el JWT para las tareas siguientes."""
        self.token      = None
        self.perfil_id  = None
        self._login()

    def _login(self):
        resp = self.client.post(
            "/api/usuario/api/v1/auth/login",
            json={"correo": TEST_EMAIL, "contrasena": TEST_PASSWORD},
            name="POST /api/usuario — login",
        )
        if resp.status_code == 200:
            data = resp.json()
            self.token = data.get("access_token") or data.get("token")
        else:
            logging.warning(
                "Login falló (%s) — tareas autenticadas se saltarán",
                resp.status_code,
            )

    def _auth_headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @task(3)
    def ver_mi_cuenta(self):
        if not self.token:
            return
        with self.client.get(
            "/api/usuario/api/v1/auth/me",
            headers=self._auth_headers(),
            name="GET /api/usuario/me — autenticado",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 401:
                # Token expiró — volver a loguear
                self._login()
                resp.failure("Token expirado — relogin")
            else:
                resp.failure(f"Error inesperado: {resp.status_code}")

    @task(4)
    def ver_catalogo_autenticado(self):
        self.client.get(
            "/api/catalogo/api/v1/catalog",
            headers=self._auth_headers(),
            name="GET /api/catalogo — autenticado",
        )

    @task(2)
    def ver_planes_autenticado(self):
        self.client.get(
            "/api/suscripcion/api/v1/plans",
            headers=self._auth_headers(),
            name="GET /api/suscripcion — planes (autenticado)",
        )

    @task(1)
    def convertir_moneda(self):
        self.client.post(
            "/api/divisas/api/v1/convertir",
            json={
                "monto": round(random.uniform(10, 500), 2),
                "moneda_origen": random.choice(["USD", "EUR", "MXN"]),
                "moneda_destino": "GTQ",
            },
            headers=self._auth_headers(),
            name="POST /api/divisas — convertir",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Eventos — imprime resumen al finalizar
# ─────────────────────────────────────────────────────────────────────────────
@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    stats = environment.runner.stats.total
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║         RESUMEN — Prueba de carga Quetzal TV        ║")
    print("╚══════════════════════════════════════════════════════╝")
    print(f"  Peticiones totales : {stats.num_requests}")
    print(f"  Fallos             : {stats.num_failures}")
    print(f"  RPS promedio       : {stats.current_rps:.1f}")
    print(f"  Tiempo resp. medio : {stats.avg_response_time:.0f} ms")
    print(f"  Tiempo resp. p95   : {stats.get_response_time_percentile(0.95):.0f} ms")
    print(f"  Tiempo resp. p99   : {stats.get_response_time_percentile(0.99):.0f} ms")
    print("")
