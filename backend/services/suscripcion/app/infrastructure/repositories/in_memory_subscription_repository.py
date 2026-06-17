from app.domain.models import Subscription


class InMemorySubscriptionRepository:
    def __init__(self) -> None:
        self._subscriptions_by_id: dict[str, Subscription] = {}

    def create(self, subscription: Subscription) -> Subscription:
        self._subscriptions_by_id[subscription.id] = subscription
        return subscription

    def get_active_by_account_id(self, account_id: str) -> Subscription | None:
        candidates = [
            subscription
            for subscription in self._subscriptions_by_id.values()
            if subscription.cuenta_id == account_id and subscription.estado == "activa"
        ]
        if not candidates:
            return None
        return sorted(candidates, key=lambda subscription: subscription.creado_en)[-1]

    def list_active_account_ids(self) -> list[str]:
        account_ids = {
            subscription.cuenta_id
            for subscription in self._subscriptions_by_id.values()
            if subscription.estado == "activa"
        }
        return sorted(account_ids)

    def get_by_id(self, subscription_id: str) -> Subscription | None:
        return self._subscriptions_by_id.get(subscription_id)

    def update(self, subscription: Subscription) -> Subscription:
        self._subscriptions_by_id[subscription.id] = subscription
        return subscription
