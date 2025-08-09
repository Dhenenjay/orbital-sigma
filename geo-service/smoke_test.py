from dotenv import load_dotenv

load_dotenv()

from fastapi.testclient import TestClient
import sys

try:
    from main import app
except Exception as e:
    print(f"IMPORT_ERROR: {e}")
    sys.exit(2)

with TestClient(app) as client:
    r1 = client.get("/health")
    print("HEALTH_STATUS", r1.status_code, r1.json())

    r2 = client.get("/gee/info")
    print("GEE_INFO_STATUS", r2.status_code, r2.json())
