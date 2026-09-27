import re

with open("backend/app/services/job_vision_service.py", "r", encoding="utf-8") as f:
    content = f.read()

new_instructions = """        "INSTRUCCIONES:\\n"
        "1. Transcribe TODO el texto visible en la imagen, incluyendo números de teléfono, emails y direcciones.\\n"
        "2. Extrae los datos de la oferta laboral. Infiere el nombre del puesto basado en el contexto (ej. si dice 'Buscamos meseros, cocineras, etc.', puedes poner 'Personal para Restaurante' o 'Ayudante General').\\n"
        "3. Para el nombre de la empresa, busca cualquier marca, nombre de negocio, restaurante o tienda (ej. 'La Enramada', 'Abarrotes Don Julio'). Si no dice, déjalo null.\\n"
        "4. Para los campos de catálogo, elige la opción MÁS CERCANA de la lista proporcionada.\\n"
        "5. Si el sueldo aparece como mensual, divídelo entre 4.33 para obtener el semanal.\\n"
        "6. Si el sueldo aparece como quincenal, divídelo entre 2.17 para obtener el semanal.\\n"
        "7. Si no puedes identificar un dato, déjalo como null.\\n"
        "8. Si la imagen NO contiene una oferta laboral, pon es_oferta_laboral=false.\\n\\n"
"""

content = re.sub(r'"INSTRUCCIONES:\\n".*?es_oferta_laboral=false\.\\n\\n"', new_instructions.strip(), content, flags=re.DOTALL)

with open("backend/app/services/job_vision_service.py", "w", encoding="utf-8") as f:
    f.write(content)
