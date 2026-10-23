import argparse
import json
import sys

from app import create_app
from app.services.pipeline import run_pipeline


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect music metadata.")
    parser.add_argument("--query", required=True, help="Artist, song, or album to search")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        result = run_pipeline(args.query)

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "succeeded" else 1


if __name__ == "__main__":
    sys.exit(main())
