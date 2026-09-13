# Chambachat V2 🤠

**Plataforma de Reclutamiento B2B/B2C y People Analytics para Manufactura en Nuevo León.**

Construido según las especificaciones del documento oficial: `PRD y Arquitectura Chambachat - Antigravity V2.txt`.

---

## 🚀 Arquitectura y Componentes Implementados

1. **📱 Módulo B2C (Candidatos Operarios)**:
   - Simulador de chatbot inteligente optimizado para WhatsApp / web móvil.
   - Perfilado conversacional: Nombre, Municipio/Zona de Nuevo León y Nivel Educativo.
   - **Detección de Rezago Educativo**: Inyección dinámica del mensaje de canalización para acreditar primaria o secundaria con el **INEA**.
   - **Tagging Automático**: Actualiza `tag_inea = TRUE` en base de datos.
   - **Matchmaking Geoespacial**: Algoritmo Haversine que prioriza vacantes en parques industriales cercanos y empresas con convenio INEA.

2. **💼 Módulo B2B (Empresas & Reclutadores)**:
   - **Predictor de Retención (People Analytics)**: Modelo matemático interactivo con sliders en tiempo real (Sueldo \$1,500 - \$4,500 MXN, Tiempo de traslado 10 - 120 min, Turnos fijos vs rotativos `+2.0m`, Aula/Apoyo INEA `+3.5m`).
   - Generación automática de recomendaciones tácticas para reducir la rotación laboral.
   - **Bolsa de Vacantes**: Creación y administración de ofertas con georreferenciación.
   - **Base de Talento**: Padrón con 100 operarios sintéticos de Nuevo León filtrables por municipio y estatus INEA.
   - **Dashboard Ejecutivo**: Métricas de permanencia histórica, causas raíz de rotación y gráficos de distribución escolar.

3. **⚙️ Panel de Administración (Orquestación sin Código)**:
   - Sustitución de plataformas de terceros (ManyChat, Typeform, etc.).
   - Panel visual donde los administradores pueden editar los copys, prompts de bienvenida, preguntas y la invitación motivacional del INEA en tiempo real, almacenados directamente en base de datos.

4. **🗄️ Base de Datos & Capa de Datos**:
   - DDL oficial para PostgreSQL: `backend/scripts/postgres_schema.sql` (con `CREATE TYPE educacion_enum`, tipo geométrico `POINT`, índices de alto rendimiento y llaves foráneas).
   - Compatibilidad nativa SQLite/PostgreSQL vía SQLAlchemy.
   - Generador de datos sintéticos: 100 operarios regiomontanos y 100 registros de histórico de contrataciones con variabilidad estadística realista.

---

## 🛠️ Cómo Iniciar la Plataforma

### Opción Rápida (1 Clic en Windows)
Haz doble clic sobre el archivo:
```cmd
start.bat
```

O desde la terminal:
```powershell
.\backend\venv\Scripts\python backend/run.py
```

El servidor iniciará en:
👉 **http://localhost:8000** (servirá tanto la API FastAPI como la plataforma web compilada).

### Documentación Interactiva de la API
- Swagger UI: **http://localhost:8000/docs**
- ReDoc: **http://localhost:8000/redoc**

---

## 🧪 Pruebas Automatizadas

Se incluyen pruebas unitarias y de integración completas:

```powershell
# 1. Pruebas de la fórmula matemática de retención
.\backend\venv\Scripts\python backend/tests/test_chambachat.py

# 2. Pruebas de integración de todos los endpoints y flujo de chat
.\backend\venv\Scripts\python backend/tests/test_api_endpoints.py
```

---

## 📁 Estructura del Proyecto

```
chambachat/
├── PRD y Arquitectura Chambachat - Antigravity V2.txt
├── start.bat
├── README.md
├── backend/
│   ├── run.py                       # Servidor y auto-seeding
│   ├── requirements.txt             # Dependencias Python
│   ├── app/
│   │   ├── main.py                  # FastAPI app y montaje de rutas/frontend
│   │   ├── database.py              # Conexión SQLAlchemy
│   │   ├── models.py                # Modelos Users, Jobs, HiringHistory, BotFlowConfig
│   │   ├── schemas.py               # Modelos Pydantic
│   │   ├── services/
│   │   │   ├── predictor.py         # Algoritmo de retención PRD
│   │   │   ├── matchmaking.py       # Algoritmo Haversine geodésico
│   │   │   └── chatbot_engine.py    # Máquina de estados conversacional
│   │   └── routers/                 # Endpoints REST
│   ├── scripts/
│   │   ├── seed.py                  # Generador de 100 operarios e históricos
│   │   └── postgres_schema.sql      # DDL nativo para PostgreSQL en Render
│   └── tests/
│       ├── test_chambachat.py       # Unit tests de la fórmula
│       └── test_api_endpoints.py    # Integration tests de la API
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── B2C/ChatSimulator.jsx
    │   │   ├── B2B/RetentionPredictor.jsx
    │   │   ├── B2B/JobsManager.jsx
    │   │   ├── B2B/CandidatesList.jsx
    │   │   ├── B2B/AnalyticsDashboard.jsx
    │   │   └── Admin/FlowOrchestrator.jsx
    │   └── services/api.js
    └── dist/                        # Build de producción listo para servir
```
