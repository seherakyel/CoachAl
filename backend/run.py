import os
import uvicorn
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

if __name__ == "__main__":
    port = int(os.getenv("FASTAPI_PORT", 8000))
    env = os.getenv("FASTAPI_ENV", "development")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=(env == "development"))
