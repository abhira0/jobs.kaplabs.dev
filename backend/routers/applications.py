# backend/routers/applications.py
from fastapi import APIRouter, Depends, HTTPException
from backend.schemas.application import ApplicationUpdate, BulkApplicationUpdate, ApplicationResponse
from backend.dependencies import get_current_user
from backend.utils.db import get_database
import json
import os

router = APIRouter()

async def get_parsed_data(username: str):
    """Helper function to get parsed data from cache"""
    try:
        file_path = f"cache/{username}/parsed.json"
        if not os.path.exists(file_path):
            return []
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading parsed data: {str(e)}")
        return []


async def get_applied_ids(username: str, jobs: list = None) -> list[str]:
    # Get parsed data from cache
    parsed_data = await get_parsed_data(username)
    
    all_applied_jobs = set(jobs)
    for job in parsed_data:
        status_events = job.get("status_events", [])
        for event in status_events:
            if event.get("status") == "applied" and job.get("job_posting_id"):
                all_applied_jobs.add(job.get("job_posting_id"))
                break
    return list(all_applied_jobs)

@router.get("", response_model=ApplicationResponse)
async def get_applications(current_user: dict = Depends(get_current_user)):
    db = get_database()
    username = current_user["username"]
    applications = await db.applications.find_one(
        {"username": username}
    ) or {"applications": {username: {"applied": [], "hidden": []}}}
    
    # Combine both sources
    all_applied_jobs = await get_applied_ids(username, applications["applications"][username]["applied"])
    applications["applications"][username]["applied"] = all_applied_jobs
    return applications

@router.post("", response_model=ApplicationResponse)
async def update_application(
    application: ApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    username = current_user["username"]
    
    # Get or create user's applications
    user_applications = await db.applications.find_one({"username": username})
    if not user_applications:
        user_applications = {
            "username": username,
            "applications": {username: {"applied": [], "hidden": []}}
        }
    
    all_applied_jobs = await get_applied_ids(username, user_applications["applications"][username]["applied"])
    user_applications["applications"][username]["applied"] = all_applied_jobs
    
    apps = user_applications["applications"][username]
    status_list = apps.get(application.status, [])
    
    if application.value and application.job_id not in status_list:
        status_list.append(application.job_id)
    elif not application.value and application.job_id in status_list:
        status_list.remove(application.job_id)
    
    apps[application.status] = status_list
    
    await db.applications.update_one(
        {"username": username},
        {"$set": user_applications},
        upsert=True
    )

    return user_applications

@router.post("/bulk", response_model=ApplicationResponse)
async def bulk_update_applications(
    bulk_update: BulkApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Bulk update multiple applications at once to prevent API flooding"""
    db = get_database()
    username = current_user["username"]

    # Get or create user's applications
    user_applications = await db.applications.find_one({"username": username})
    if not user_applications:
        user_applications = {
            "username": username,
            "applications": {username: {"applied": [], "hidden": []}}
        }

    all_applied_jobs = await get_applied_ids(username, user_applications["applications"][username]["applied"])
    user_applications["applications"][username]["applied"] = all_applied_jobs

    apps = user_applications["applications"][username]
    status_list = apps.get(bulk_update.status, [])

    # Process all job IDs in bulk
    for job_id in bulk_update.job_ids:
        if bulk_update.value and job_id not in status_list:
            status_list.append(job_id)
        elif not bulk_update.value and job_id in status_list:
            status_list.remove(job_id)

    apps[bulk_update.status] = status_list

    await db.applications.update_one(
        {"username": username},
        {"$set": user_applications},
        upsert=True
    )

    return user_applications