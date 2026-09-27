from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import JobPhotoLog

router = APIRouter(prefix="/api/v1/debug", tags=["Debug"])

@router.get("/photo-logs")
def get_photo_logs(db: Session = Depends(get_db)):
    logs = db.query(JobPhotoLog).order_by(JobPhotoLog.id.desc()).limit(10).all()
    return [{"id": l.id, "success": l.success, "error_message": l.error_message, "created_at": l.created_at} for l in logs]
