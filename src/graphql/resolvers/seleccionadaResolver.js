/**
 * @file src/graphql/resolvers/seleccionadaResolver.js
 * @description Resolvers GraphQL para las publicaciones seleccionadas
 *              y el resumen del dashboard.
 *
 * Cubre toda la lógica del panel de drag & drop del Producto 2:
 *   - qué hay seleccionado ahora mismo
 *   - qué queda disponible para arrastrar
 *   - añadir o quitar publicaciones del panel
 *   - obtener los totales que pintan las cajitas del dashboard
 *
 * Siguiendo el patrón "thin resolver / fat model", aquí solo adaptamos
 * argumentos y delegamos en seleccionadaModel.
 */

import * as seleccionadaModel from '../../models/seleccionadaModel.js';

export const seleccionadaResolver = {
  Query: {
    /**
     * Devuelve solo los ids de las publicaciones seleccionadas.
     */
    idsSeleccionados: () => {
      return seleccionadaModel.listarIdsSeleccionados();
    },

    /**
     * Devuelve las publicaciones seleccionadas como objetos completos.
     */
    listarPublicacionesSeleccionadas: () => {
      return seleccionadaModel.listarPublicacionesSeleccionadas();
    },

    /**
     * Devuelve las publicaciones que aún no están seleccionadas.
     */
    listarPublicacionesDisponibles: () => {
      return seleccionadaModel.listarPublicacionesDisponibles();
    },

    /**
     * Devuelve el resumen numérico del dashboard (4 totales).
     */
    resumenDashboard: () => {
      return seleccionadaModel.obtenerResumenDashboard();
    },
  },

  Mutation: {
    /**
     * Añade una publicación al panel de seleccionadas.
     *
     * @param {unknown} _parent
     * @param {{idPublicacion: string}} args
     */
    anadirSeleccionada: (_parent, args) => {
      return seleccionadaModel.anadirSeleccionada(args.idPublicacion);
    },

    /**
     * Quita una publicación del panel de seleccionadas.
     *
     * @param {unknown} _parent
     * @param {{idPublicacion: string}} args
     */
    quitarSeleccionada: (_parent, args) => {
      return seleccionadaModel.quitarSeleccionada(args.idPublicacion);
    },
  },
};