import logging
from datetime import datetime, timezone
from typing import Any

from app.extensions import db
from app.models import PipelineRun, Track
from app.services.itunes_client import ItunesClient
from app.services.transform import normalize_track

logger = logging.getLogger(__name__)


def run_pipeline(query: str, client: Any | None = None) -> dict[str, Any]:
    cleaned_query = " ".join(query.split())
    run = PipelineRun(query=cleaned_query, status="running")
    db.session.add(run)
    db.session.commit()

    records_fetched = 0
    inserted = 0
    skipped = 0
    try:
        source = client or ItunesClient()
        records = source.search_tracks(cleaned_query)
        records_fetched = len(records)
        normalized_records = [normalize_track(record) for record in records]

        with db.session.begin():
            for track_data in normalized_records:
                if track_data is None:
                    skipped += 1
                    continue
                existing = db.session.execute(
                    db.select(Track.id).where(
                        Track.source == track_data["source"],
                        Track.external_id == track_data["external_id"],
                    )
                ).first()
                if existing:
                    skipped += 1
                    continue
                db.session.add(
                    Track(**track_data, pipeline_run_id=run.id)
                )
                inserted += 1

        run.status = "succeeded"
        run.records_fetched = records_fetched
        run.records_inserted = inserted
        run.records_skipped = skipped
        run.finished_at = datetime.now(timezone.utc)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.exception("Pipeline run %s failed", run.id)
        run = db.session.get(PipelineRun, run.id)
        run.status = "failed"
        run.records_fetched = records_fetched
        run.records_inserted = 0
        run.records_skipped = skipped
        run.error_message = str(exc)[:500]
        run.finished_at = datetime.now(timezone.utc)
        db.session.commit()

    return serialize_run(run)


def serialize_run(run: PipelineRun) -> dict[str, Any]:
    return {
        "id": run.id,
        "query": run.query,
        "status": run.status,
        "started_at": _isoformat(run.started_at),
        "finished_at": _isoformat(run.finished_at),
        "records_fetched": run.records_fetched,
        "records_inserted": run.records_inserted,
        "records_skipped": run.records_skipped,
        "error_message": run.error_message,
    }


def _isoformat(value: datetime | None) -> str | None:
    return value.isoformat() if value else None
