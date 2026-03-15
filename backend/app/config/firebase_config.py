import os
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore, storage
from dotenv import load_dotenv

from app.config.settings import PROJECT_ROOT, get_env

load_dotenv(PROJECT_ROOT / ".env")

_initialized = False

def init_firebase():
    global _initialized
    if _initialized:
        return
    cred_path = PROJECT_ROOT / get_env("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
    if not cred_path.exists():
        raise FileNotFoundError(f"Firebase credentials not found: {cred_path}")
    cred = credentials.Certificate(str(cred_path))
    firebase_admin.initialize_app(cred, {"storageBucket": f"{get_env('FIREBASE_PROJECT_ID')}.appspot.com"})
    _initialized = True

def get_firestore():
    init_firebase()
    return firestore.client()

def get_storage():
    init_firebase()
    return storage.bucket()
