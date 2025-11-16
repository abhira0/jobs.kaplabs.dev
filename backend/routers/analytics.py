from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime
from ..dependencies import get_current_user
from backend.utils.db import get_database
from backend.models.analytics_snapshot import AnalyticsSnapshot, SnapshotCreate, SnapshotResponse
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
                data_count=len(snapshot.get("data", []))
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
            "data": data
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
            data_count=len(data)
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
            "data": snapshot["data"]
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
