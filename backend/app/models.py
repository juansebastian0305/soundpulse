from datetime import date, datetime, timezone

from app.extensions import db


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Track(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(40), nullable=False)
    external_id = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    artist_name = db.Column(db.String(300), nullable=False)
    album_name = db.Column(db.String(300))
    release_date = db.Column(db.Date)
    artwork_url = db.Column(db.String(1000))
    source_url = db.Column(db.String(1000))
    collected_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    pipeline_run_id = db.Column(db.Integer, db.ForeignKey("pipeline_run.id"))

    __table_args__ = (
        db.UniqueConstraint("source", "external_id", name="uq_track_source_external_id"),
    )


class PipelineRun(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    query = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="running")
    started_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    finished_at = db.Column(db.DateTime(timezone=True))
    records_fetched = db.Column(db.Integer, nullable=False, default=0)
    records_inserted = db.Column(db.Integer, nullable=False, default=0)
    records_skipped = db.Column(db.Integer, nullable=False, default=0)
    error_message = db.Column(db.String(500))
