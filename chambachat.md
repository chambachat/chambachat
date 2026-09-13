📄 Documento Maestro de Contexto: ChambaChat (PRD)

1\. Resumen Ejecutivo

ChambaChat es una plataforma de múltiples lados (MSP) diseñada para revolucionar el reclutamiento de personal operativo en los parques industriales de Nuevo León (Apodaca, Escobedo, etc.). Conecta a candidatos que buscan mejorar su calidad de vida con reclutadores industriales, automatizando el filtrado, la validación de rutas de transporte y la gestión de talento a través de Inteligencia Artificial y un "Smart Link" dinámico.



2\. Los Lados de la Plataforma

Lado A (Candidatos): Personal operativo buscando trabajo. Interactúan de forma fluida a través de un chat web/WhatsApp sin necesidad de descargar aplicaciones complejas. Buscan trabajos bien remunerados, cerca de su lugar de residencia o con transporte accesible.



Lado B (Reclutadores): Profesionales de RRHH y reclutadores de campo de empresas industriales. Utilizan un Dashboard centralizado para gestionar vacantes, visualizar talento y recibir candidatos pre-filtrados.



3\. Propuesta de Valor y Funcionalidades Core

El Enlace Vivo (Smart Link): Eliminación total del uso de flyers estáticos en Facebook/Canva. Los reclutadores comparten un enlace único y dinámico (\[chambachat.com/empresa](https://chambachat.com/empresa)) que siempre muestra las vacantes vigentes. Todo el tráfico de redes sociales se canaliza a la plataforma.



Evaluación IA y Match Score: El sistema entrevista al candidato en lenguaje natural y lo evalúa según los criterios específicos de cada vacante, entregando al reclutador talento verdaderamente calificado.



Inteligencia de Rutas y Talent Heatmaps: La base de datos cruza la ubicación de los candidatos con las rutas de transporte de las empresas. El sistema genera mapas de calor para que los reclutadores identifiquen zonas con alta densidad de talento (ej. colonias específicas en Apodaca) y puedan justificar estratégicamente la apertura de nuevas rutas de transporte.



4\. Stack Tecnológico y Arquitectura

Dominio, DNS y Seguridad: Cloudflare (Reglas de firewall, proxy, manejo de dominios).



Infraestructura Backend: Alojamiento en Render (PaaS) garantizando que la propiedad intelectual y los datos de usuarios pertenezcan 100% a la empresa.



Base de Datos: PostgreSQL para el manejo robusto de relaciones, cruces de ubicación (geolocalización) y almacenamiento seguro.



Orquestación y Automatización: Uso de n8n para la orquestación técnica de flujos de trabajo e integración de APIs, reemplazando la dependencia de scripts aislados en PHP.



Frontend (MVP/Landing): Páginas estáticas alojadas en Vercel o Cloudflare Pages.



5\. Identidad Visual y Marketing

Ecosistema de Marca:



Logotipo: Un globo de chat moderno que contiene tres monedas apiladas en su interior.



Paleta de Colores: Azul medianoche (solidez industrial) y Verde lima brillante (tecnología y prosperidad).



Ángulo Comercial (El "Cha-cha-cha"): Tono de comunicación fresco, "desfachatado" y regional. El enfoque de marketing no es corporativo, sino aspiracional: conseguir jale en ChambaChat significa ganar mejor, traer dinero en la bolsa (el sonido "cha-cha-cha" de las monedas) y mejorar el estilo de vida.



Campaña Ancla: Guiones virales en video generados y editados con herramientas de IA como Nano Banana Pro, bajo la premisa humorística: "¿A dónde tan peinado? ¡A la chamba!" o "¿De dónde sacaste esos zapatos? ¡De la ChambaChat!"

