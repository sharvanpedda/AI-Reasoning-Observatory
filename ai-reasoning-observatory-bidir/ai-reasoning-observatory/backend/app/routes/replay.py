from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.state import run_store

router = APIRouter(prefix="/api", tags=["replay"])


async def _replay_stream(run_id: str):
    run = run_store.get(run_id)
    if run is None or not run.events:
        return
    events = run.events
    start_ts = events[0].ts
    for ev in events:
        # Reproduce original relative pacing, capped so a slow run
        # doesn't make replay tediously slow for a judge (AT-06).
        delay = min(ev.ts - start_ts, 0.15)
        start_ts = ev.ts
        await asyncio.sleep(max(delay, 0))
        yield ev.to_sse()


@router.get("/replay/{run_id}")
async def replay(run_id: str):
    run = run_store.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Unknown run_id.")
    return StreamingResponse(
        _replay_stream(run_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
