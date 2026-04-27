from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import health, firebase, auth_test, cv

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
