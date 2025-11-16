# backend/models/analytics_filters.py
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
from datetime import datetime

class AnalyticsFiltersPreference(BaseModel):
    """User's saved default analytics filter preferences"""
    username: str
    date_range: str = "all"
    custom_start_date: Optional[str] = None
    custom_end_date: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class FiltersUpdate(BaseModel):
    """Request model for updating filter preferences"""
    date_range: str = "all"
    custom_start_date: Optional[str] = None
    custom_end_date: Optional[str] = None

class FiltersResponse(BaseModel):
    """Response model for filter preferences"""
    date_range: str
    custom_start_date: Optional[str] = None
    custom_end_date: Optional[str] = None
    updated_at: Optional[datetime] = None
