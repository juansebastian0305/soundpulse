from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import func, text

from app.extensions import db
from app.models import PipelineRun, Track
from app.services.pipeline import run_pipeline, serialize_run

api = Blueprint("api", __name__)
MAX_PAGE_SIZE = 100


@api.get("/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
    except Exception:
        current_app.logger.exception("Health check database query failed")
        return jsonify({"status": "unhealthy", "database": "unavailable"}), 503
    return jsonify({"status": "healthy", "database": "available"})


@api.get("/dashboard")
def dashboard():
    latest_run = db.session.execute(
        db.select(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(1)
    ).scalar_one_or_none()
    artists = db.session.execute(
        db.select(func.count(func.distinct(Track.artist_name)))
    ).scalar_one()
    tracks = db.session.execute(db.select(func.count(Track.id))).scalar_one()
    run_count = db.session.execute(db.select(func.count(PipelineRun.id))).scalar_one()

    recent_runs = db.session.execute(
        db.select(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(10)
    ).scalars()
    recent_tracks = db.session.execute(
        db.select(Track).order_by(Track.collected_at.desc(), Track.id.desc()).limit(10)
    ).scalars()
    return jsonify(
        {
            "metrics": {
                "total_tracks": tracks,
                "unique_artists": artists,
                "total_runs": run_count,
                "last_run": serialize_run(latest_run) if latest_run else None,
            },
            "activity": [
                {
                    "id": run.id,
                    "query": run.query,
                    "status": run.status,
                    "started_at": run.started_at.isoformat(),
                    "records_inserted": run.records_inserted,
                }
                for run in reversed(list(recent_runs))
            ],
            "recent_tracks": [_serialize_track(track) for track in recent_tracks],
        }
    )


@api.get("/tracks")
def list_tracks():
    page, per_page, error = _pagination()
    if error:
        return error
    query = " ".join(request.args.get("q", "").split())
    statement = db.select(Track)
    count_statement = db.select(func.count(Track.id))
    if query:
        pattern = f"%{query}%"
        condition = Track.title.ilike(pattern) | Track.artist_name.ilike(pattern)
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)
    total = db.session.execute(count_statement).scalar_one()
    records = db.session.execute(
        statement.order_by(Track.collected_at.desc(), Track.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).scalars()
    return jsonify(
        {
            "items": [_serialize_track(track) for track in records],
            "pagination": _page_data(page, per_page, total),
        }
    )


@api.post("/pipelines/run")
def start_pipeline():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("invalid_json", "The request body must be a JSON object.", 400)
    query = payload.get("query")
    if not isinstance(query, str) or not query.strip() or len(query.strip()) > 200:
        return _error("invalid_query", "Provide a query between 1 and 200 characters.", 400)

    result = run_pipeline(query)
    if result["status"] == "failed":
        return jsonify(
            {
                "error": {
                    "code": "pipeline_failed",
                    "message": "The collection failed. See the run history for details.",
                },
                "run": result,
            }
        ), 502
    return jsonify({"run": result}), 201


@api.get("/pipelines/runs")
def list_pipeline_runs():
    page, per_page, error = _pagination()
    if error:
        return error
    total = db.session.execute(db.select(func.count(PipelineRun.id))).scalar_one()
    runs = db.session.execute(
        db.select(PipelineRun)
        .order_by(PipelineRun.started_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).scalars()
    return jsonify(
        {
            "items": [serialize_run(run) for run in runs],
            "pagination": _page_data(page, per_page, total),
        }
    )


@api.get("/pipelines/runs/<int:run_id>")
def get_pipeline_run(run_id: int):
    run = db.session.get(PipelineRun, run_id)
    if run is None:
        return _error("run_not_found", "No pipeline run exists with that ID.", 404)
    return jsonify({"run": serialize_run(run)})


def _pagination():
    try:
        page = int(request.args.get("page", "1"))
        per_page = int(request.args.get("per_page", "20"))
    except ValueError:
        return None, None, _error("invalid_pagination", "Pagination values must be integers.", 400)
    if page < 1 or not 1 <= per_page <= MAX_PAGE_SIZE:
        return None, None, _error(
            "invalid_pagination",
            f"Page must be at least 1 and per_page must be between 1 and {MAX_PAGE_SIZE}.",
            400,
        )
    return page, per_page, None


def _page_data(page: int, per_page: int, total: int) -> dict:
    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": (total + per_page - 1) // per_page,
    }


def _serialize_track(track: Track) -> dict:
    return {
        "id": track.id,
        "source": track.source,
        "external_id": track.external_id,
        "title": track.title,
        "artist_name": track.artist_name,
        "album_name": track.album_name,
        "release_date": track.release_date.isoformat() if track.release_date else None,
        "artwork_url": track.artwork_url,
        "source_url": track.source_url,
        "collected_at": track.collected_at.isoformat(),
    }


def _error(code: str, message: str, status: int):
    return jsonify({"error": {"code": code, "message": message}}), status
