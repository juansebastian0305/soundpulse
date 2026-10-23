from typing import Any

import requests
from flask import current_app


ITUNES_SEARCH_URL = "https://itunes.apple.com/search"


class ItunesClient:
    def search_tracks(self, query: str) -> list[dict[str, Any]]:
        response = requests.get(
            ITUNES_SEARCH_URL,
            params={"term": query, "entity": "song", "limit": 50},
            timeout=current_app.config["ITUNES_TIMEOUT_SECONDS"],
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
            raise ValueError("The music API returned an invalid response.")
        return payload["results"]
