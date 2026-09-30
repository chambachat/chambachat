import re
with open('frontend/src/components/Chat/PhotoJobPreview.jsx', 'r', encoding='utf-8', errors='ignore') as f: c = f.read()
c = re.sub(r'Alta .YY.', 'Alta ??', c)
c = re.sub(r'Media .YY.', 'Media ??', c)
c = re.sub(r'Baja .Y\x22.', 'Baja ??', c)
c = c.replace('Ttulo', 'Título').replace('d?jalo vaco', 'déjalo vacío').replace('Categora', 'Categoría').replace('Das', 'Días').replace('Descripcin', 'Descripción').replace('detect', 'detectó')
with open('frontend/src/components/Chat/PhotoJobPreview.jsx', 'w', encoding='utf-8') as f: f.write(c)

