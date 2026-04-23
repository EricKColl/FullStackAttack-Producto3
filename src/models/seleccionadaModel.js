/**
 * @file src/models/seleccionadaModel.js
 * @description Capa de acceso a datos para las publicaciones seleccionadas.
 *
 * Porta al backend la lógica del dashboard del Producto 2:
 *   - qué publicaciones están "marcadas" en el panel de selección.
 *   - cuáles están disponibles (aún no seleccionadas).
 *   - recuento total para las cajitas del resumen del dashboard.
 *
 * ⚠️ Estado actual:
 *   La estructura de seleccionadas sigue en memoria, pero este model ya se ha
 *   adaptado para trabajar correctamente con `publicacionModel` y `usuarioModel`,
 *   que en Fase 4 ya operan de forma asíncrona contra MongoDB.
 *
 * Dependencias:
 *   - Importa publicacionModel y usuarioModel para componer respuestas
 *     enriquecidas (ej: listarPublicacionesSeleccionadas devuelve las publicaciones
 *     completas, no solo ids).
 */

import * as publicacionModel from './publicacionModel.js';
import * as usuarioModel from './usuarioModel.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

/**
 * "Tabla" de seleccionadas en memoria.
 * Cada entrada almacena:
 *   - publicacionId: el id de la publicación seleccionada.
 *   - fechaSeleccion: timestamp ISO de cuándo se seleccionó.
 *
 * @type {Array<{publicacionId: number, fechaSeleccion: string}>}
 */
const seleccionadas = [];

/**
 * Devuelve los ids de las publicaciones actualmente seleccionadas,
 * en el orden en que fueron añadidas.
 *
 * @returns {Array<number>}
 */
export function listarIdsSeleccionados() {
  return seleccionadas.map((s) => s.publicacionId);
}

/**
 * Devuelve las publicaciones seleccionadas como objetos completos,
 * ordenadas por fecha de selección descendente (más recientes primero).
 *
 * Flujo:
 *   1. Obtener los ids seleccionados actuales.
 *   2. Leer todas las publicaciones desde publicacionModel.
 *   3. Construir un índice id → publicación para acceso rápido.
 *   4. Recorrer las seleccionadas en orden inverso de inserción.
 *   5. Devolver solo aquellas que siguen existiendo.
 *
 * @returns {Promise<Array<object>>}
 */
export async function listarPublicacionesSeleccionadas() {
  const ids = listarIdsSeleccionados();
  const porId = new Map();

  // Construimos un índice id → publicación una sola vez para no hacer
  // publicacionModel.buscarPublicacionPorId() en bucle.
  const publicaciones = await publicacionModel.listarPublicaciones();
  for (const pub of publicaciones) {
    porId.set(Number(pub.id), pub);
  }

  // Mantenemos el orden inverso de inserción (último seleccionado primero).
  return [...seleccionadas]
    .reverse()
    .map((s) => porId.get(Number(s.publicacionId)))
    .filter((pub) => pub !== undefined);
}

/**
 * Devuelve las publicaciones que todavía NO están seleccionadas,
 * en el mismo orden que listarPublicaciones() (por fecha desc).
 *
 * @returns {Promise<Array<object>>}
 */
export async function listarPublicacionesDisponibles() {
  const idsSeleccionados = new Set(listarIdsSeleccionados().map(Number));
  const publicaciones = await publicacionModel.listarPublicaciones();

  return publicaciones.filter((pub) => !idsSeleccionados.has(Number(pub.id)));
}

/**
 * Añade una publicación al panel de seleccionadas.
 *
 * Validaciones:
 *   - El id debe ser un número válido.
 *   - La publicación debe existir en publicacionModel.
 *   - Si ya estaba seleccionada, la operación es idempotente (no crea duplicado,
 *     pero tampoco lanza error — esto facilita la UX en el frontend).
 *
 * @param {number|string} idPublicacion
 * @returns {Promise<object>} La publicación seleccionada (objeto completo).
 * @throws {ValidationError}
 * @throws {NotFoundError}
 */
export async function anadirSeleccionada(idPublicacion) {
  const idNum = Number(idPublicacion);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new ValidationError('El identificador de la publicación no es válido.');
  }

  const publicacion = await publicacionModel.buscarPublicacionPorId(idNum);
  if (!publicacion) {
    throw new NotFoundError(`No existe la publicación con id ${idNum}.`);
  }

  // Idempotencia: si ya estaba seleccionada, devolvemos la publicación tal cual
  // sin crear duplicado y sin error (coherente con el comportamiento del P2).
  const yaSeleccionada = seleccionadas.some((s) => s.publicacionId === idNum);
  if (!yaSeleccionada) {
    seleccionadas.push({
      publicacionId: idNum,
      fechaSeleccion: new Date().toISOString(),
    });
  }

  return publicacion;
}

/**
 * Quita una publicación del panel de seleccionadas.
 *
 * @param {number|string} idPublicacion
 * @returns {Promise<object>} La publicación que se quitó.
 * @throws {ValidationError} Si el id no es válido.
 * @throws {NotFoundError} Si la publicación no estaba seleccionada
 *                         (o directamente no existe).
 */
export async function quitarSeleccionada(idPublicacion) {
  const idNum = Number(idPublicacion);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new ValidationError('El identificador de la publicación no es válido.');
  }

  const indice = seleccionadas.findIndex((s) => s.publicacionId === idNum);
  if (indice === -1) {
    throw new NotFoundError(`La publicación con id ${idNum} no estaba seleccionada.`);
  }

  seleccionadas.splice(indice, 1);

  // Devolvemos la publicación completa si aún existe, o un "placeholder" mínimo
  // si la publicación original fue eliminada pero la selección persistía.
  const publicacion = await publicacionModel.buscarPublicacionPorId(idNum);
  return publicacion || { id: idNum };
}

/**
 * Limpia todas las seleccionadas que apuntan a publicaciones inexistentes.
 *
 * Se debe llamar tras eliminar una publicación, para mantener coherencia
 * entre ambas "tablas". Lo hace el resolver de eliminarPublicacion en Fase 4
 * (o un trigger de MongoDB con $lookup en Atlas).
 *
 * @returns {Promise<number>} Cantidad de selecciones huérfanas eliminadas.
 */
export async function limpiarSeleccionesHuerfanas() {
  const publicaciones = await publicacionModel.listarPublicaciones();
  const idsExistentes = new Set(publicaciones.map((p) => Number(p.id)));

  const antes = seleccionadas.length;

  for (let i = seleccionadas.length - 1; i >= 0; i--) {
    if (!idsExistentes.has(Number(seleccionadas[i].publicacionId))) {
      seleccionadas.splice(i, 1);
    }
  }

  return antes - seleccionadas.length;
}

/**
 * Devuelve el resumen numérico para el dashboard del Producto 2:
 *   - total de ofertas
 *   - total de demandas
 *   - total de usuarios
 *   - total de publicaciones seleccionadas
 *
 * Este es el payload exacto que el dashboard del frontend renderiza en sus
 * cajitas de resumen en la parte superior de la página.
 *
 * @returns {Promise<{totalOfertas: number, totalDemandas: number, totalUsuarios: number, totalSeleccionadas: number}>}
 */
export async function obtenerResumenDashboard() {
  const recuento = await publicacionModel.contarPublicaciones();
  const usuarios = await usuarioModel.listarUsuarios();

  return {
    totalOfertas: recuento.ofertas,
    totalDemandas: recuento.demandas,
    totalUsuarios: usuarios.length,
    totalSeleccionadas: seleccionadas.length,
  };
}