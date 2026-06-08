from app.domain.models import Session


class InMemorySessionRepository:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}

    def create(self, session: Session) -> None:
        self._sessions[session.id] = session

    def get_by_id(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    def update(self, session: Session) -> None:
        self._sessions[session.id] = session
