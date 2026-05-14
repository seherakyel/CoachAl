import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config.logging_config import configure_logging, init_sentry
from app.config.settings import get_env, get_list_env
from app.middleware.rate_limit import limiter
from app.routes import (
    health,
    firebase,
    auth_test,
    cv,
    company,
    linkedin_search,
    alignment,
    interview,
    feedback,
    dashboard,
    usage,
    config,
)

logger = configure_logging()
SENTRY_ENABLED = init_sentry()

app = FastAPI(title="CoachAI API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = int((time.perf_counter() - start) * 1000)
        logger.error(
            "unhandled error",
            extra={
                "endpoint": request.url.path,
                "status_code": 500,
                "duration_ms": duration_ms,
            },
            exc_info=exc,
        )
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
    duration_ms = int((time.perf_counter() - start) * 1000)
    if request.url.path.startswith("/api"):
        logger.info(
            "request",
            extra={
                "endpoint": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
    return response


@app.on_event("startup")
async def on_startup() -> None:
    logger.info(
        "startup",
        extra={"endpoint": "boot", "status_code": 200, "duration_ms": 0},
    )
    if SENTRY_ENABLED:
        logger.info("sentry initialised")

ENV = get_env("FASTAPI_ENV", "development")
ALLOWED_ORIGINS = get_list_env(
    "ALLOWED_ORIGINS",
    default=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
    ],
)

if ENV == "production" and ("*" in ALLOWED_ORIGINS or not ALLOWED_ORIGINS):
    raise RuntimeError(
        "Production'da ALLOWED_ORIGINS belirli domainlere kısıtlanmalı. "
        "'*' veya boş değerle başlatılamaz."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router, prefix="/api")
app.include_router(firebase.router, prefix="/api")
app.include_router(auth_test.router, prefix="/api")
app.include_router(cv.router, prefix="/api")
app.include_router(company.router, prefix="/api")
app.include_router(linkedin_search.router, prefix="/api")
app.include_router(alignment.router, prefix="/api")
app.include_router(interview.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(usage.router, prefix="/api")
app.include_router(config.router, prefix="/api")
