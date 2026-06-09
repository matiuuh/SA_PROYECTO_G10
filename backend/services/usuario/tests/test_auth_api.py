from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


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

    delete_response = client.delete(
        f"/api/v1/profiles/{created_profile_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_response.status_code == 200


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
