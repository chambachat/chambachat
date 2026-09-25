"""Página para candidatos: cómo encontrar chamba con ChambaChat."""

FAQ = [
    ("¿Necesito cuenta para buscar vacantes?", "No. Puedes platicar con Chambot y ver vacantes sin registrarte. Para postularte y chatear con el reclutador inicias sesión con tu correo (te llega un código) o con Google, en menos de un minuto."),
    ("¿Tengo que subir mi currículum?", "No. Tu currículum operativo se arma solo con lo que le cuentas a Chambot: escolaridad, experiencia, certificaciones y disponibilidad. También puedes completarlo desde tu perfil cuando quieras."),
    ("¿Qué pasa cuando me postulo?", "Se abre un chat directo con los reclutadores de esa planta. Chambot te hace unas preguntas rápidas, envía tu información al reclutador y él te responde ahí mismo. Si tarda más de dos minutos, Chambot te ayuda con dudas de la vacante."),
    ("¿Para qué sirve compartir mi ubicación?", "Para ordenar las vacantes por tiempo de traslado desde tu casa y decirte qué rutas de transporte de personal pasan por tu colonia. Se pide una sola vez y puedes cambiarla desde tu perfil."),
    ("¿Puedo bloquear a una empresa?", "Sí. Desde el chat directo puedes bloquear a una empresa: sus reclutadores dejan de escribirte y ya no te proponemos sus vacantes. Puedes quitar el bloqueo desde tu perfil."),
]


def build():
    faq_html = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in FAQ)
    faq_jsonld = {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ],
    }
    body = f"""
<div class="hero"><div class="wrap">
  <span class="pill">Para candidatos · gratis</span>
  <h1>Encuentra chamba operativa platicando, como en WhatsApp</h1>
  <p>Montacargas, ensamble, almacén, soldadura, empaque, calidad y más. Chambot te muestra sueldo libre semanal, turno, prestaciones y transporte, y te pasa directo con el reclutador.</p>
  <div class="cta"><a class="btn lime" href="/">Empezar a buscar</a><a class="btn ghost" href="/vacantes">Ver vacantes activas</a></div>
</div></div>

<section><div class="wrap">
  <h2>Lo que puedes hacer</h2>
  <div class="grid c3">
    <div class="card"><div class="ic">🔎</div><h3>Buscar por puesto, zona y turno</h3><p>Dile a Chambot "busco de montacarguista con turno fijo" y te propone las opciones que te acomodan.</p></div>
    <div class="card"><div class="ic">📍</div><h3>Vacantes cerca de tu casa</h3><p>Comparte tu ubicación una sola vez y verás primero las plantas con menor tiempo de traslado.</p></div>
    <div class="card"><div class="ic">🚌</div><h3>Rutas de transporte de personal</h3><p>Pregunta qué rutas pasan por tu colonia y verás parada, hora de paso y a qué planta llegan.</p></div>
    <div class="card"><div class="ic">🗂️</div><h3>Tu currículum operativo</h3><p>Se llena con lo que platicas: escolaridad, experiencia, certificaciones, disponibilidad y turno preferido. Lo editas cuando quieras.</p></div>
    <div class="card"><div class="ic">🤝</div><h3>Chat directo con reclutadores</h3><p>Cada postulación es una conversación aparte con la planta. Nada de esperar llamadas que no llegan.</p></div>
    <div class="card"><div class="ic">🛡️</div><h3>Vacantes formales y sin discriminación</h3><p>Empresas verificadas ante el SAT y vacantes sin requisitos de edad, sexo, estado civil ni foto.</p></div>
  </div>
</div></section>

<section class="alt"><div class="wrap">
  <h2>Así es una postulación</h2>
  <ol class="steps">
    <li class="step"><h3>Eliges una vacante</h3><p>Ves el sueldo libre a la semana, el turno, las prestaciones y si hay transporte, antes de postularte.</p></li>
    <li class="step"><h3>Entrevista rápida con Chambot</h3><p>Unas preguntas cortas con botones: experiencia en el puesto, escolaridad, certificaciones, condiciones del trabajo, turno y disponibilidad. Lo que ya contaste no se vuelve a preguntar.</p></li>
    <li class="step"><h3>Tu información llega al reclutador</h3><p>Chambot te confirma que la envió. El reclutador te responde en el mismo chat y acuerdan la entrevista o el ingreso.</p></li>
  </ol>
</div></section>

<section><div class="wrap">
  <h2>Consejos para que te contacten más rápido</h2>
  <div class="grid c2">
    <div class="card"><h3>Completa tu perfil</h3><p>Escolaridad, experiencia, certificaciones (como la DC-3 de montacargas) y tu WhatsApp. Con el perfil completo tu compatibilidad con cada vacante sube.</p></div>
    <div class="card"><h3>Responde la entrevista rápida</h3><p>Son menos de diez preguntas y el reclutador recibe tus respuestas ordenadas. Las postulaciones con entrevista completa se atienden primero.</p></div>
    <div class="card"><h3>Registra tu ubicación</h3><p>Así ves las plantas más cercanas y las rutas de transporte que sí te sirven.</p></div>
    <div class="card"><h3>Revisa tus chats</h3><p>Cuando un reclutador te escribe, la conversación aparece con un punto verde en tu lista.</p></div>
  </div>
</div></section>

<section class="alt"><div class="wrap">
  <h2>Preguntas frecuentes de candidatos</h2>
  {faq_html}
</div></section>

<div class="band"><div class="wrap"><h2>Tu siguiente chamba puede estar a un mensaje</h2><p><a class="btn" href="/">Platicar con Chambot</a></p></div></div>
"""
    return {
        "path": "/web/candidatos",
        "title": "Candidatos | Encuentra chamba operativa por chat | ChambaChat",
        "description": "Busca vacantes de montacargas, ensamble, almacén y soldadura cerca de tu casa. Entrevista rápida con IA, chat directo con reclutadores y currículum operativo que se llena solo. Gratis.",
        "body": body,
        "jsonld": [faq_jsonld],
    }
