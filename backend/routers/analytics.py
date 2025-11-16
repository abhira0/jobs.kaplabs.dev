from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime
from ..dependencies import get_current_user
from backend.utils.db import get_database
from backend.models.analytics_snapshot import AnalyticsSnapshot, SnapshotCreate, SnapshotResponse
from backend.models.analytics_filters import FiltersUpdate, FiltersResponse
from bson import ObjectId
import json
import os

router = APIRouter()

MAX_SNAPSHOTS_PER_USER = 5

@router.get("/snapshots", response_model=List[SnapshotResponse])
async def list_snapshots(
    current_user: dict = Depends(get_current_user)
):
    """List all analytics snapshots for the current user"""
    db = get_database()

    try:
        snapshots = await db.analytics_snapshots.find(
            {"username": current_user["username"]}
        ).sort("created_at", -1).to_list(length=MAX_SNAPSHOTS_PER_USER)

        # Convert to response model
        response = []
        for snapshot in snapshots:
            response.append(SnapshotResponse(
                id=str(snapshot["_id"]),
                username=snapshot["username"],
                name=snapshot["name"],
                description=snapshot.get("description"),
                created_at=snapshot["created_at"],
                data_count=len(snapshot.get("data", [])),
                filters=snapshot.get("filters")
            ))

        return response
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch snapshots: {str(e)}"
        )

@router.post("/snapshots", response_model=SnapshotResponse)
async def create_snapshot(
    snapshot_data: SnapshotCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new analytics snapshot"""
    db = get_database()

    try:
        # Check if user has reached max snapshots
        count = await db.analytics_snapshots.count_documents(
            {"username": current_user["username"]}
        )

        if count >= MAX_SNAPSHOTS_PER_USER:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum number of snapshots ({MAX_SNAPSHOTS_PER_USER}) reached. Please delete an existing snapshot first."
            )

        # Get current parsed data
        file_path = f"cache/{current_user['username']}/parsed.json"
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404,
                detail="No analytics data found to snapshot"
            )

        with open(file_path, 'r') as f:
            data = json.load(f)

        if not data or len(data) == 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot create snapshot with no data"
            )

        # Create snapshot document
        snapshot = {
            "username": current_user["username"],
            "name": snapshot_data.name,
            "description": snapshot_data.description,
            "created_at": datetime.utcnow(),
            "data": data,
            "filters": snapshot_data.filters if snapshot_data.filters else None
        }

        # Insert into database
        result = await db.analytics_snapshots.insert_one(snapshot)
        snapshot["_id"] = result.inserted_id

        # Return response
        return SnapshotResponse(
            id=str(result.inserted_id),
            username=snapshot["username"],
            name=snapshot["name"],
            description=snapshot["description"],
            created_at=snapshot["created_at"],
            data_count=len(data),
            filters=snapshot["filters"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create snapshot: {str(e)}"
        )

@router.get("/snapshots/{snapshot_id}")
async def get_snapshot(
    snapshot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific snapshot's data"""
    db = get_database()

    try:
        if not ObjectId.is_valid(snapshot_id):
            raise HTTPException(status_code=400, detail="Invalid snapshot ID")

        snapshot = await db.analytics_snapshots.find_one({
            "_id": ObjectId(snapshot_id),
            "username": current_user["username"]
        })

        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")

        # Return full snapshot data
        return {
            "id": str(snapshot["_id"]),
            "username": snapshot["username"],
            "name": snapshot["name"],
            "description": snapshot.get("description"),
            "created_at": snapshot["created_at"],
            "data": snapshot["data"],
            "filters": snapshot.get("filters")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch snapshot: {str(e)}"
        )

@router.delete("/snapshots/{snapshot_id}")
async def delete_snapshot(
    snapshot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a snapshot"""
    db = get_database()

    try:
        if not ObjectId.is_valid(snapshot_id):
            raise HTTPException(status_code=400, detail="Invalid snapshot ID")

        result = await db.analytics_snapshots.delete_one({
            "_id": ObjectId(snapshot_id),
            "username": current_user["username"]
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Snapshot not found")

        return {"message": "Snapshot deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete snapshot: {str(e)}"
        )

# Default Filter Preferences
@router.get("/filters", response_model=FiltersResponse)
async def get_default_filters(
    current_user: dict = Depends(get_current_user)
):
    """Get user's saved default filter preferences"""
    db = get_database()

    try:
        filters = await db.analytics_filters.find_one({
            "username": current_user["username"]
        })

        if not filters:
            # Return default values
            return FiltersResponse(
                date_range="all",
                custom_start_date=None,
                custom_end_date=None,
                updated_at=None
            )

        return FiltersResponse(
            date_range=filters.get("date_range", "all"),
            custom_start_date=filters.get("custom_start_date"),
            custom_end_date=filters.get("custom_end_date"),
            updated_at=filters.get("updated_at")
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch filter preferences: {str(e)}"
        )

@router.post("/filters", response_model=FiltersResponse)
async def save_default_filters(
    filters_update: FiltersUpdate,
    current_user: dict = Depends(get_current_user),
    snapshot_id: Optional[str] = None
):
    """Save user's default filter preferences or snapshot-specific filters"""
    db = get_database()

    try:
        # If snapshot_id is provided, save filters to that snapshot
        if snapshot_id:
            if not ObjectId.is_valid(snapshot_id):
                raise HTTPException(status_code=400, detail="Invalid snapshot ID")

            # Update snapshot filters
            result = await db.analytics_snapshots.update_one(
                {
                    "_id": ObjectId(snapshot_id),
                    "username": current_user["username"]
                },
                {
                    "$set": {
                        "filters": {
                            "date_range": filters_update.date_range,
                            "custom_start_date": filters_update.custom_start_date,
                            "custom_end_date": filters_update.custom_end_date,
                        },
                        "filters_updated_at": datetime.utcnow()
                    }
                }
            )

            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Snapshot not found")

            return FiltersResponse(
                date_range=filters_update.date_range,
                custom_start_date=filters_update.custom_start_date,
                custom_end_date=filters_update.custom_end_date,
                updated_at=datetime.utcnow()
            )

        # Otherwise, save as default filters
        filter_data = {
            "username": current_user["username"],
            "date_range": filters_update.date_range,
            "custom_start_date": filters_update.custom_start_date,
            "custom_end_date": filters_update.custom_end_date,
            "updated_at": datetime.utcnow()
        }

        # Upsert - update if exists, insert if not
        await db.analytics_filters.update_one(
            {"username": current_user["username"]},
            {"$set": filter_data},
            upsert=True
        )

        return FiltersResponse(
            date_range=filter_data["date_range"],
            custom_start_date=filter_data["custom_start_date"],
            custom_end_date=filter_data["custom_end_date"],
            updated_at=filter_data["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save filter preferences: {str(e)}"
        )
