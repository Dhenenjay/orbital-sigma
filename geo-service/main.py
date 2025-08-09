from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

from gee_auth import GEEAuthError, init_ee_from_service_account

# Load environment variables from a local .env, if present
load_dotenv()

app = FastAPI(title="orbital-sigma geo-service")


class HealthResponse(BaseModel):
    status: str


class GEEInfo(BaseModel):
    initialized: bool
    service_account_email: str | None = None
    error: str | None = None


@app.on_event("startup")
def _init_gee():
    try:
        info = init_ee_from_service_account()
        # Store minimal info for introspection endpoints
        app.state.gee_info = {
            "initialized": True,
            "service_account_email": info.get("service_account_email"),
            "error": None,
        }
    except GEEAuthError as e:
        app.state.gee_info = {
            "initialized": False,
            "service_account_email": None,
            "error": str(e),
        }


@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok"}


@app.get("/gee/info", response_model=GEEInfo)
def gee_info():
    info = getattr(app.state, "gee_info", None) or {
        "initialized": False,
        "service_account_email": None,
        "error": "GEE not initialized",
    }
    return info
