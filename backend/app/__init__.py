import os
from pathlib import Path

from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from app.extensions import db


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    os.makedirs(app.instance_path, exist_ok=True)
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    timeout = int(os.environ.get("ITUNES_TIMEOUT_SECONDS", "10"))
    if timeout < 1:
        raise ValueError("ITUNES_TIMEOUT_SECONDS must be a positive integer.")
    app.config.from_mapping(
        SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL") or "sqlite:///soundpulse.db",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JSON_SORT_KEYS=False,
        DEBUG=os.environ.get("FLASK_DEBUG", "false").lower() == "true",
        ITUNES_TIMEOUT_SECONDS=timeout,
        CORS_ORIGINS=os.environ.get("CORS_ORIGINS", "http://localhost:5173"),
    )
    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    origins = app.config["CORS_ORIGINS"]
    if isinstance(origins, str):
        origins = [origin.strip() for origin in origins.split(",") if origin.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}})

    from app import models  # noqa: F401
    from app.api.routes import api

    app.register_blueprint(api, url_prefix="/api/v1")
    with app.app_context():
        db.create_all()

    return app
