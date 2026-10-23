from unittest.mock import Mock

from app.services.itunes_client import ItunesClient


def test_itunes_client_sends_search_with_timeout(app, monkeypatch):
    response = Mock()
    response.json.return_value = {"results": [{"trackId": 42}]}
    request = Mock(return_value=response)
    monkeypatch.setattr("app.services.itunes_client.requests.get", request)

    with app.app_context():
        result = ItunesClient().search_tracks("Daft Punk")

    request.assert_called_once_with(
        "https://itunes.apple.com/search",
        params={"term": "Daft Punk", "entity": "song", "limit": 50},
        timeout=10,
    )
    response.raise_for_status.assert_called_once_with()
    assert result == [{"trackId": 42}]
