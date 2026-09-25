from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ChatMessageRequest, ChatMessageResponse
from app.services.chatbot_engine import process_chat_message
from app.models import ChatSession

router = APIRouter(prefix="/api/v1/chat", tags=["Chatbot"])

@router.post("/message", response_model=ChatMessageResponse)
async def handle_chat_message(request: ChatMessageRequest, db: Session = Depends(get_db)):
    """
    Procesa un mensaje del candidato mediante DeepSeek LLM o árbol guiado.
    """
    response_data = await process_chat_message(
        db=db,
        session_id=request.session_id,
        user_message=request.message,
        selected_option=request.selected_option,
        user_name=request.user_name,
        user_phone=request.user_phone,
        user_email=request.user_email,
        user_gender=request.user_gender,
        candidate_lat=request.candidate_lat,
        candidate_lon=request.candidate_lon,
        candidate_colonia=request.candidate_colonia,
        candidate_municipio=request.candidate_municipio
    )
    return response_data

@router.get("/start", response_model=ChatMessageResponse)
async def start_chat(db: Session = Depends(get_db)):
    """
    Inicia una nueva sesión conversacional y retorna el saludo inicial configurado.
    """
    response_data = await process_chat_message(
        db=db,
        session_id=None,
        user_message="",
        selected_option=None
    )
    return response_data

@router.get("/session/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return session
