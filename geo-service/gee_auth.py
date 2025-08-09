import json
import os
import os.path
from typing import Optional, Dict

import ee


class GEEAuthError(RuntimeError):
    pass


def init_ee_from_service_account() -> Dict[str, str]:
    """
    Initialize Earth Engine using a service account JSON key file specified by
    the GEE_SERVICE_ACCOUNT_JSON environment variable.

    Returns a small dict with metadata (e.g., the service account email).
    Raises GEEAuthError if initialization fails.
    """
    key_path = os.getenv("GEE_SERVICE_ACCOUNT_JSON")
    if not key_path:
        raise GEEAuthError(
            "GEE_SERVICE_ACCOUNT_JSON is not set. Set it to the path of your service account JSON file."
        )
    if not os.path.isfile(key_path):
        raise GEEAuthError(f"Service account JSON file not found at: {key_path}")

    try:
        with open(key_path, "r", encoding="utf-8") as f:
            key_data = json.load(f)
        service_account_email: Optional[str] = key_data.get("client_email")
        if not service_account_email:
            raise GEEAuthError("client_email not found in the service account JSON.")

        credentials = ee.ServiceAccountCredentials(service_account_email, key_path)
        ee.Initialize(credentials=credentials)
        return {"service_account_email": service_account_email}
    except Exception as e:
        raise GEEAuthError(f"Failed to initialize Earth Engine: {e}") from e
