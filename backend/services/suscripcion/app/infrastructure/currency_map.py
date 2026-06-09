COUNTRY_TO_CURRENCY: dict[str, str] = {
    "argentina": "ARS",
    "bolivia": "BOB",
    "brasil": "BRL",
    "canada": "CAD",
    "chile": "CLP",
    "colombia": "COP",
    "costa rica": "CRC",
    "cuba": "CUP",
    "ecuador": "USD",
    "el salvador": "USD",
    "espana": "EUR",
    "estados unidos": "USD",
    "guatemala": "GTQ",
    "honduras": "HNL",
    "mexico": "MXN",
    "nicaragua": "NIO",
    "panama": "USD",
    "paraguay": "PYG",
    "peru": "PEN",
    "puerto rico": "USD",
    "republica dominicana": "DOP",
    "uruguay": "UYU",
    "venezuela": "VES",
}


def currency_from_country(country: str) -> str | None:
    normalized = country.strip().lower()
    return COUNTRY_TO_CURRENCY.get(normalized)
