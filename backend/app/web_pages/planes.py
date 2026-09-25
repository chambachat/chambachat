"""Página de planes: gratis para candidatos; para empresas, niveles sin precios inventados."""

FAQ = [
    ("¿Los candidatos pagan algo?", "No. Buscar vacantes, postularse, la entrevista rápida y el chat con reclutadores son gratis para las personas que buscan trabajo, siempre."),
    ("¿Cómo empiezo como empresa?", "Registra tu planta con la Constancia de Situación Fiscal y publica tu primera vacante sin costo con el plan Inicio. Cuando necesites más plantas, más reclutadores o soporte de campañas, escríbenos y te cotizamos."),
    ("¿Hay permanencia o contrato forzoso?", "No. Los planes para empresas se contratan por periodos y puedes cambiar de plan o darte de baja al terminar el periodo vigente."),
    ("¿Cómo se cotiza el plan Planta?", "Depende del número de plantas, vacantes activas al mismo tiempo y reclutadores. Escríbenos con esos datos y te mandamos una propuesta el mismo día hábil."),
]


def build():
    faq_html = "".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in FAQ)
    faq_jsonld = {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ],
    }
    body = f"""
<div class="hero"><div class="wrap">
  <span class="pill">Planes</span>
  <h1>Gratis para candidatos. Para empresas, un plan según el tamaño de tu operación</h1>
  <p>Empieza sin costo con tu primera vacante y crece cuando lo necesites. Sin permanencia.</p>
  <div class="cta"><a class="btn lime" href="/">Empezar gratis</a><a class="btn ghost" href="/web/empresas">Ver funciones para empresas</a></div>
</div></div>

<section><div class="wrap">
  <h2>Candidatos</h2>
  <p class="lead">Buscar chamba en ChambaChat no cuesta nada y nunca costará.</p>
  <div class="grid c2">
    <div class="card price">
      <span class="pill">Siempre gratis</span>
      <h3>Candidato</h3>
      <div class="amt">Gratis</div>
      <ul>
        <li>Vacantes ordenadas por cercanía a tu casa</li>
        <li>Rutas de transporte de personal por colonia</li>
        <li>Entrevista rápida y chat directo con reclutadores</li>
        <li>Currículum operativo que se llena platicando</li>
        <li>Bloqueo de empresas y control de tus datos</li>
      </ul>
      <a class="btn" href="/">Buscar chamba</a>
    </div>
    <div class="card">
      <h3>¿Por qué es gratis?</h3>
      <p>ChambaChat se sostiene con los planes de las empresas que publican vacantes. Los candidatos nunca pagan por postularse ni por hablar con un reclutador. Si alguien te pide dinero a nombre de una vacante, bloquéalo desde el chat y repórtalo.</p>
    </div>
  </div>
</div></section>

<section class="alt"><div class="wrap">
  <h2>Empresas y plantas</h2>
  <p class="lead">Tres niveles según cuántas plantas, vacantes y reclutadores manejas. Todos incluyen la verificación fiscal, el chat de candidatos y la entrevista rápida con IA.</p>
  <div class="grid c3">
    <div class="card price">
      <h3>Inicio</h3>
      <div class="amt">Gratis</div>
      <small>Para probar la plataforma</small>
      <ul>
        <li>1 planta verificada ante el SAT</li>
        <li>Vacantes activas limitadas</li>
        <li>Smart Link con código verificador</li>
        <li>Entrevista rápida y compatibilidad</li>
        <li>Chat de candidatos y candidatos preferidos</li>
      </ul>
      <a class="btn ghost" href="/">Registrar mi empresa</a>
    </div>
    <div class="card price best">
      <span class="pill">Más elegido</span>
      <h3>Crecimiento</h3>
      <div class="amt">Consulta el precio</div>
      <small>Para plantas con contratación continua</small>
      <ul>
        <li>Todo lo de Inicio</li>
        <li>Vacantes activas ilimitadas</li>
        <li>Equipo de reclutadores con roles</li>
        <li>Rutas de transporte y turnos en el mapa</li>
        <li>Páginas de vacante indexables en buscadores</li>
        <li>Soporte por chat en horario hábil</li>
      </ul>
      <a class="btn" href="mailto:hola@chambachat.com?subject=Plan%20Crecimiento%20ChambaChat">Solicitar cotización</a>
    </div>
    <div class="card price">
      <h3>Planta</h3>
      <div class="amt">Consulta el precio</div>
      <small>Varias plantas o grupos industriales</small>
      <ul>
        <li>Todo lo de Crecimiento</li>
        <li>Varias plantas y empresas en una cuenta</li>
        <li>Acompañamiento en campañas con Smart Link</li>
        <li>Reportes de postulaciones y compatibilidad</li>
        <li>Soporte prioritario</li>
      </ul>
      <a class="btn ghost" href="mailto:hola@chambachat.com?subject=Plan%20Planta%20ChambaChat">Solicitar cotización</a>
    </div>
  </div>
  <p class="lead" style="margin-top:20px">Los precios se cotizan según la operación de cada empresa. Sin permanencia: cambias o cancelas al terminar el periodo.</p>
</div></section>

<section><div class="wrap">
  <h2>Preguntas frecuentes sobre planes</h2>
  {faq_html}
</div></section>

<div class="band"><div class="wrap"><h2>Publica tu primera vacante hoy</h2><p><a class="btn" href="/">Registrar mi empresa</a></p></div></div>
"""
    return {
        "path": "/web/planes",
        "title": "Planes | Gratis para candidatos, planes para empresas | ChambaChat",
        "description": "ChambaChat es gratis para candidatos. Las empresas empiezan sin costo con el plan Inicio y crecen con Crecimiento o Planta: vacantes ilimitadas, equipo de reclutadores, rutas de transporte y soporte. Sin permanencia.",
        "body": body,
        "jsonld": [faq_jsonld],
    }
