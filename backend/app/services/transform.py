from datetime import date
from typing import Any


def normalize_track(record: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(record, dict):
        return None
    external_id = record.get("trackId")
    title = _clean_text(record.get("trackName"))
    artist_name = _clean_text(record.get("artistName"))
    if external_id is None or not title or not artist_name:
        return None

    release_date = None
    raw_release_date = record.get("releaseDate")
    if isinstance(raw_release_date, str):
        try:
            release_date = date.fromisoformat(raw_release_date[:10])
        except ValueError:
            pass

    return {
        "source": "itunes",
        "external_id": str(external_id),
        "title": title,
        "artist_name": artist_name,
        "album_name": _clean_text(record.get("collectionName")),
        "release_date": release_date,
        "artwork_url": _clean_text(record.get("artworkUrl100")),
        "source_url": _clean_text(record.get("trackViewUrl")),
    }


def _clean_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.split())
    return cleaned or None
