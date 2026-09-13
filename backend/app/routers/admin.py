from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import BotFlowConfig
from app.schemas import PromptResponse, PromptUpdate
from app.services.chatbot_engine import DEFAULT_PROMPTS
import json

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Workflow"])

@router.get("/prompts", response_model=List[PromptResponse])
def list_prompts(db: Session = Depends(get_db)):
    """
    Lista todos los pasos conversacionales configurables por el administrador.
    """
    prompts = db.query(BotFlowConfig).order_by(BotFlowConfig.step_order).all()
    if not prompts:
        # Inicializar en BD con valores por defecto
        for key, pdata in DEFAULT_PROMPTS.items():
            cfg = BotFlowConfig(
                step_key=key,
                step_order=pdata["step_order"],
                titulo_admin=pdata["titulo_admin"],
                prompt_texto=pdata["prompt_texto"],
                opciones_json=json.dumps(pdata.get("opciones", [])),
                activo=True
            )
            db.add(cfg)
        db.commit()
        prompts = db.query(BotFlowConfig).order_by(BotFlowConfig.step_order).all()
    return prompts

@router.put("/prompts/{step_key}", response_model=PromptResponse)
def update_prompt(step_key: str, update_in: PromptUpdate, db: Session = Depends(get_db)):
    """
    Modifica el prompt o reglas de un paso del bot sin tocar código fuente.
    """
    prompt = db.query(BotFlowConfig).filter(BotFlowConfig.step_key == step_key).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Paso conversacional no encontrado")

    if update_in.titulo_admin is not None:
        prompt.titulo_admin = update_in.titulo_admin
    if update_in.prompt_texto is not None:
        prompt.prompt_texto = update_in.prompt_texto
    if update_in.opciones_json is not None:
        prompt.opciones_json = update_in.opciones_json
    if update_in.activo is not None:
        prompt.activo = update_in.activo

    db.commit()
    db.refresh(prompt)
    return prompt
