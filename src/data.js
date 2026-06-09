export const DEPARTAMENTOS = [
  'Amazonas','Antioquia','Arauca','Atlántico','Bolívar','Boyacá','Caldas',
  'Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca',
  'Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño',
  'Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés y Providencia',
  'Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada',
];

export const MAX_CUPOS = 1150;

export const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '0000';

export const EMPTY_FORM = {
  nit: '',
  colegio: '',
  municipio: '',
  departamento: '',
  codigo_invitacion: '',
  nombre_contacto: '',
  cargo_contacto: '',
  numero_contacto: '',
  correo: '',
};
