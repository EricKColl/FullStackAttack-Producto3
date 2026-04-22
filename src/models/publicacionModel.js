/**
 * @file src/models/publicacionModel.js
 * @description Capa de acceso a datos para la entidad Publicación (oferta/demanda).
 *
 * Porta al backend la lógica de `almacenaje.js` del Producto 2 relacionada
 * con publicaciones (listarPublicaciones, crearPublicacion, eliminarPublicacion).
 *
 * ⚠️ Estado actual (Fase 3): datos en memoria. Migrará a MongoDB en Fase 4
 *    sin que cambien los resolvers.
 *
 * Relación con otras entidades:
 *   - Una publicación puede estar seleccionada por el dashboard (ver seleccionadaModel).
 *   - Al eliminar una publicación, se debe limpiar también su selección
 *     (esa coordinación la hará el resolver, no el model).
 */

import {
  normalizarTexto,
  normalizarEmail,
  validarCamposObligatorios,
  validarEmail,
  validarFechaISO,
  validarLongitudMinima,
  validarTipoPublicacion,
} from '../utils/validators.js';
import {
  ValidationError,
  NotFoundError,
} from '../utils/errors.js';

/**
 * Publicaciones iniciales de JobConnect, heredadas del Producto 2.
 * Se usan como semilla al arrancar el servidor.
 *
 * @type {Array<object>}
 */
const publicaciones = [
  {
    id: 1,
    tipo: 'oferta',
    titulo: 'Desarrollador/a Web Junior',
    categoria: 'Desarrollo Web',
    autor: 'TechNova SL',
    ubicacion: 'Barcelona',
    descripcion: 'Buscamos perfil junior con conocimientos de HTML, CSS y JavaScript.',
    emailContacto: 'rrhh@technova.com',
    fecha: '2026-03-10',
  },
  {
    id: 2,
    tipo: 'demanda',
    titulo: 'Busco prácticas en frontend',
    categoria: 'Frontend',
    autor: 'Laura Martínez',
    ubicacion: 'Girona',
    descripcion: 'Estudiante DAW interesada en prácticas para aprender React y UX/UI.',
    emailContacto: 'laura@jobconnect.com',
    fecha: '2026-03-12',
  },
  {
    id: 3,
    tipo: 'oferta',
    titulo: 'Técnico/a de soporte IT',
    categoria: 'Sistemas',
    autor: 'Innova Services',
    ubicacion: 'Tarragona',
    descripcion: 'Se requiere perfil para soporte técnico presencial y remoto.',
    emailContacto: 'empleo@innovaservices.com',
    fecha: '2026-03-14',
  },
  {
    id: 4,
    tipo: 'demanda',
    titulo: 'Colaboración en startup tecnológica',
    categoria: 'Full Stack',
    autor: 'Ana Ruiz',
    ubicacion: 'Remoto',
    descripcion: 'Busco colaborar en un proyecto real para ganar experiencia práctica y portfolio.',
    emailContacto: 'ana@jobconnect.com',
    fecha: '2026-03-15',
  },
];

/**
 * Devuelve una copia defensiva de una publicación.
 * Aunque no tiene datos sensibles como un password, seguimos el mismo patrón
 * que con Usuario para que las mutaciones externas nunca afecten al estado interno.
 *
 * @param {object} publicacion
 * @returns {object}
 */
function serializarPublicacion(publicacion) {
  return { ...publicacion };
}

/**
 * Devuelve todas las publicaciones ordenadas por fecha descendente.
 * En caso de empate en fecha, ordena por id descendente (más reciente primero).
 *
 * @returns {Array<object>}
 */
export function listarPublicaciones() {
  const ordenadas = [...publicaciones].sort((a, b) => {
    const fechaA = new Date(a.fecha).getTime();
    const fechaB = new Date(b.fecha).getTime();
    if (fechaA !== fechaB) {
      return fechaB - fechaA;
    }
    return b.id - a.id;
  });
  return ordenadas.map(serializarPublicacion);
}

/**
 * Busca una publicación por su id.
 *
 * @param {number|string} id
 * @returns {object|null}
 */
export function buscarPublicacionPorId(id) {
  const idNum = Number(id);
  const encontrada = publicaciones.find((p) => p.id === idNum);
  return encontrada ? serializarPublicacion(encontrada) : null;
}

/**
 * Filtra publicaciones por tipo ("oferta" o "demanda").
 *
 * @param {string} tipo
 * @returns {Array<object>}
 */
export function listarPublicacionesPorTipo(tipo) {
  validarTipoPublicacion(tipo);
  const tipoNorm = normalizarTexto(tipo).toLowerCase();
  return listarPublicaciones().filter((p) => p.tipo === tipoNorm);
}

/**
 * Crea una nueva publicación tras normalizar y validar los datos.
 *
 * Flujo:
 *   1. Validar campos obligatorios presentes.
 *   2. Normalizar textos y email.
 *   3. Validar tipo, formato email, longitud descripción, fecha ISO.
 *   4. Calcular nuevo id autoincremental.
 *   5. Insertar y devolver la publicación creada.
 *
 * @param {object} datos
 * @returns {object} Publicación creada.
 * @throws {ValidationError}
 */
export function crearPublicacion(datos) {
  // 1. Campos obligatorios.
  validarCamposObligatorios(datos, [
    'tipo',
    'titulo',
    'categoria',
    'autor',
    'ubicacion',
    'descripcion',
    'emailContacto',
    'fecha',
  ]);

  // 2. Normalización.
  const tipo = normalizarTexto(datos.tipo).toLowerCase();
  const titulo = normalizarTexto(datos.titulo);
  const categoria = normalizarTexto(datos.categoria);
  const autor = normalizarTexto(datos.autor);
  const ubicacion = normalizarTexto(datos.ubicacion);
  const descripcion = normalizarTexto(datos.descripcion);
  const emailContacto = normalizarEmail(datos.emailContacto);
  const fecha = normalizarTexto(datos.fecha);

  // 3. Validaciones específicas.
  validarTipoPublicacion(tipo);
  validarEmail(emailContacto);
  validarFechaISO(fecha);
  validarLongitudMinima(descripcion, 10, 'descripcion');

  // 4. Nuevo id autoincremental.
  const siguienteId =
    publicaciones.length === 0
      ? 1
      : Math.max(...publicaciones.map((p) => p.id)) + 1;

  // 5. Insertar y devolver.
  const nueva = {
    id: siguienteId,
    tipo,
    titulo,
    categoria,
    autor,
    ubicacion,
    descripcion,
    emailContacto,
    fecha,
  };

  publicaciones.push(nueva);
  return serializarPublicacion(nueva);
}

/**
 * Elimina una publicación por su id.
 *
 * @param {number|string} id
 * @returns {object} Publicación eliminada.
 * @throws {ValidationError} Si el id no es un número válido.
 * @throws {NotFoundError} Si no existe publicación con ese id.
 */
export function eliminarPublicacionPorId(id) {
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new ValidationError('El identificador de la publicación no es válido.');
  }

  const indice = publicaciones.findIndex((p) => p.id === idNum);
  if (indice === -1) {
    throw new NotFoundError(`No se encontró ninguna publicación con id ${idNum}.`);
  }

  const [eliminada] = publicaciones.splice(indice, 1);
  return serializarPublicacion(eliminada);
}

/**
 * Devuelve el número de publicaciones por tipo.
 * Usado por el resumen del dashboard (en la entidad Seleccionada).
 *
 * @returns {{ofertas: number, demandas: number, total: number}}
 */
export function contarPublicaciones() {
  const ofertas = publicaciones.filter((p) => p.tipo === 'oferta').length;
  const demandas = publicaciones.filter((p) => p.tipo === 'demanda').length;
  return {
    ofertas,
    demandas,
    total: publicaciones.length,
  };
}