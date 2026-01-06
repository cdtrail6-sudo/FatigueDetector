from fastapi import FastAPI
from app.routes.fatigue_logs import router as fatigue_router

app = FastAPI(title="Fatigue Backend")

app.include_router(fatigue_router)
