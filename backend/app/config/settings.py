import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

def get_env(key: str, default: str = "") -> str:
    return os.getenv(key, default)
