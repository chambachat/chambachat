import { REGIMENES_SAT } from './constants';

export const EMPTY_COMPANY_FORM = {
  nombre: '',
  municipio: 'Apodaca',
  industria: 'Manufactura y Logística',
  rfc: '',
  regimen_fiscal: REGIMENES_SAT[0],
  direccion: '',
  telefono_contacto: '',
  latitud: null,
  longitud: null
};

export function formFromCompany(companyData) {
  return {
    nombre: companyData.nombre || '',
    municipio: companyData.municipio || 'Apodaca',
    industria: companyData.industria || '',
    rfc: companyData.rfc || '',
    regimen_fiscal: companyData.regimen_fiscal || REGIMENES_SAT[0],
    direccion: companyData.direccion || '',
    telefono_contacto: companyData.telefono_contacto || '',
    latitud: companyData.latitud,
    longitud: companyData.longitud
  };
}

/** Payload de alta: datos del formulario + metadatos oficiales extraídos de la CSF. */
export function buildCreatePayload(form, csfUploadedUrl, satData, satValidated) {
  return {
    nombre: form.nombre.trim(),
    municipio: form.municipio,
    industria: form.industria,
    rfc: form.rfc.trim().toUpperCase() || undefined,
    regimen_fiscal: form.regimen_fiscal,
    constancia_fiscal_url: csfUploadedUrl,
    direccion: form.direccion.trim() || undefined,
    telefono_contacto: form.telefono_contacto.trim() || undefined,
    idcif: satData?.idcif,
    curp: satData?.curp,
    razon_social: satData?.razon_social,
    regimen_capital: satData?.regimen_capital,
    fecha_inicio_operaciones: satData?.fecha_inicio_operaciones,
    estatus_padron: satData?.estatus_padron || 'ACTIVO',
    fecha_ultimo_cambio_estado: satData?.fecha_ultimo_cambio_estado,
    codigo_postal: satData?.codigo_postal,
    entidad_federativa: satData?.entidad_federativa,
    colonia: satData?.colonia,
    tipo_vialidad: satData?.tipo_vialidad,
    calle: satData?.calle,
    numero_exterior: satData?.numero_exterior,
    numero_interior: satData?.numero_interior,
    sat_url_validacion: satData?.sat_url,
    sat_validado: satValidated || Boolean(satData?.rfc),
    sat_raw_data: satData ? JSON.stringify(satData) : undefined
  };
}

/** Payload de edición: solo campos editables; la CSF solo si cambió. */
export function buildEditPayload(form, csfUploadedUrl, companyData) {
  const payload = {
    nombre: form.nombre,
    municipio: form.municipio,
    industria: form.industria,
    rfc: form.rfc,
    direccion: form.direccion,
    telefono_contacto: form.telefono_contacto,
    regimen_fiscal: form.regimen_fiscal
  };
  if (csfUploadedUrl && csfUploadedUrl !== companyData?.constancia_fiscal_url) {
    payload.constancia_fiscal_url = csfUploadedUrl;
  }
  return payload;
}
