"""Aviso de privacidad (LFPDPPP) y términos y condiciones de ChambaChat."""

LAST_UPDATE = "24 de septiembre de 2026"


def build_aviso(contact_email: str):
    body = f"""
<div class="hero"><div class="wrap">
  <span class="pill">Legal</span>
  <h1>Aviso de privacidad</h1>
  <p>Cómo tratamos los datos personales de candidatos, reclutadores y empresas que usan ChambaChat.</p>
</div></div>

<section><div class="wrap legal">
  <p class="meta">Última actualización: {LAST_UPDATE}</p>

  <h2>1. Responsable</h2>
  <p>ChambaChat (en adelante "la Plataforma") es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), su Reglamento y los Lineamientos del Aviso de Privacidad. Puedes contactarnos en <a href="mailto:{contact_email}">{contact_email}</a>.</p>

  <h2>2. Datos que recabamos</h2>
  <p><strong>Candidatos:</strong> nombre, correo electrónico, teléfono o WhatsApp, municipio y colonia, ubicación aproximada o precisa cuando decides compartirla, escolaridad, edad o rango de edad, experiencia laboral, certificaciones, disponibilidad y turno preferido, respuestas a la entrevista rápida y mensajes intercambiados en el chat con Chambot y con reclutadores.</p>
  <p><strong>Reclutadores y empresas:</strong> nombre, correo electrónico, rol dentro de la empresa, razón social, RFC, régimen fiscal y domicilio tomados de la Constancia de Situación Fiscal, rutas de transporte, turnos y vacantes publicadas.</p>
  <p><strong>Datos técnicos:</strong> identificadores de sesión, tipo de dispositivo y navegador, y registros de uso necesarios para operar y proteger la Plataforma.</p>
  <p>No solicitamos datos personales sensibles. Las vacantes no piden edad, sexo, estado civil, foto ni otros requisitos discriminatorios; si compartes tu edad, se usa solo para estimar tu compatibilidad con requisitos legales de la vacante, como la mayoría de edad.</p>

  <h2>3. Finalidades</h2>
  <p><strong>Finalidades primarias</strong> (necesarias para el servicio): crear y administrar tu cuenta; mostrarte vacantes ordenadas por cercanía; enviar tu postulación y las respuestas de la entrevista rápida a los reclutadores de la empresa a la que te postulas; calcular tu compatibilidad con cada vacante; operar el chat entre candidatos, Chambot y reclutadores; verificar la identidad fiscal de las empresas ante el SAT; enviar códigos de acceso e invitaciones por correo electrónico; y prevenir fraude o abuso, incluidos los bloqueos entre usuarios.</p>
  <p><strong>Finalidades secundarias</strong> (puedes oponerte a ellas sin afectar el servicio): enviarte avisos de nuevas vacantes que coincidan con tu perfil y elaborar estadísticas agregadas y anónimas sobre el uso de la Plataforma. Para oponerte escribe a <a href="mailto:{contact_email}">{contact_email}</a>.</p>

  <h2>4. Transferencias</h2>
  <p>Al postularte a una vacante, tu currículum operativo, tus respuestas y tus mensajes se comparten con la empresa y los reclutadores de esa vacante, quienes los tratan bajo su propia responsabilidad para fines de reclutamiento. Fuera de ese caso, solo compartimos datos con proveedores que nos prestan servicios de infraestructura, envío de correo electrónico, mapas y procesamiento de lenguaje, bajo obligaciones de confidencialidad, y cuando lo exija una autoridad competente. No vendemos tus datos personales.</p>

  <h2>5. Asistente con inteligencia artificial</h2>
  <p>Chambot procesa tus mensajes con modelos de lenguaje para entender qué buscas, proponer vacantes y realizar la entrevista rápida. Los datos que compartes en el chat pueden incorporarse a tu currículum operativo, que puedes revisar y editar desde tu perfil en cualquier momento.</p>

  <h2>6. Derechos ARCO y revocación del consentimiento</h2>
  <p>Puedes acceder, rectificar, cancelar u oponerte al tratamiento de tus datos, así como revocar tu consentimiento o limitar su uso, enviando una solicitud a <a href="mailto:{contact_email}">{contact_email}</a> con tu nombre, el correo con el que te registraste, la descripción clara de tu solicitud y un medio para responderte. Atenderemos tu solicitud en los plazos que marca la LFPDPPP. Desde tu perfil también puedes editar tus datos, cambiar tu ubicación y administrar tus bloqueos.</p>

  <h2>7. Conservación y seguridad</h2>
  <p>Conservamos tus datos mientras tu cuenta esté activa o sea necesario para las finalidades descritas, y los eliminamos o anonimizamos después. Aplicamos medidas administrativas, técnicas y físicas para proteger tus datos, incluidos cifrado en tránsito, control de acceso por roles y aislamiento de la información de cada empresa.</p>

  <h2>8. Cookies y almacenamiento local</h2>
  <p>La Plataforma usa almacenamiento local del navegador para mantener tu sesión, tus conversaciones recientes y tus preferencias. No usamos cookies de publicidad de terceros. Puedes borrar esta información desde la configuración de tu navegador.</p>

  <h2>9. Cambios al aviso</h2>
  <p>Publicaremos cualquier cambio a este aviso en esta misma página, con la fecha de actualización. Los cambios relevantes se avisarán además dentro de la Plataforma.</p>
</div></section>
"""
    return {
        "path": "/web/aviso-de-privacidad",
        "title": "Aviso de privacidad | ChambaChat",
        "description": "Aviso de privacidad de ChambaChat conforme a la LFPDPPP: qué datos recabamos de candidatos y empresas, para qué los usamos, con quién se comparten al postularte y cómo ejercer tus derechos ARCO.",
        "body": body,
        "jsonld": [],
    }


def build_terminos(contact_email: str):
    body = f"""
<div class="hero"><div class="wrap">
  <span class="pill">Legal</span>
  <h1>Términos y condiciones</h1>
  <p>Reglas de uso de ChambaChat para candidatos, reclutadores y empresas.</p>
</div></div>

<section><div class="wrap legal">
  <p class="meta">Última actualización: {LAST_UPDATE}</p>

  <h2>1. Aceptación</h2>
  <p>Al usar ChambaChat (la "Plataforma") aceptas estos términos y el <a href="/web/aviso-de-privacidad">aviso de privacidad</a>. Si no estás de acuerdo, no uses la Plataforma.</p>

  <h2>2. Qué es la Plataforma</h2>
  <p>ChambaChat es un servicio de intermediación que conecta a personas que buscan trabajo operativo con empresas que publican vacantes. ChambaChat no es empleador, agencia de colocación ni parte de la relación laboral que pueda surgir entre un candidato y una empresa.</p>

  <h2>3. Cuentas</h2>
  <p>Debes ser mayor de edad para postularte a una vacante. Eres responsable de la veracidad de tus datos y del uso de tu cuenta. El acceso se realiza con un código enviado a tu correo o con tu cuenta de Google; no compartas tus códigos de acceso.</p>

  <h2>4. Uso por candidatos</h2>
  <p>El servicio es gratuito para candidatos. Te comprometes a proporcionar información verídica sobre tu experiencia, escolaridad y certificaciones, y a usar el chat con respeto. Ningún reclutador puede cobrarte por postularte; si alguien lo hace, bloquéalo y repórtalo a <a href="mailto:{contact_email}">{contact_email}</a>.</p>

  <h2>5. Uso por empresas y reclutadores</h2>
  <p>Las empresas se registran con su Constancia de Situación Fiscal y declaran que la información es real y que están facultadas para publicar vacantes en su nombre. Las vacantes deben cumplir la Ley Federal del Trabajo: sin requisitos de edad, sexo, estado civil, embarazo, foto ni otros criterios discriminatorios, y con condiciones de sueldo, turno y prestaciones verídicas. ChambaChat puede retirar vacantes o suspender cuentas que incumplan estas reglas.</p>
  <p>Los datos de los candidatos que recibas a través de la Plataforma solo pueden usarse para el proceso de reclutamiento de la vacante correspondiente, conforme a la legislación de protección de datos.</p>

  <h2>6. Conducta y bloqueos</h2>
  <p>Está prohibido el acoso, la suplantación, el envío de contenido ilegal o engañoso y cualquier uso automatizado no autorizado. Candidatos y empresas pueden bloquearse mutuamente; al hacerlo la comunicación se interrumpe de inmediato. ChambaChat puede suspender cuentas que infrinjan estas reglas.</p>

  <h2>7. Asistente con inteligencia artificial</h2>
  <p>Chambot es un asistente automatizado. Sus respuestas, la compatibilidad calculada y las sugerencias de vacantes son orientativas y pueden contener errores; la decisión de contratar corresponde siempre a la empresa y la de postularse, al candidato.</p>

  <h2>8. Planes y pagos</h2>
  <p>Los planes para empresas, sus alcances y precios se acuerdan por escrito al contratar. Los planes se renuevan por periodos y pueden cancelarse al terminar el periodo vigente. El plan Inicio no tiene costo.</p>

  <h2>9. Propiedad intelectual</h2>
  <p>La marca ChambaChat, Chambot, el diseño y el software de la Plataforma son propiedad de ChambaChat. El contenido que publicas (vacantes, mensajes, datos de perfil) sigue siendo tuyo; nos otorgas licencia para mostrarlo dentro de la Plataforma con el fin de prestar el servicio.</p>

  <h2>10. Limitación de responsabilidad</h2>
  <p>ChambaChat se ofrece "tal cual". No garantizamos que un candidato sea contratado ni que una vacante se cubra, ni respondemos por los acuerdos, pagos o condiciones laborales entre candidatos y empresas. En la medida permitida por la ley, nuestra responsabilidad se limita al monto pagado por el servicio en los últimos tres meses.</p>

  <h2>11. Cambios y contacto</h2>
  <p>Podemos actualizar estos términos; la versión vigente siempre estará en esta página con su fecha. Para dudas o reportes escribe a <a href="mailto:{contact_email}">{contact_email}</a>.</p>

  <h2>12. Legislación aplicable</h2>
  <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a los tribunales competentes de México.</p>
</div></section>
"""
    return {
        "path": "/web/terminos",
        "title": "Términos y condiciones | ChambaChat",
        "description": "Términos y condiciones de uso de ChambaChat para candidatos, reclutadores y empresas: cuentas, vacantes conforme a la Ley Federal del Trabajo, conducta, bloqueos, planes y responsabilidad.",
        "body": body,
        "jsonld": [],
    }
