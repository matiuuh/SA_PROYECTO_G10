from decimal import Decimal
import os
from uuid import uuid4

import anyio
import httpx
import jwt as pyjwt

os.environ["APP_ENV"] = "test"

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

    def put(self, url: str, **kwargs) -> httpx.Response:
        return self.request("PUT", url, **kwargs)


client = ASGITestClient()

JWT_SECRET = "change-me"
JWT_ALGORITHM = "HS256"


def make_token(account_id: str, role: str = "usuario") -> str:
    return pyjwt.encode({"sub": account_id, "role": role}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def auth_header(account_id: str, role: str = "usuario") -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(account_id, role)}"}


def create_plan(
    moneda_base: str = "GTQ",
    perfiles_maximos: int = 4,
    nombre: str | None = None,
) -> dict:
    admin_id = str(uuid4())
    response = client.post(
        "/api/v1/plans",
        headers=auth_header(admin_id, role="administrador"),
        json={
            "nombre": nombre or f"Plan {uuid4()}",
            "descripcion": "Plan de prueba",
            "precio_base": "99.90",
            "moneda_base": moneda_base,
            "perfiles_maximos": perfiles_maximos,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_healthcheck() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_plan_requires_admin_role() -> None:
    response = client.post(
        "/api/v1/plans",
        headers=auth_header(str(uuid4()), role="usuario"),
        json={
            "nombre": "Plan Basico",
            "precio_base": "49.90",
            "moneda_base": "GTQ",
            "perfiles_maximos": 2,
        },
    )
    assert response.status_code == 403


def test_create_plan_requires_authentication() -> None:
    response = client.post(
        "/api/v1/plans",
        headers={"Authorization": "Basic notabearertoken"},
        json={
            "nombre": "Plan Basico",
            "precio_base": "49.90",
            "moneda_base": "GTQ",
            "perfiles_maximos": 2,
        },
    )
    assert response.status_code == 401


def test_create_plan_rejects_invalid_token() -> None:
    response = client.post(
        "/api/v1/plans",
        headers={"Authorization": "Bearer not-a-valid-jwt"},
        json={
            "nombre": "Plan Basico",
            "precio_base": "49.90",
            "moneda_base": "GTQ",
            "perfiles_maximos": 2,
        },
    )
    assert response.status_code == 401


def test_create_plan_rejects_token_without_subject() -> None:
    token = pyjwt.encode({"role": "administrador"}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    response = client.post(
        "/api/v1/plans",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "nombre": "Plan Basico",
            "precio_base": "49.90",
            "moneda_base": "GTQ",
            "perfiles_maximos": 2,
        },
    )
    assert response.status_code == 401


def test_create_plan_and_list_active_plans() -> None:
    plan = create_plan()

    list_response = client.get("/api/v1/plans")
    assert list_response.status_code == 200
    plan_ids = [item["id"] for item in list_response.json()]
    assert plan["id"] in plan_ids


def test_plan_quote_with_matching_local_currency() -> None:
    plan = create_plan(moneda_base="GTQ")

    response = client.get(f"/api/v1/plans/{plan['id']}/quote", params={"pais": "Guatemala"})
    assert response.status_code == 200
    body = response.json()
    assert body["moneda_local"] == "GTQ"
    assert body["conversion_disponible"] is True
    assert Decimal(body["monto_local"]) == Decimal(body["precio_base"])
    assert Decimal(body["tasa_cambio"]) == Decimal("1")


def test_plan_quote_with_unrecognized_country() -> None:
    plan = create_plan(moneda_base="GTQ")

    response = client.get(f"/api/v1/plans/{plan['id']}/quote", params={"pais": "Atlantis"})
    assert response.status_code == 200
    body = response.json()
    assert body["moneda_local"] is None
    assert body["conversion_disponible"] is False
    assert "moneda local" in body["mensaje"]


def test_plan_quote_with_different_currency_falls_back_when_divisas_unreachable() -> None:
    plan = create_plan(moneda_base="USD")

    response = client.get(f"/api/v1/plans/{plan['id']}/quote", params={"pais": "Mexico"})
    assert response.status_code == 200
    body = response.json()
    assert body["moneda_local"] == "MXN"
    assert body["conversion_disponible"] is False
    assert body["monto_local"] is None


def test_plan_quote_not_found() -> None:
    response = client.get(f"/api/v1/plans/{uuid4()}/quote", params={"pais": "Guatemala"})
    assert response.status_code == 404


def test_create_subscription_success_then_duplicate_is_conflict() -> None:
    plan = create_plan()
    account_id = str(uuid4())

    create_response = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )
    assert create_response.status_code == 201
    assert create_response.json()["estado"] == "activa"

    duplicate_response = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )
    assert duplicate_response.status_code == 409


def test_create_subscription_for_another_account_is_forbidden() -> None:
    plan = create_plan()
    account_id = str(uuid4())
    other_account_id = str(uuid4())

    response = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": other_account_id, "plan_id": plan["id"]},
    )
    assert response.status_code == 403


def test_admin_cannot_create_subscription() -> None:
    plan = create_plan()
    admin_id = str(uuid4())
    target_account_id = str(uuid4())

    response = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(admin_id, role="administrador"),
        json={"cuenta_id": target_account_id, "plan_id": plan["id"]},
    )
    assert response.status_code == 403


def test_create_subscription_with_unknown_plan_is_not_found() -> None:
    account_id = str(uuid4())

    response = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": str(uuid4())},
    )
    assert response.status_code == 404


def test_get_subscription_by_account_owner_and_forbidden_for_others() -> None:
    plan = create_plan()
    account_id = str(uuid4())
    other_account_id = str(uuid4())

    client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )

    owner_response = client.get(
        f"/api/v1/subscriptions/account/{account_id}",
        headers=auth_header(account_id),
    )
    assert owner_response.status_code == 200
    assert owner_response.json()["cuenta_id"] == account_id

    forbidden_response = client.get(
        f"/api/v1/subscriptions/account/{account_id}",
        headers=auth_header(other_account_id),
    )
    assert forbidden_response.status_code == 403

    admin_response = client.get(
        f"/api/v1/subscriptions/account/{account_id}",
        headers=auth_header(other_account_id, role="administrador"),
    )
    assert admin_response.status_code == 200


def test_get_subscription_by_account_without_subscription_is_not_found() -> None:
    account_id = str(uuid4())

    response = client.get(
        f"/api/v1/subscriptions/account/{account_id}",
        headers=auth_header(account_id),
    )
    assert response.status_code == 404


def test_get_subscription_status_by_account() -> None:
    plan = create_plan()
    account_id = str(uuid4())
    without_subscription_id = str(uuid4())

    client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )

    with_response = client.get(
        f"/api/v1/subscriptions/account/{account_id}/status",
        headers=auth_header(account_id),
    )
    assert with_response.status_code == 200
    assert with_response.json()["tiene_suscripcion"] is True
    assert with_response.json()["suscripcion"]["cuenta_id"] == account_id
    assert with_response.json()["puede_descargar"] is False

    without_response = client.get(
        f"/api/v1/subscriptions/account/{without_subscription_id}/status",
        headers=auth_header(without_subscription_id),
    )
    assert without_response.status_code == 200
    assert without_response.json()["tiene_suscripcion"] is False
    assert without_response.json()["suscripcion"] is None
    assert without_response.json()["puede_descargar"] is False


def test_subscription_status_allows_downloads_only_for_premium() -> None:
    premium_plan = create_plan(nombre="  PREMIUM  ")
    account_id = str(uuid4())

    client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": premium_plan["id"]},
    )

    response = client.get(
        f"/api/v1/subscriptions/account/{account_id}/status",
        headers=auth_header(account_id),
    )

    assert response.status_code == 200
    assert response.json()["puede_descargar"] is True


def test_get_subscription_status_by_account_forbidden_for_other_user() -> None:
    account_id = str(uuid4())
    other_account_id = str(uuid4())

    response = client.get(
        f"/api/v1/subscriptions/account/{account_id}/status",
        headers=auth_header(other_account_id),
    )
    assert response.status_code == 403


def test_change_subscription_plan_on_cancelled_subscription_is_conflict() -> None:
    plan = create_plan()
    other_plan = create_plan()
    account_id = str(uuid4())

    created = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )
    subscription_id = created.json()["id"]

    client.post(
        f"/api/v1/subscriptions/{subscription_id}/cancel",
        headers=auth_header(account_id),
    )

    response = client.put(
        f"/api/v1/subscriptions/{subscription_id}/plan",
        headers=auth_header(account_id),
        json={"plan_id": other_plan["id"]},
    )
    assert response.status_code == 409


def test_change_subscription_plan_for_other_account_is_forbidden() -> None:
    plan = create_plan()
    other_plan = create_plan()
    account_id = str(uuid4())
    other_account_id = str(uuid4())

    created = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )
    subscription_id = created.json()["id"]

    response = client.put(
        f"/api/v1/subscriptions/{subscription_id}/plan",
        headers=auth_header(other_account_id),
        json={"plan_id": other_plan["id"]},
    )
    assert response.status_code == 403


def test_admin_cannot_change_subscription_plan() -> None:
    plan = create_plan()
    other_plan = create_plan()
    account_id = str(uuid4())
    admin_id = str(uuid4())

    created = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )
    subscription_id = created.json()["id"]

    response = client.put(
        f"/api/v1/subscriptions/{subscription_id}/plan",
        headers=auth_header(admin_id, role="administrador"),
        json={"plan_id": other_plan["id"]},
    )
    assert response.status_code == 403


def test_change_subscription_plan_success_and_errors() -> None:
    original_plan = create_plan()
    new_plan = create_plan()
    account_id = str(uuid4())

    created = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": original_plan["id"]},
    )
    subscription_id = created.json()["id"]

    change_response = client.put(
        f"/api/v1/subscriptions/{subscription_id}/plan",
        headers=auth_header(account_id),
        json={"plan_id": new_plan["id"]},
    )
    assert change_response.status_code == 200
    assert change_response.json()["plan_id"] == new_plan["id"]

    same_plan_response = client.put(
        f"/api/v1/subscriptions/{subscription_id}/plan",
        headers=auth_header(account_id),
        json={"plan_id": new_plan["id"]},
    )
    assert same_plan_response.status_code == 409

    unknown_plan_response = client.put(
        f"/api/v1/subscriptions/{subscription_id}/plan",
        headers=auth_header(account_id),
        json={"plan_id": str(uuid4())},
    )
    assert unknown_plan_response.status_code == 404

    unknown_subscription_response = client.put(
        f"/api/v1/subscriptions/{uuid4()}/plan",
        headers=auth_header(account_id),
        json={"plan_id": original_plan["id"]},
    )
    assert unknown_subscription_response.status_code == 404


def test_cancel_subscription_success_and_errors() -> None:
    plan = create_plan()
    account_id = str(uuid4())

    created = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )
    subscription_id = created.json()["id"]

    cancel_response = client.post(
        f"/api/v1/subscriptions/{subscription_id}/cancel",
        headers=auth_header(account_id),
    )
    assert cancel_response.status_code == 200
    assert cancel_response.json()["message"]

    already_cancelled_response = client.post(
        f"/api/v1/subscriptions/{subscription_id}/cancel",
        headers=auth_header(account_id),
    )
    assert already_cancelled_response.status_code == 409

    unknown_subscription_response = client.post(
        f"/api/v1/subscriptions/{uuid4()}/cancel",
        headers=auth_header(account_id),
    )
    assert unknown_subscription_response.status_code == 404


def test_cancel_subscription_for_other_account_is_forbidden() -> None:
    plan = create_plan()
    account_id = str(uuid4())
    other_account_id = str(uuid4())

    created = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )
    subscription_id = created.json()["id"]

    response = client.post(
        f"/api/v1/subscriptions/{subscription_id}/cancel",
        headers=auth_header(other_account_id),
    )
    assert response.status_code == 403


def test_admin_cannot_cancel_subscription() -> None:
    plan = create_plan()
    account_id = str(uuid4())
    admin_id = str(uuid4())

    created = client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )
    subscription_id = created.json()["id"]

    response = client.post(
        f"/api/v1/subscriptions/{subscription_id}/cancel",
        headers=auth_header(admin_id, role="administrador"),
    )
    assert response.status_code == 403


def test_list_active_subscription_accounts_includes_created_account() -> None:
    plan = create_plan()
    account_id = str(uuid4())
    admin_id = str(uuid4())

    client.post(
        "/api/v1/subscriptions",
        headers=auth_header(account_id),
        json={"cuenta_id": account_id, "plan_id": plan["id"]},
    )

    response = client.get(
        "/api/v1/subscriptions/active/accounts",
        headers=auth_header(admin_id, role="administrador"),
    )
    assert response.status_code == 200
    assert account_id in response.json()["cuenta_ids"]


def test_list_active_subscription_accounts_requires_admin() -> None:
    account_id = str(uuid4())

    missing_token_response = client.get("/api/v1/subscriptions/active/accounts")
    assert missing_token_response.status_code == 422

    user_response = client.get(
        "/api/v1/subscriptions/active/accounts",
        headers=auth_header(account_id),
    )
    assert user_response.status_code == 403
