import os

import anyio
import httpx

os.environ["APP_ENV"] = "test"
os.environ["NOTIFICATIONS_ENABLED"] = "false"

from app.main import app


class ASGITestClient:
    def request(self, method: str, url: str, **kwargs) -> httpx.Response:
        async def send() -> httpx.Response:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as async_client:
                response = await async_client.request(method, url, **kwargs)
                await response.aread()
                return response

        return anyio.run(send)

    def get(self, url: str, **kwargs) -> httpx.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> httpx.Response:
        return self.request("POST", url, **kwargs)

    def patch(self, url: str, **kwargs) -> httpx.Response:
        return self.request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs) -> httpx.Response:
        return self.request("DELETE", url, **kwargs)


client = ASGITestClient()


def test_register_login_and_me_flow() -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Yahir Perez",
            "correo": "yahir@example.com",
            "contrasena": "supersegura123",
            "pais": "Guatemala",
        },
    )
    assert register_response.status_code == 201
    token = register_response.json()["access_token"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["correo"] == "yahir@example.com"

    logout_response = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_response.status_code == 200

    invalidated_me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert invalidated_me_response.status_code == 401


def test_profiles_flow() -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Perfil Demo",
            "correo": "perfiles@example.com",
            "contrasena": "supersegura123",
            "pais": "Guatemala",
        },
    )
    assert register_response.status_code == 201
    token = register_response.json()["access_token"]

    list_response = client.get(
        "/api/v1/profiles",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["es_principal"] is True
    assert list_response.json()[0]["activo"] is True

    create_response = client.post(
        "/api/v1/profiles",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "nombre": "Invitados",
            "color": "#10B981",
            "es_principal": False,
        },
    )
    assert create_response.status_code == 201
    created_profile_id = create_response.json()["id"]

    update_response = client.patch(
        f"/api/v1/profiles/{created_profile_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"es_principal": True},
    )
    assert update_response.status_code == 200
    assert update_response.json()["es_principal"] is True

    updated_list_response = client.get(
        "/api/v1/profiles",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert updated_list_response.status_code == 200
    principal_profiles = [profile for profile in updated_list_response.json() if profile["es_principal"]]
    assert len(principal_profiles) == 1
    assert principal_profiles[0]["id"] == created_profile_id

    delete_principal_response = client.delete(
        f"/api/v1/profiles/{created_profile_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_principal_response.status_code == 409

    second_profile_response = client.post(
        "/api/v1/profiles",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "nombre": "Secundario",
            "color": "#06B6D4",
            "es_principal": False,
        },
    )
    assert second_profile_response.status_code == 201
    second_profile_id = second_profile_response.json()["id"]

    delete_response = client.delete(
        f"/api/v1/profiles/{second_profile_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_response.status_code == 200


def test_sync_profiles_availability_disables_exceeding_profiles() -> None:
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Control de Limite",
            "correo": "limites@example.com",
            "contrasena": "supersegura123",
            "pais": "Guatemala",
        },
    )
    assert register_response.status_code == 201
    token = register_response.json()["access_token"]

    for payload in (
        {"nombre": "Perfil 2", "color": "#10B981", "es_principal": False},
        {"nombre": "Perfil 3", "color": "#06B6D4", "es_principal": False},
    ):
        create_response = client.post(
            "/api/v1/profiles",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
        )
        assert create_response.status_code == 201

    sync_response = client.post(
        "/api/v1/profiles/sync-availability",
        headers={"Authorization": f"Bearer {token}"},
        json={"max_perfiles_activos": 1},
    )
    assert sync_response.status_code == 200

    active_profiles = [profile for profile in sync_response.json() if profile["activo"]]
    inactive_profiles = [profile for profile in sync_response.json() if not profile["activo"]]

    assert len(active_profiles) == 1
    assert active_profiles[0]["es_principal"] is True
    assert len(inactive_profiles) == 2


def test_login_with_invalid_password_returns_401() -> None:
    client.post(
        "/api/v1/auth/register",
        json={
            "nombre": "Otra Persona",
            "correo": "otra@example.com",
            "contrasena": "supersegura123",
            "pais": "Guatemala",
        },
    )

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "correo": "otra@example.com",
            "contrasena": "incorrecta123",
        },
    )
    assert login_response.status_code == 401
