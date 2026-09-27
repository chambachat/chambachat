import re

with open("frontend/src/components/Chat/PhotoJobPreview.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix state initialization
content = content.replace("titulo_puesto: extraction.titulo_puesto || '',", "titulo: extraction.titulo || '',")
content = content.replace("empresa: extraction.empresa || '',", "empresa_nombre: extraction.empresa_nombre || '',")

# Fix inputs
content = content.replace('name="titulo_puesto"', 'name="titulo"')
content = content.replace('value={formData.titulo_puesto}', 'value={formData.titulo}')
content = content.replace('name="empresa"', 'name="empresa_nombre"')
content = content.replace('value={formData.empresa}', 'value={formData.empresa_nombre}')

# Fix contact info rendering
content = content.replace('extraction.telefono', 'extraction.contacto?.telefono')
content = content.replace('extraction.whatsapp', 'extraction.contacto?.whatsapp')
content = content.replace('extraction.email', 'extraction.contacto?.email')

with open("frontend/src/components/Chat/PhotoJobPreview.jsx", "w", encoding="utf-8") as f:
    f.write(content)
