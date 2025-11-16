
# backend/models/analytics_snapshot.py
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

class AnalyticsSnapshot(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    username: str
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    data: List[Dict[str, Any]]  # The raw SimplifyJob[] data
    filters: Optional[Dict[str, Any]] = None  # Saved filter state

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True

class SnapshotCreate(BaseModel):
    name: str
    description: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

class SnapshotResponse(BaseModel):
    id: str
    username: str
    name: str
    description: Optional[str]
    created_at: datetime
    data_count: int  # Number of jobs in snapshot
    filters: Optional[Dict[str, Any]] = None

    class Config:
        json_encoders = {ObjectId: str}
