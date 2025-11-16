
# backend/app/schemas/application.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ApplicationUpdate(BaseModel):
    job_id: str
    status: str  # 'applied' or 'hidden'
    value: bool

class BulkApplicationUpdate(BaseModel):
    job_ids: List[str]
    status: str  # 'applied' or 'hidden'
    value: bool

class ApplicationResponse(BaseModel):
    applications: dict[str, dict[str, List[str]]]  # username -> {status -> [job_ids]}
