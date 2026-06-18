from app.domain.models import Plan


class InMemoryPlanRepository:
    def __init__(self) -> None:
        self._plans_by_id: dict[str, Plan] = {}

    def create(self, plan: Plan, actor_account_id: str = "") -> Plan:
        self._plans_by_id[plan.id] = plan
        return plan

    def list_active(self) -> list[Plan]:
        return [plan for plan in self._plans_by_id.values() if plan.activo]

    def get_by_id(self, plan_id: str) -> Plan | None:
        return self._plans_by_id.get(plan_id)
