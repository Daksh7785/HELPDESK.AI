import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    url = os.environ.get("HEALTHCHECK_URL", "http://127.0.0.1:7860/ready")
    timeout = float(os.environ.get("HEALTHCHECK_TIMEOUT_SECONDS", "3"))

    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return 0 if 200 <= response.status < 300 else 1
    except (TimeoutError, urllib.error.URLError, OSError):
        return 1


if __name__ == "__main__":
    sys.exit(main())
