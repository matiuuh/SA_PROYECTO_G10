from datetime import datetime, timezone

from app.domain.models import Profile


class InMemoryProfileRepository:
    def __init__(self) -> None:
        self._profiles: dict[str, Profile] = {}

    def create(self, profile: Profile) -> None:
        if profile.es_principal:
            self._unset_principal(profile.cuenta_id)
        self._profiles[profile.id] = profile

    def list_by_account_id(self, account_id: str) -> list[Profile]:
        profiles = [profile for profile in self._profiles.values() if profile.cuenta_id == account_id]
        return sorted(profiles, key=lambda item: item.creado_en)

    def get_by_id(self, profile_id: str) -> Profile | None:
        return self._profiles.get(profile_id)

    def get_by_name(self, account_id: str, name: str) -> Profile | None:
        normalized_name = name.strip().lower()
        for profile in self._profiles.values():
            if profile.cuenta_id == account_id and profile.nombre.strip().lower() == normalized_name:
                return profile
        return None

    def count_by_account_id(self, account_id: str) -> int:
        return len(self.list_by_account_id(account_id))

    def update(self, profile: Profile) -> None:
        if profile.es_principal:
            self._unset_principal(profile.cuenta_id, exclude_profile_id=profile.id)
        self._profiles[profile.id] = profile

    def delete(self, profile_id: str) -> None:
        profile = self._profiles.pop(profile_id, None)
        if profile is None:
            return

        if profile.es_principal:
            remaining_profiles = self.list_by_account_id(profile.cuenta_id)
            if remaining_profiles:
                promoted = remaining_profiles[0]
                promoted.es_principal = True
                promoted.actualizado_en = datetime.now(timezone.utc)
                self._profiles[promoted.id] = promoted

    def set_pin(self, profile_id: str, pin_hash: str | None) -> None:
        profile = self._profiles.get(profile_id)
        if profile is None:
            return
        profile.pin_restrictivo = pin_hash
        profile.actualizado_en = datetime.now(timezone.utc)
        self._profiles[profile_id] = profile

    def get_pin_hash(self, profile_id: str) -> str | None:
        profile = self._profiles.get(profile_id)
        if profile is None:
            return None
        return profile.pin_restrictivo

    def set_control_parental(self, profile_id: str, nivel: str | None) -> None:
        profile = self._profiles.get(profile_id)
        if profile is None:
            return
        profile.control_parental = nivel
        profile.actualizado_en = datetime.now(timezone.utc)
        self._profiles[profile_id] = profile

    def get_control_parental(self, profile_id: str) -> str | None:
        profile = self._profiles.get(profile_id)
        if profile is None:
            return None
        return profile.control_parental

    def _unset_principal(self, account_id: str, exclude_profile_id: str | None = None) -> None:
        for profile in self._profiles.values():
            if profile.cuenta_id != account_id:
                continue
            if exclude_profile_id is not None and profile.id == exclude_profile_id:
                continue
            if profile.es_principal:
                profile.es_principal = False
                self._profiles[profile.id] = profile
