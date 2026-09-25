"""Página principal del sitio informativo: qué es ChambaChat y cómo funciona."""

FAQ = [
    ("¿Qué es ChambaChat?",
     "Es una plataforma de reclutamiento operativo por chat. Los candidatos platican con Chambot, un asistente con inteligencia artificial que les muestra vacantes de manufactura y logística cerca de su casa y los conecta por chat directo con los reclutadores. Las empresas publican vacantes, reciben postulaciones y atienden a los candidatos desde un portal y desde el mismo chat."),
    ("¿Tiene costo para los candidatos?",
     "No. Buscar vacantes, postularse y chatear con los reclutadores es gratis para las personas que buscan trabajo."),
    ("¿Qué tipo de vacantes hay?",
     "Puestos operativos: montacarguistas, operadores de producción y ensamble, almacén y embarques, soldadores, empaque, inspección de calidad, mantenimiento, choferes y ayudantes generales, entre otros."),
    ("¿Cómo sé que una vacante es real?",
     "Cada empresa se registra con su Constancia de Situación Fiscal, cuyo código QR se valida en línea contra el portal del SAT. Las vacantes muestran sueldo libre semanal, turno, prestaciones y transporte, y los reclutadores responden por chat con su nombre."),
    ("¿Me pueden pedir edad, sexo o foto?",
     "No. Las vacantes de ChambaChat no incluyen requisitos de edad, sexo, estado civil ni foto, en línea con la Ley Federal del Trabajo. La entrevista rápida solo pregunta lo que la vacante necesita: experiencia, escolaridad, certificaciones, turno, ubicación y disponibilidad."),
]


def build():
    faq_html = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in FAQ)
    faq_jsonld = {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ],
    }
    body = f"""
<div class="hero"><div class="wrap">
  <span class="pill">Reclutamiento operativo por chat</span>
  <h1>Chamba cerca de tu casa, sin vueltas: por chat y con el reclutador de la planta</h1>
  <p>ChambaChat conecta a operarios con vacantes de manufactura y logística. Chambot te propone las plantas con menor tiempo de traslado, te hace una entrevista rápida y te pasa directo con el reclutador. Todo en un chat, desde el celular.</p>
  <div class="cta"><a class="btn lime" href="/">Buscar chamba ahora</a><a class="btn ghost" href="/web/empresas">Soy empresa</a></div>
</div></div>

<section><div class="wrap">
  <h2>¿Qué es ChambaChat?</h2>
  <p class="lead">Una plataforma donde buscar trabajo operativo es tan fácil como mandar un mensaje. Sin formularios eternos ni currículum en PDF: el candidato platica, la plataforma entiende lo que busca y las empresas reciben postulaciones con la información que necesitan para decidir.</p>
  <div class="grid c3">
    <div class="card"><div class="ic">💬</div><h3>Chat con inteligencia artificial</h3><p>Chambot habla claro y al grano, con estilo norteño. Entiende puestos, zonas, turnos y sueldos, y responde en segundos.</p></div>
    <div class="card"><div class="ic">📍</div><h3>Cercanía real</h3><p>Ordena las vacantes por tiempo de traslado desde tu casa y te dice qué rutas de transporte de personal pasan por tu colonia.</p></div>
    <div class="card"><div class="ic">🤝</div><h3>Chat directo con el reclutador</h3><p>Cada postulación abre una conversación con los reclutadores de la planta. Si tardan, Chambot te apoya con los datos de la vacante.</p></div>
  </div>
</div></section>

<section class="alt"><div class="wrap">
  <h2>Cómo funciona para el candidato</h2>
  <p class="lead">Tres pasos y estás platicando con la empresa.</p>
  <ol class="steps">
    <li class="step"><h3>Cuéntale a Chambot qué buscas</h3><p>Puesto, zona o turno. Te muestra vacantes con sueldo libre semanal, turno, prestaciones y transporte.</p></li>
    <li class="step"><h3>Abre el chat directo con el reclutador</h3><p>Chambot te hace unas preguntas rápidas sobre experiencia, escolaridad y disponibilidad, y le envía tu información al reclutador.</p></li>
    <li class="step"><h3>Acuerda tu entrevista</h3><p>El reclutador te responde en el mismo chat. Tu currículum operativo queda guardado para la siguiente vez.</p></li>
  </ol>
  <a class="btn" href="/web/candidatos">Ver todo lo que puedes hacer como candidato</a>
</div></section>

<section><div class="wrap">
  <h2>Para empresas y plantas</h2>
  <p class="lead">Un portal para publicar vacantes estructuradas, compartir un enlace de campaña y atender candidatos desde el chat, con compatibilidad calculada por la entrevista de Chambot.</p>
  <div class="grid c4">
    <div class="card"><div class="ic">🏭</div><h3>Vacantes estructuradas</h3><p>Categoría, turno, sueldo, prestaciones y requisitos en catálogos: la IA empareja mejor.</p></div>
    <div class="card"><div class="ic">⚡</div><h3>Smart Link</h3><p>Un enlace con código verificador para tus campañas en redes y volantes: todo el tráfico entra al chat de tu planta.</p></div>
    <div class="card"><div class="ic">✨</div><h3>Compatibilidad</h3><p>Cada postulación llega con un porcentaje y las respuestas de la entrevista rápida.</p></div>
    <div class="card"><div class="ic">🚌</div><h3>Rutas y turnos</h3><p>Registra tus rutas de transporte de personal con paradas y horarios, y tus turnos de planta.</p></div>
  </div>
  <p style="margin-top:20px"><a class="btn" href="/web/empresas">Conoce el portal de empresa</a> <a class="btn ghost" href="/web/planes">Ver planes</a></p>
</div></section>

<section class="alt"><div class="wrap">
  <h2>Confianza para los dos lados</h2>
  <div class="grid c3">
    <div class="card"><h3>Empresas verificadas ante el SAT</h3><p>El registro pide la Constancia de Situación Fiscal y valida su QR en línea contra el portal del SAT.</p></div>
    <div class="card"><h3>Sin discriminación</h3><p>Las vacantes no piden edad, sexo, estado civil ni foto, conforme a la Ley Federal del Trabajo.</p></div>
    <div class="card"><h3>Control de la conversación</h3><p>Candidatos y empresas pueden bloquearse mutuamente si hay acoso o insistencia, y la comunicación se corta de inmediato.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <h2>Preguntas frecuentes</h2>
  {faq_html}
</div></section>

<div class="band"><div class="wrap"><h2>¿Listo para encontrar chamba o cubrir tu vacante?</h2><p><a class="btn" href="/">Abrir el chat</a> <a class="btn ghost" href="/vacantes">Ver vacantes activas</a></p></div></div>
"""
    return {
        "path": "/web",
        "title": "ChambaChat | Chamba operativa por chat, cerca de tu casa",
        "description": "Plataforma de reclutamiento operativo por chat: vacantes de manufactura y logística ordenadas por cercanía, entrevista rápida con IA y chat directo con los reclutadores. Gratis para candidatos.",
        "body": body,
        "jsonld": [faq_jsonld],
    }
