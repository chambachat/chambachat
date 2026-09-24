"""
Bloqueos entre candidatos y empresas.

- blocker_type 'company': la empresa bloqueó al candidato (no puede postularse ni escribirle).
- blocker_type 'candidate': el candidato bloqueó a la empresa (sus reclutadores no pueden escribirle
  y sus vacantes dejan de proponérsele en el chat).
Cualquier bloqueo corta la mensajería en ambos sentidos; solo quien bloqueó puede quitarlo.
"""
from typing import Dict, Iterable, List, Set, Tuple

from sqlalchemy.orm import Session

from app.models import ChatBlock, CompanyMember, User

EMPTY = {"company": False, "candidate": False}


def member_company_ids(db: Session, user: User) -> List[int]:
    if not user or not user.email:
        return []
    return [
        m.company_id for m in db.query(CompanyMember).filter(
            CompanyMember.email == user.email, CompanyMember.status == "active",
        ).all()
    ]


def block_map(db: Session, pairs: Iterable[Tuple[int, str]]) -> Dict[Tuple[int, str], Dict[str, bool]]:
    """Bloqueos vigentes para varios pares (empresa, correo) en una sola consulta."""
    pairs = {(cid, (email or "").lower()) for cid, email in pairs if cid and email}
    if not pairs:
        return {}
    company_ids = {cid for cid, _ in pairs}
    emails = {email for _, email in pairs}
    rows = db.query(ChatBlock).filter(
        ChatBlock.company_id.in_(company_ids), ChatBlock.candidate_email.in_(emails),
    ).all()
    result: Dict[Tuple[int, str], Dict[str, bool]] = {}
    for row in rows:
        key = (row.company_id, row.candidate_email.lower())
        if key in pairs:
            result.setdefault(key, dict(EMPTY))[row.blocker_type] = True
    return result


def blocks_between(db: Session, company_id: int, candidate_email: str) -> Dict[str, bool]:
    key = (company_id, (candidate_email or "").lower())
    return block_map(db, [key]).get(key, dict(EMPTY))


def blocked_company_ids_for_candidate(db: Session, candidate_email: str) -> Set[int]:
    """Empresas con las que el candidato no debe cruzarse (lo bloquearon o él las bloqueó)."""
    if not candidate_email:
        return set()
    rows = db.query(ChatBlock.company_id).filter(ChatBlock.candidate_email == candidate_email.lower()).all()
    return {r[0] for r in rows}
