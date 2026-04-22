/**
 * @file src/graphql/resolvers/publicacionResolver.js
 * @description Resolvers GraphQL para la entidad Publicación.
 *
 * Siguen el mismo patrón que usuarioResolver: resolvers finos que delegan
 * toda la lógica de normalización, validación y persistencia al model.
 *
 * Excepción importante: eliminarPublicacion coordina DOS models (publicacion
 * + seleccionada) para mantener la coherencia del dashboard tras un borrado.
 * Esta coordinación inter-entidades es responsabilidad del resolver, no
 * del model, porque afecta a dos agregados distintos.
 */

import * as publicacionModel from '../../models/publicacionModel.js';
import * as seleccionadaModel from '../../models/seleccionadaModel.js';

export const publicacionResolver = {
  Query: {
    listarPublicaciones: () => {
      return publicacionModel.listarPublicaciones();
    },

    /**
     * @param {unknown} _parent
     * @param {{tipo: string}} args
     */
    listarPublicacionesPorTipo: (_parent, args) => {
      return publicacionModel.listarPublicacionesPorTipo(args.tipo);
    },

    /**
     * @param {unknown} _parent
     * @param {{id: string}} args
     */
    publicacionPorId: (_parent, args) => {
      return publicacionModel.buscarPublicacionPorId(args.id);
    },

    recuentoPublicaciones: () => {
      return publicacionModel.contarPublicaciones();
    },
  },

  Mutation: {
    /**
     * Crea una publicación nueva tras validar todos sus campos.
     *
     * @param {unknown} _parent
     * @param {{datos: object}} args
     */
    crearPublicacion: (_parent, args) => {
      return publicacionModel.crearPublicacion(args.datos);
    },

    /**
     * Elimina una publicación por su id y mantiene coherencia limpiando
     * cualquier entrada huérfana en el panel de seleccionadas.
     *
     * Orden de operaciones:
     *   1. Eliminar la publicación (si no existe, el model lanza NotFoundError
     *      y nunca tocamos seleccionadas).
     *   2. Limpiar posibles huérfanas en seleccionadas.
     *   3. Devolver la publicación eliminada al cliente.
     *
     * @param {unknown} _parent
     * @param {{id: string}} args
     */
    eliminarPublicacion: (_parent, args) => {
      const eliminada = publicacionModel.eliminarPublicacionPorId(args.id);
      seleccionadaModel.limpiarSeleccionesHuerfanas();
      return eliminada;
    },
  },
};