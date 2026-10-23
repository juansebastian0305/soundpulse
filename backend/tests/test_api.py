from datetime import datetime, timezone

from app.extensions import db
from app.models import PipelineRun, Track


def test_health_and_empty_dashboard(client):
    assert client.get("/api/v1/health").status_code == 200
    response = client.get("/api/v1/dashboard")

    assert response.status_code == 200
    assert response.json["metrics"] == {
        "total_tracks": 0,
        "unique_artists": 0,
        "total_runs": 0,
        "last_run": None,
    }
    assert response.json["recent_tracks"] == []


def test_dashboard_and_track_search_use_stored_data(app, client):
    with app.app_context():
        run = PipelineRun(
            query="Daft Punk",
            status="succeeded",
            started_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            finished_at=datetime(2026, 1, 1, 0, 0, 1, tzinfo=timezone.utc),
            records_fetched=1,
            records_inserted=1,
        )
        db.session.add(run)
        db.session.flush()
        db.session.add(
            Track(
                source="itunes",
                external_id="42",
                title="Around the World",
                artist_name="Daft Punk",
                pipeline_run_id=run.id,
            )
        )
        db.session.commit()

    dashboard = client.get("/api/v1/dashboard").json
    tracks = client.get("/api/v1/tracks?q=Daft&page=1&per_page=1").json

    assert dashboard["metrics"]["total_tracks"] == 1
    assert dashboard["metrics"]["unique_artists"] == 1
    assert dashboard["metrics"]["total_runs"] == 1
    assert dashboard["activity"][0]["records_inserted"] == 1
    assert tracks["items"][0]["title"] == "Around the World"
    assert tracks["pagination"]["total"] == 1


def test_pipeline_endpoint_validates_query(client):
    response = client.post("/api/v1/pipelines/run", json={"query": " "})

    assert response.status_code == 400
    assert response.json["error"]["code"] == "invalid_query"


def test_pipeline_run_history_endpoints(client, monkeypatch):
    from app.api import routes

    monkeypatch.setattr(
        routes,
        "run_pipeline",
        lambda query: {
            "id": 1,
            "query": query,
            "status": "succeeded",
            "records_fetched": 1,
            "records_inserted": 1,
            "records_skipped": 0,
            "error_message": None,
            "started_at": "2026-01-01T00:00:00+00:00",
            "finished_at": "2026-01-01T00:00:01+00:00",
        },
    )
    response = client.post("/api/v1/pipelines/run", json={"query": "Daft Punk"})

    assert response.status_code == 201
    assert response.json["run"]["query"] == "Daft Punk"
    assert client.get("/api/v1/pipelines/runs?page=0").status_code == 400
    assert client.get("/api/v1/pipelines/runs/999").status_code == 404
