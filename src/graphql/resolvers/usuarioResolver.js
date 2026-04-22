/**
 * @file src/graphql/resolvers/usuarioResolver.js
 * @description Resolvers GraphQL para la entidad Usuario.
 *
 * Cada función aquí se corresponde con una Query o Mutation declarada
 * en src/graphql/typeDefs.js. Los resolvers son delgados a propósito:
 * delegan toda la lógica de normalización, validación y persistencia
 * al model (src/models/usuarioModel.js).
 *
 * Si un model lanza un AppError (ValidationError, NotFoundError, etc.),
 * Apollo Server lo atrapa y lo transforma automáticamente en una respuesta
 * GraphQL con el campo `errors` poblado, incluyendo code y message.
 */

import * as usuarioModel from '../../models/usuarioModel.js';

export const usuarioResolver = {
  Query: {
    /**
     * Lista todos los usuarios ordenados alfabéticamente.
     * No requiere argumentos.
     */
    listarUsuarios: () => {
      return usuarioModel.listarUsuarios();
    },

    /**
     * Busca un usuario por email. Devuelve null si no existe
     * (GraphQL permite null porque el campo `usuarioPorEmail: Usuario`
     *  no lleva el signo de exclamación).
     *
     * @param {unknown} _parent
     * @param {{email: string}} args
     */
    usuarioPorEmail: (_parent, args) => {
      return usuarioModel.buscarUsuarioPorEmail(args.email);
    },
  },

  Mutation: {
    /**
     * Crea un usuario nuevo.
     * El model lanza ValidationError o ConflictError si algo falla.
     *
     * @param {unknown} _parent
     * @param {{datos: object}} args
     */
    crearUsuario: (_parent, args) => {
      return usuarioModel.crearUsuario(args.datos);
    },

    /**
     * Elimina un usuario por email. Devuelve el usuario eliminado.
     * El model lanza NotFoundError si no existe.
     *
     * @param {unknown} _parent
     * @param {{email: string}} args
     */
    eliminarUsuario: (_parent, args) => {
      return usuarioModel.eliminarUsuarioPorEmail(args.email);
    },

    /**
     * Autentica a un usuario por email + password.
     * Devuelve el usuario sin password si las credenciales coinciden.
     * En la Fase 5 esta mutation se evolucionará a loginAdmin con JWT.
     *
     * @param {unknown} _parent
     * @param {{email: string, password: string}} args
     */
    loguearUsuario: (_parent, args) => {
      return usuarioModel.loguearUsuario(args.email, args.password);
    },
  },
};