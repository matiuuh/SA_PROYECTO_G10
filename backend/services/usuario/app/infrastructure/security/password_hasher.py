import base64
import hashlib
import hmac
import os


class PasswordHasher:
    def __init__(self) -> None:
        self._iterations = 100_000

    def hash(self, raw_password: str) -> str:
        salt = os.urandom(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            raw_password.encode("utf-8"),
            salt,
            self._iterations,
        )
        salt_b64 = base64.b64encode(salt).decode("utf-8")
        digest_b64 = base64.b64encode(digest).decode("utf-8")
        return f"pbkdf2_sha256${self._iterations}${salt_b64}${digest_b64}"

    def verify(self, raw_password: str, hashed_password: str) -> bool:
        algorithm, iterations, salt_b64, expected_digest_b64 = hashed_password.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False

        salt = base64.b64decode(salt_b64.encode("utf-8"))
        expected_digest = base64.b64decode(expected_digest_b64.encode("utf-8"))
        actual_digest = hashlib.pbkdf2_hmac(
            "sha256",
            raw_password.encode("utf-8"),
            salt,
            int(iterations),
        )
        return hmac.compare_digest(actual_digest, expected_digest)
