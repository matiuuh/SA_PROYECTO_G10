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
