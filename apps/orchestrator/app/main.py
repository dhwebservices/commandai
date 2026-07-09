from fastapi import FastAPI

from app.intents.router import router as intents_router

app = FastAPI(title="CommandAI Orchestrator", version="0.1.0")
app.include_router(intents_router)


@app.get("/v1/health")
def health() -> dict:
    return {"status": "ok", "service": "orchestrator", "version": "v1"}
