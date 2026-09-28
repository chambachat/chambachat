"""Aviso de privacidad (LFPDPPP) y términos y condiciones de ChambaChat."""

LAST_UPDATE = "28 de septiembre de 2026"


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
  <p><strong>Usuarios que reportan vacantes comunitarias:</strong> fotografías de anuncios de empleo callejeros (lonas, volantes, posters), incluidos metadatos EXIF como ubicación GPS y fecha. La fotografía se almacena de forma reducida exclusivamente para fines de verificación y trazabilidad.</p>
  <p><strong>Datos técnicos:</strong> identificadores de sesión, tipo de dispositivo y navegador, y registros de uso necesarios para operar y proteger la Plataforma.</p>
  <p>No solicitamos datos personales sensibles. Las vacantes no piden edad, sexo, estado civil, foto ni otros requisitos discriminatorios; si compartes tu edad, se usa solo para estimar tu compatibilidad con requisitos legales de la vacante, como la mayoría de edad.</p>

  <h2>3. Finalidades</h2>
  <p><strong>Finalidades primarias</strong> (necesarias para el servicio): crear y administrar tu cuenta; mostrarte vacantes ordenadas por cercanía; enviar tu postulación y las respuestas de la entrevista rápida a los reclutadores de la empresa a la que te postulas; calcular tu compatibilidad con cada vacante; operar el chat entre candidatos, Chambot y reclutadores; verificar la identidad fiscal de las empresas ante el SAT; enviar códigos de acceso e invitaciones por correo electrónico; analizar fotografías de anuncios de empleo con inteligencia artificial para extraer datos de la vacante; moderar contenido potencialmente ofensivo o fraudulento; y prevenir fraude o abuso, incluidos los bloqueos entre usuarios.</p>
  <p><strong>Finalidades secundarias</strong> (puedes oponerte a ellas sin afectar el servicio): enviarte avisos de nuevas vacantes que coincidan con tu perfil y elaborar estadísticas agregadas y anónimas sobre el uso de la Plataforma. Para oponerte escribe a <a href="mailto:{contact_email}">{contact_email}</a>.</p>

  <h2>4. Transferencias</h2>
  <p>Al postularte a una vacante, tu currículum operativo, tus respuestas y tus mensajes se comparten con la empresa y los reclutadores de esa vacante, quienes los tratan bajo su propia responsabilidad para fines de reclutamiento. Fuera de ese caso, solo compartimos datos con proveedores que nos prestan servicios de infraestructura, envío de correo electrónico, mapas y procesamiento de lenguaje, bajo obligaciones de confidencialidad, y cuando lo exija una autoridad competente. No vendemos tus datos personales.</p>

  <h2>5. Asistente con inteligencia artificial</h2>
  <p>Chambot procesa tus mensajes con modelos de lenguaje para entender qué buscas, proponer vacantes y realizar la entrevista rápida. Los datos que compartes en el chat pueden incorporarse a tu currículum operativo, que puedes revisar y editar desde tu perfil en cualquier momento. Las fotografías de anuncios de empleo se analizan con modelos de visión artificial para extraer texto e información de la vacante; la imagen se almacena para verificación y no se utiliza para entrenar modelos.</p>

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

  <h2>3. Definiciones</h2>
  <ul>
    <li><strong>"Candidato"</strong>: persona física que busca empleo a través de la Plataforma.</li>
    <li><strong>"Empresa"</strong>: persona moral o física con actividad empresarial que publica vacantes.</li>
    <li><strong>"Reclutador"</strong>: usuario autorizado por una Empresa para gestionar vacantes y comunicarse con Candidatos.</li>
    <li><strong>"Contenido de Usuario"</strong>: toda información, texto, imagen o archivo que un usuario sube o comparte en la Plataforma, incluyendo vacantes, fotografías de anuncios, mensajes y comentarios.</li>
    <li><strong>"Vacante Comunitaria"</strong>: oferta de empleo publicada por un Candidato a partir de una fotografía de un anuncio callejero (lona, volante, poster) que no pertenece al usuario que la publica.</li>
  </ul>

  <h2>4. Cuentas</h2>
  <p>Debes ser mayor de edad para postularte a una vacante. Eres responsable de la veracidad de tus datos y del uso de tu cuenta. El acceso se realiza con un código enviado a tu correo o con tu cuenta de Google; no compartas tus códigos de acceso.</p>

  <h2>5. Uso por candidatos</h2>
  <p>El servicio es gratuito para candidatos. Te comprometes a proporcionar información verídica sobre tu experiencia, escolaridad y certificaciones, y a usar el chat con respeto. Ningún reclutador puede cobrarte por postularte; si alguien lo hace, bloquéalo y repórtalo a <a href="mailto:{contact_email}">{contact_email}</a>.</p>

  <h2>6. Uso por empresas y reclutadores</h2>
  <p>Las empresas se registran con su Constancia de Situación Fiscal y declaran que la información es real y que están facultadas para publicar vacantes en su nombre. Las vacantes deben cumplir la Ley Federal del Trabajo: sin requisitos de edad, sexo, estado civil, embarazo, foto ni otros criterios discriminatorios, y con condiciones de sueldo, turno y prestaciones verídicas. ChambaChat puede retirar vacantes o suspender cuentas que incumplan estas reglas.</p>
  <p>Los datos de los candidatos que recibas a través de la Plataforma solo pueden usarse para el proceso de reclutamiento de la vacante correspondiente, conforme a la legislación de protección de datos.</p>

  <h2>7. Contenido de Usuario y Vacantes Comunitarias</h2>
  <p><strong>7.1. Licencia de uso.</strong> Al subir Contenido de Usuario a la Plataforma, le otorgas a ChambaChat una licencia no exclusiva, mundial, libre de regalías y sublicenciable para alojar, mostrar, reproducir, adaptar y distribuir dicho contenido dentro de la Plataforma con el fin de prestar el servicio. Esta licencia se extingue al eliminar el contenido o tu cuenta, salvo que se haya compartido con terceros antes de la eliminación.</p>
  <p><strong>7.2. Garantía de veracidad.</strong> Garantizas que el Contenido de Usuario que publicas es veraz, que cuentas con los derechos necesarios para compartirlo y que no infringe derechos de terceros ni la legislación vigente.</p>
  <p><strong>7.3. Vacantes Comunitarias.</strong> Cuando tomas una foto de un anuncio callejero y la subes a ChambaChat:</p>
  <ul>
    <li>Declaras que la fotografía fue tomada por ti, directamente de un anuncio físico real y visible en la vía pública.</li>
    <li>Los datos de contacto detectados en la imagen (teléfono, email, WhatsApp) no pueden ser editados por el usuario y se guardan tal como los detecta el sistema.</li>
    <li>La empresa titular de la vacante puede reclamarla en cualquier momento verificando la propiedad del teléfono o email asociado.</li>
    <li>ChambaChat no garantiza la vigencia, veracidad ni condiciones laborales de las vacantes comunitarias.</li>
    <li>Existe un límite de 3 fotografías por usuario por día para prevenir abuso.</li>
  </ul>
  <p><strong>7.4. Contenido prohibido.</strong> Está estrictamente prohibido subir, publicar o compartir contenido que:</p>
  <ul>
    <li>Sea sexual, pornográfico, que incluya desnudos o sea sexualmente explícito.</li>
    <li>Promueva violencia, armas, drogas o actividades ilícitas.</li>
    <li>Sea discriminatorio por motivo de raza, etnia, género, orientación sexual, religión, discapacidad, nacionalidad o cualquier otra condición protegida por la Constitución Política de los Estados Unidos Mexicanos y la Ley Federal para Prevenir y Eliminar la Discriminación.</li>
    <li>Constituya acoso, amenazas, difamación o suplantación de identidad.</li>
    <li>Sea falso, engañoso, fraudulento, o constituya una oferta de empleo inexistente con fines de fraude o extorsión.</li>
    <li>Sea un screenshot, montaje digital o documento fabricado que no corresponda a un anuncio físico real (en el caso de vacantes comunitarias).</li>
    <li>Infrinja derechos de propiedad intelectual, marcas o derechos de imagen de terceros.</li>
  </ul>

  <h2>8. Moderación y denuncias</h2>
  <p><strong>8.1. Moderación automatizada.</strong> ChambaChat utiliza inteligencia artificial para filtrar contenido que no cumpla con estas reglas antes de publicarlo. La Plataforma se reserva el derecho de rechazar cualquier imagen o contenido que su sistema considere inapropiado, falso o potencialmente dañino, sin necesidad de previo aviso al usuario.</p>
  <p><strong>8.2. Denuncia por usuarios.</strong> Cualquier usuario puede reportar una vacante o contenido que considere falso, ofensivo o que incumpla estos términos. Las vacantes reportadas podrán ser pausadas automáticamente cuando se acumule un número significativo de denuncias.</p>
  <p><strong>8.3. Consecuencias.</strong> ChambaChat se reserva el derecho, a su entera discreción y sin necesidad de resolución judicial previa, de:</p>
  <ul>
    <li>Retirar, pausar o editar cualquier Contenido de Usuario que infrinja estos términos.</li>
    <li>Suspender temporal o permanentemente las cuentas de los usuarios infractores.</li>
    <li>Limitar o revocar los puntos de Aura obtenidos mediante conducta fraudulenta.</li>
    <li>Reportar a las autoridades competentes las conductas que puedan constituir un delito conforme a la legislación mexicana, incluyendo el Código Penal Federal en materia de delitos informáticos, fraude, amenazas, extorsión, difamación o contra la dignidad de las personas.</li>
  </ul>
  <p><strong>8.4. Colaboración con autoridades.</strong> ChambaChat atenderá los requerimientos de información de autoridades judiciales y ministeriales competentes, conforme a la legislación aplicable.</p>

  <h2>9. Naturaleza de intermediario y limitación de responsabilidad por contenido de terceros</h2>
  <p><strong>9.1. ChambaChat como intermediario.</strong> ChambaChat actúa exclusivamente como intermediario tecnológico y no genera, edita, verifica ni aprueba el Contenido de Usuario que los usuarios publican. Conforme a los criterios establecidos por la Suprema Corte de Justicia de la Nación (SCJN) respecto a la no responsabilidad de los intermediarios de Internet por contenido generado por terceros, ChambaChat no es responsable de:</p>
  <ul>
    <li>La veracidad, exactitud, legalidad o calidad de las vacantes, perfiles o mensajes publicados por los usuarios.</li>
    <li>Los acuerdos, pagos, condiciones laborales o cualquier relación que surja entre Candidatos y Empresas.</li>
    <li>Los daños directos o indirectos que puedan derivarse del uso del Contenido de Usuario, incluyendo pero no limitado a: ofertas de empleo falsas, datos de contacto erróneos, información salarial inexacta o cualquier engaño perpetrado por un usuario.</li>
    <li>El contenido de las vacantes comunitarias subidas por usuarios que no son los titulares del anuncio.</li>
  </ul>
  <p><strong>9.2. Esfuerzos de moderación.</strong> Sin perjuicio de lo anterior, ChambaChat implementa de buena fe medidas razonables de moderación (filtros de inteligencia artificial, revisión por reportes de usuarios, límites de publicación), las cuales no implican una obligación de resultado ni convierten a ChambaChat en editor o curador del contenido. Estas medidas no constituyen una asunción de responsabilidad sobre el contenido que logre pasar los filtros.</p>
  <p><strong>9.3. Deslinde.</strong> El usuario acepta que ChambaChat no será responsable por actos u omisiones de otros usuarios. La Plataforma no es responsable solidaria ni subsidiaria de los daños que un usuario pueda causar a otro.</p>
  <p><strong>9.4. Limitación de responsabilidad.</strong> En la máxima medida permitida por las leyes de los Estados Unidos Mexicanos, incluyendo la Ley Federal de Protección al Consumidor y la LFPDPPP, la responsabilidad total de ChambaChat por cualquier reclamación relacionada con el servicio se limita al monto efectivamente pagado por el usuario reclamante en los últimos tres (3) meses. Para los servicios gratuitos, la responsabilidad total de ChambaChat será de cero pesos. Esta limitación no aplica en caso de dolo o mala fe comprobada de ChambaChat.</p>

  <h2>10. Conducta y bloqueos</h2>
  <p>Está prohibido el acoso, la suplantación, el envío de contenido ilegal o engañoso y cualquier uso automatizado no autorizado. Candidatos y empresas pueden bloquearse mutuamente; al hacerlo la comunicación se interrumpe de inmediato. ChambaChat puede suspender cuentas que infrinjan estas reglas.</p>

  <h2>11. Asistente con inteligencia artificial</h2>
  <p>Chambot es un asistente automatizado. Sus respuestas, la compatibilidad calculada y las sugerencias de vacantes son orientativas y pueden contener errores; la decisión de contratar corresponde siempre a la empresa y la de postularse, al candidato.</p>

  <h2>12. Planes y pagos</h2>
  <p>Los planes para empresas, sus alcances y precios se acuerdan por escrito al contratar. Los planes se renuevan por periodos y pueden cancelarse al terminar el periodo vigente. El plan Inicio no tiene costo.</p>

  <h2>13. Propiedad intelectual</h2>
  <p>La marca ChambaChat, Chambot, el diseño y el software de la Plataforma son propiedad de ChambaChat. El contenido que publicas (vacantes, mensajes, datos de perfil) sigue siendo tuyo; nos otorgas licencia para mostrarlo dentro de la Plataforma con el fin de prestar el servicio.</p>

  <h2>14. Indemnización</h2>
  <p>El usuario se obliga a indemnizar, defender y mantener indemne a ChambaChat, sus directivos, empleados, representantes y proveedores, de cualquier reclamación, demanda, pérdida, gasto o daño (incluyendo honorarios legales) que surja de: (a) el uso indebido de la Plataforma; (b) la publicación de contenido falso, ilícito u ofensivo; (c) la infracción de estos términos; o (d) la infracción de derechos de terceros.</p>

  <h2>15. Cambios y contacto</h2>
  <p>Podemos actualizar estos términos; la versión vigente siempre estará en esta página con su fecha. Los cambios sustanciales se notificarán a los usuarios a través de la Plataforma con al menos 15 días de anticipación. El uso continuado de la Plataforma después del periodo de notificación constituye aceptación de los nuevos términos. Para dudas o reportes escribe a <a href="mailto:{contact_email}">{contact_email}</a>.</p>

  <h2>16. Legislación aplicable y jurisdicción</h2>
  <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos, incluyendo la Ley Federal de Protección al Consumidor, la LFPDPPP, la Ley Federal del Trabajo y el Código Civil Federal. Para la resolución de controversias, las partes se someterán primero a un procedimiento de conciliación ante la PROFECO (cuando el usuario sea consumidor) y, en su caso, a la jurisdicción de los tribunales competentes de Monterrey, Nuevo León, México.</p>

  <h2>17. Divisibilidad</h2>
  <p>Si alguna cláusula de estos términos fuera declarada nula o inválida por autoridad competente, las demás cláusulas seguirán vigentes en todo lo que no se vea afectado.</p>
</div></section>
"""
    return {
        "path": "/web/terminos",
        "title": "Términos y condiciones | ChambaChat",
        "description": "Términos y condiciones de uso de ChambaChat para candidatos, reclutadores y empresas: contenido de usuario, vacantes comunitarias, moderación, limitación de responsabilidad e indemnización.",
        "body": body,
        "jsonld": [],
    }
