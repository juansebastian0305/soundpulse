from app.extensions import db
from app.models import PipelineRun, Track
from app.services.pipeline import run_pipeline
from app.services.transform import normalize_track


class FakeClient:
    def __init__(self, records):
        self.records = records

    def search_tracks(self, query):
        assert query == "Daft Punk"
        return self.records


def record(track_id=42, title="  Around   the World ", artist=" Daft Punk "):
    return {
        "trackId": track_id,
        "trackName": title,
        "artistName": artist,
        "collectionName": "Homework",
        "releaseDate": "1997-01-20T08:00:00Z",
    }


def test_transform_cleans_and_parses_available_fields():
    normalized = normalize_track(record())

    assert normalized["title"] == "Around the World"
    assert normalized["artist_name"] == "Daft Punk"
    assert normalized["release_date"].isoformat() == "1997-01-20"
    assert normalize_track({"trackId": 1, "trackName": "No artist"}) is None


def test_pipeline_inserts_tracks_and_skips_duplicates(app):
    with app.app_context():
        first = run_pipeline("Daft Punk", FakeClient([record(), {"trackId": 4}]))
        second = run_pipeline("Daft Punk", FakeClient([record()]))

        assert first["status"] == "succeeded"
        assert (first["records_fetched"], first["records_inserted"], first["records_skipped"]) == (2, 1, 1)
        assert (second["records_inserted"], second["records_skipped"]) == (0, 1)
        assert db.session.execute(db.select(db.func.count(Track.id))).scalar_one() == 1
        assert db.session.execute(db.select(db.func.count(PipelineRun.id))).scalar_one() == 2


def test_pipeline_failure_is_recorded(app):
    class FailingClient:
        def search_tracks(self, query):
            raise TimeoutError("source unavailable")

    with app.app_context():
        result = run_pipeline("Daft Punk", FailingClient())

        assert result["status"] == "failed"
        assert result["error_message"] == "source unavailable"
        assert result["finished_at"] is not None
