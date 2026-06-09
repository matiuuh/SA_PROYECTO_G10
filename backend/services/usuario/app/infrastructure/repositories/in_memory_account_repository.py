from app.domain.models import Account


class InMemoryAccountRepository:
    def __init__(self) -> None:
        self._accounts_by_id: dict[str, Account] = {}
        self._accounts_by_email: dict[str, Account] = {}

    def create(self, account: Account) -> None:
        self._accounts_by_id[account.id] = account
        self._accounts_by_email[account.correo.lower()] = account

    def get_by_email(self, email: str) -> Account | None:
        return self._accounts_by_email.get(email.lower())

    def get_by_id(self, account_id: str) -> Account | None:
        return self._accounts_by_id.get(account_id)
