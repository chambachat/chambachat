# ChambaChat 🤠

**Plataforma de Reclutamiento Industrial con IA para Manufactura en Nuevo León, México.**

Conecta candidatos operarios con empresas industriales verificadas por el SAT a través de un chatbot conversacional inteligente.

> **Producción**: [chambachat.onrender.com](https://chambachat.onrender.com) • [chambachat.com](https://chambachat.com)

---

## 🏗️ Arquitectura

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Backend** | FastAPI (Python 3.11) + SQLAlchemy ORM |
| **LLM** | DeepSeek Chat API (chatbot conversacional) |
| **Base de datos** | PostgreSQL (Supabase) en producción, SQLite en desarrollo |
| **Mapas** | Leaflet.js + OpenStreetMap + Nominatim geocoding |
| **Auth** | JWT con verificación por email (OTP SHA-256) |
| **Migraciones** | Alembic |
| **Email** | Resend API con fallback SMTP |
| **Despliegue** | Render (auto-deploy desde `main`) |
| **CI** | GitHub Actions (pytest + build en push/PR) |

---

## 📱 Módulos

### B2C — Candidatos Operarios
- **Chatbot IA (Chambot)**: Perfilado conversacional, matchmaking geoespacial Haversine, detección de rezago educativo INEA.
- **Ubicación GPS**: El candidato comparte su ubicación para encontrar rutas de transporte y vacantes cercanas.
- **Postulación directa**: Aplica a vacantes desde el chat, con chat directo con el reclutador.

### B2B — Empresas y Reclutadores
- **Verificación fiscal SAT**: Carga de Constancia de Situación Fiscal (CSF) con extracción de QR y validación en vivo.
- **Gestión de equipo**: Invitaciones por email, roles (admin/reclutador), multi-planta.
- **Turnos laborales**: CRUD completo de turnos con horarios y días.
- **Rutas de transporte**: Mapa interactivo con paradas geolocalizadas, polilíneas y geocodificación inversa.
- **Vacantes**: Publicación con georreferenciación y filtro por empresa.
- **People Analytics**: Dashboard con métricas de retención, distribución escolar y motivos de baja.
- **Predictor de retención**: Modelo interactivo con sliders (sueldo, traslado, turnos, INEA).

### Admin
- **Orquestador de flujos**: Edición de prompts del chatbot sin código.

---

## 🛠️ Setup Local

### Requisitos
- Python 3.11+
- Node.js 18+

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
pip install -r requirements-dev.txt  # para tests

# Copiar y configurar variables
copy ..\.env.example ..\.env

python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev     # desarrollo en http://localhost:5173
npm run build   # producción
```

### Tests
```bash
cd backend
python -m pytest -v
```

---

## 🔐 Variables de Entorno

Ver [`.env.example`](.env.example) para la lista completa. Variables críticas:

| Variable | Descripción | Requerida |
|----------|-------------|:---------:|
| `DATABASE_URL` | PostgreSQL connection string | Producción |
| `DEEPSEEK_API_KEY` | API key de DeepSeek LLM | ✅ |
| `JWT_SECRET_KEY` | Secreto para firmar JWTs | Producción |
| `CORS_ORIGINS` | Orígenes permitidos (separados por coma) | ✅ |
| `RESEND_API_KEY` | API key de Resend para emails | Opcional |
| `SMTP_HOST/USER/PASSWORD` | Credenciales SMTP alternativas | Opcional |
| `LOG_LEVEL` | Nivel de logging (DEBUG/INFO/WARNING) | Opcional |

---

## 📁 Estructura del Proyecto

```
chambachat/
├── .github/workflows/test.yml        # CI: pytest + build
├── .env.example                       # Variables de entorno
├── backend/
│   ├── alembic/                       # Migraciones de DB
│   ├── app/
│   │   ├── config.py                  # Settings (Pydantic)
│   │   ├── database.py                # SQLAlchemy engine
│   │   ├── dependencies.py            # Auth: get_current_user, require_role
│   │   ├── main.py                    # FastAPI app + CORS + migrations
│   │   ├── models.py                  # SQLAlchemy models (13 tablas)
│   │   ├── schemas.py                 # Pydantic schemas
│   │   ├── routers/                   # Endpoints por dominio
│   │   │   ├── auth.py                # Login, verificación, sync
│   │   │   ├── companies.py           # Empresas, equipo, turnos
│   │   │   ├── routes.py              # Rutas de transporte
│   │   │   ├── jobs.py                # Vacantes
│   │   │   ├── applications.py        # Postulaciones + chat recruiter
│   │   │   ├── analytics.py           # People Analytics
│   │   │   └── ...
│   │   └── services/
│   │       ├── chatbot_engine.py      # Lógica del chatbot
│   │       ├── deepseek_engine.py     # Integración DeepSeek LLM
│   │       ├── email_service.py       # Resend + SMTP
│   │       ├── matchmaking.py         # Matchmaking geoespacial
│   │       └── sat_service.py         # Extracción CSF del SAT
│   ├── tests/                         # 34 tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Router principal
│   │   ├── components/
│   │   │   ├── Auth/                  # Login/registro
│   │   │   ├── Chat/                  # Chatbot IA principal
│   │   │   ├── B2B/                   # Panel empresa
│   │   │   │   ├── Team/             # Gestión de equipo (11 componentes)
│   │   │   │   ├── Routes/           # Rutas de transporte (5 componentes)
│   │   │   │   └── ...
│   │   │   ├── ui/                    # Toast, ConfirmDialog
│   │   │   └── ...
│   │   ├── hooks/                     # Custom hooks (4 hooks)
│   │   └── services/                  # API client, auth, chat storage
│   └── package.json
└── recursos/                          # Assets originales
```

---

## 📋 API

Documentación interactiva disponible en:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Endpoints principales
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/send-verification-code` | Enviar OTP por email |
| POST | `/api/v1/verify-code` | Verificar OTP → JWT |
| POST | `/api/v1/sync-profile` | Sincronizar perfil |
| GET/POST | `/api/v1/companies` | CRUD empresas |
| GET/POST | `/api/v1/companies/{id}/routes` | Rutas de transporte |
| GET/POST | `/api/v1/jobs` | Vacantes |
| POST | `/api/v1/chat/start` | Iniciar sesión de chat |
| POST | `/api/v1/chat/message` | Enviar mensaje al chatbot |
| POST | `/api/v1/apply` | Postularse a vacante |

---

## 📄 Licencia

Proyecto propietario — ChambaChat © 2024-2026
