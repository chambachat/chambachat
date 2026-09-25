"""Página para empresas y plantas: el portal de reclutamiento operativo."""

FAQ = [
    ("¿Qué necesito para registrar mi empresa?", "Tu Constancia de Situación Fiscal en PDF. Leemos el código QR, validamos los datos en línea contra el portal del SAT y llenamos razón social, RFC, régimen y domicilio por ti."),
    ("¿Cuántos reclutadores pueden usar la cuenta?", "Los que necesites. Invitas a tu equipo por correo o con un enlace, con rol de reclutador o administrador de RH, y todos atienden las postulaciones de la misma planta."),
    ("¿Cómo llegan las postulaciones?", "A tu bandeja de candidatos, con interfaz de mensajería. Cada candidato llega con la compatibilidad calculada por la entrevista rápida de Chambot y con sus respuestas, y le contestas por chat con tu nombre."),
    ("¿Qué es el Smart Link?", "Un enlace único de tu planta con un código verificador. Lo compartes en redes, WhatsApp o volantes con QR y quien lo abre entra al chat viendo solo tus vacantes vigentes."),
    ("¿Puedo publicar en varias plantas?", "Sí. Una cuenta administra varias plantas o empresas, cada una con su equipo, sus turnos, sus rutas de transporte y su propio Smart Link."),
]


def build():
    faq_html = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in FAQ)
    faq_jsonld = {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ],
    }
    body = f"""
<div class="hero"><div class="wrap">
  <span class="pill">Para empresas y plantas</span>
  <h1>Cubre vacantes operativas con candidatos que ya vienen entrevistados</h1>
  <p>Publica en minutos, comparte tu Smart Link en campañas y recibe postulaciones con compatibilidad calculada. Atiende a los candidatos por chat, desde el portal o desde el celular.</p>
  <div class="cta"><a class="btn lime" href="/">Registrar mi empresa</a><a class="btn ghost" href="/web/planes">Ver planes</a></div>
</div></div>

<section><div class="wrap">
  <h2>Todo el ciclo de reclutamiento operativo</h2>
  <p class="lead">Desde la vacante hasta la entrevista, en una sola plataforma pensada para plantas, almacenes y centros de distribución.</p>
  <div class="grid c3">
    <div class="card"><div class="ic">📝</div><h3>Vacantes estructuradas</h3><p>Categoría del puesto, turno con horario, días, contrato, sueldo libre, bonos y vales, prestaciones, escolaridad, experiencia, certificaciones y condiciones físicas. Los catálogos hacen que la IA empareje bien.</p></div>
    <div class="card"><div class="ic">⚡</div><h3>Smart Link de campaña</h3><p>Sustituye volantes estáticos: un enlace con código verificador único por planta. Todo el tráfico de Facebook, WhatsApp o carteles entra a tu chat.</p></div>
    <div class="card"><div class="ic">🤖</div><h3>Entrevista rápida con IA</h3><p>Chambot pregunta lo que pide tu vacante (experiencia, escolaridad, certificaciones, turno, ubicación, disponibilidad) y calcula la compatibilidad de 0 a 100 con desglose.</p></div>
    <div class="card"><div class="ic">💬</div><h3>Bandeja de candidatos por chat</h3><p>Conversaciones estilo mensajería con no leídos, nombre del reclutador que responde y Chambot de respaldo si nadie contesta en dos minutos.</p></div>
    <div class="card"><div class="ic">⭐</div><h3>Candidatos preferidos y bloqueos</h3><p>Guarda talento para retomarlo en la siguiente vacante y bloquea a quien no deba escribirte. Los candidatos también pueden bloquear a una empresa.</p></div>
    <div class="card"><div class="ic">🚌</div><h3>Rutas de transporte y turnos</h3><p>Traza tus rutas de personal con paradas y horarios en el mapa y registra tus turnos. Los candidatos ven qué ruta pasa por su colonia.</p></div>
    <div class="card"><div class="ic">👥</div><h3>Equipo de reclutadores</h3><p>Invita a tu equipo por correo o enlace, con roles de reclutador o administrador, en una o varias plantas.</p></div>
    <div class="card"><div class="ic">🏛️</div><h3>Verificación fiscal</h3><p>Alta con Constancia de Situación Fiscal validada contra el SAT: tus vacantes se publican como empresa verificada.</p></div>
    <div class="card"><div class="ic">📱</div><h3>Desde el celular</h3><p>El chat de empresa funciona como una app de mensajería: lista de candidatos, conversación y respuesta en segundos.</p></div>
  </div>
</div></section>

<section class="alt"><div class="wrap">
  <h2>Empieza en cuatro pasos</h2>
  <ol class="steps">
    <li class="step"><h3>Registra tu planta con la CSF</h3><p>Sube la Constancia de Situación Fiscal: leemos el QR, validamos con el SAT y llenamos tus datos.</p></li>
    <li class="step"><h3>Publica tus vacantes</h3><p>Formulario en cuatro pasos con la ubicación heredada de la planta y el turno tomado de tus turnos registrados.</p></li>
    <li class="step"><h3>Comparte tu Smart Link</h3><p>En redes, WhatsApp y volantes con QR. Quien lo abre ve solo tus vacantes vigentes.</p></li>
    <li class="step"><h3>Atiende a los candidatos por chat</h3><p>Llegan con compatibilidad y respuestas de la entrevista. Responde, marca preferidos y agenda entrevistas.</p></li>
  </ol>
  <a class="btn" href="/">Registrar mi empresa</a>
</div></section>

<section><div class="wrap">
  <h2>Preguntas frecuentes de empresas</h2>
  {faq_html}
</div></section>

<div class="band"><div class="wrap"><h2>Tu siguiente contratación empieza con un chat</h2><p><a class="btn" href="/">Abrir el portal de empresa</a> <a class="btn ghost" href="/web/planes">Comparar planes</a></p></div></div>
"""
    return {
        "path": "/web/empresas",
        "title": "Empresas | Reclutamiento operativo por chat con IA | ChambaChat",
        "description": "Portal para plantas y almacenes: vacantes estructuradas, Smart Link de campaña, entrevista rápida con IA, compatibilidad por candidato, chat directo, rutas de transporte y equipo de reclutadores. Empresas verificadas ante el SAT.",
        "body": body,
        "jsonld": [faq_jsonld],
    }
