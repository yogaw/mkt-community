#!/usr/bin/env python3
"""HTTP transport for the IDX stock-summary API.

This file exists for exactly one reason: IDX sits behind a Cloudflare rule that
filters on the TLS fingerprint (JA3), and Node cannot produce a browser one.
That was measured, not assumed -- from the same host, same IP, same second:

    curl / Node https, any headers, any cipher or curve tuning ... 403
    identical request with a real Chrome handshake ................ 200

JA3 covers the TLS extension ordering, which comes from OpenSSL, so no amount of
`ciphers` / `ecdhCurve` tuning in Node changes it. curl_cffi replays a genuine
Chrome handshake and gets through.

Headers turned out to be nearly irrelevant: `Accept` alone succeeds, and even a
deliberately bogus Referer succeeds. The ones below are sent to look like the
site's own call, not because any is required.

Everything else -- which dates to fetch, verifying the day IDX returned, the
upsert -- stays in fetch-stock-summaries.ts. This is only a pipe.

    idx_fetch.py stock-summary 2026-06-02   ->  that day's rows on stdout
    idx_fetch.py index-summary              ->  the latest index rows

Exit codes let the caller tell a wall from a wobble:
    0  ok
    3  blocked (403) -- a fingerprint/WAF wall, retrying makes it worse
    4  rate limited (429) -- caller may back off and retry
    5  anything else (network, timeout, bad payload)
"""

import json
import os
import sys

try:
    from curl_cffi import requests
except ImportError:
    print(
        "curl_cffi is not installed. From the repo root:\n"
        "  python3 -m venv scripts/.venv\n"
        "  scripts/.venv/bin/pip install -r scripts/requirements.txt",
        file=sys.stderr,
    )
    sys.exit(5)

BASE_URL = os.environ.get("IDX_BASE_URL", "https://www.idx.co.id/primary/TradingSummary")

ENDPOINTS = {
    "stock-summary": "GetStockSummary",
    "index-summary": "GetIndexSummary",
}

# Any recent Chrome profile clears the WAF; pinned so behaviour does not drift
# when curl_cffi adds newer ones.
IMPERSONATE = os.environ.get("IDX_IMPERSONATE", "chrome124")

TIMEOUT = 60

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.idx.co.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
    ),
    "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
}


def main() -> int:
    if len(sys.argv) not in (2, 3):
        print(f"usage: idx_fetch.py {{{'|'.join(ENDPOINTS)}}} [YYYY-MM-DD]", file=sys.stderr)
        return 5

    endpoint = sys.argv[1]
    if endpoint not in ENDPOINTS:
        print(f"unknown endpoint {endpoint!r}; expected one of {', '.join(ENDPOINTS)}", file=sys.stderr)
        return 5

    # Omitting the date asks IDX for the most recent session.
    date = sys.argv[2] if len(sys.argv) == 3 else None
    headers = dict(HEADERS)
    # Not needed today, but the endpoint has wanted a clearance cookie before.
    cookie = os.environ.get("IDX_COOKIE")
    if cookie:
        headers["Cookie"] = cookie

    params = {"length": 9999, "start": 0}
    if date is not None:
        # IDX wants the date compact: YYYYMMDD, not YYYY-MM-DD.
        params["date"] = date.replace("-", "")

    try:
        response = requests.get(
            f"{BASE_URL}/{ENDPOINTS[endpoint]}",
            params=params,
            headers=headers,
            impersonate=IMPERSONATE,
            timeout=TIMEOUT,
            allow_redirects=True,
        )
    except Exception as error:  # noqa: BLE001 - the caller only needs the reason
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        return 5

    if response.status_code == 403:
        print("403 Cloudflare block", file=sys.stderr)
        return 3
    if response.status_code == 429:
        print("429 rate limited", file=sys.stderr)
        return 4
    if response.status_code != 200:
        print(f"HTTP {response.status_code}", file=sys.stderr)
        return 5

    try:
        payload = response.json()
    except ValueError:
        content_type = response.headers.get("content-type", "unknown")
        print(f"expected JSON, got {content_type}", file=sys.stderr)
        return 5

    json.dump(payload.get("data") or [], sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
