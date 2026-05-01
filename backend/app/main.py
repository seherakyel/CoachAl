from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import (
    health,
    firebase,
    auth_test,
    cv,
    company,
    alignment,
    interview,
    feedback,
    dashboard,
)

app = FastAPI(title="CoachAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(firebase.router, prefix="/api")
app.include_router(auth_test.router, prefix="/api")
app.include_router(cv.router, prefix="/api")
app.include_router(company.router, prefix="/api")
app.include_router(alignment.router, prefix="/api")
app.include_router(interview.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
