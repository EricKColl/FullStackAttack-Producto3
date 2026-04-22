/**
 * @file src/utils/errors.js
 * @description Clases de error personalizadas para el backend.
 *
 * Cada error tiene:
 *   - statusCode: HTTP status que devolverá el errorHandler.
 *   - code:       string identificador para el cliente (p. ej. "VALIDATION_ERROR").
 *
 * Uso típico en models/resolvers:
 *   throw new ValidationError('El email no es válido.');
 *   throw new NotFoundError('Usuario no encontrado.');
 *   throw new ConflictError('Ya existe un usuario con ese email.');
 *
 * El middleware src/middleware/errorHandler.js lee estas propiedades
 * y construye automáticamente la respuesta HTTP correspondiente.
 */

/**
 * Error base del que heredan todos los errores personalizados del dominio.
 * Nunca se lanza directamente: se usan sus subclases.
 */
export class AppError extends Error {
  /**
   * @param {string} mensaje - Mensaje descriptivo para el cliente.
   * @param {number} statusCode - HTTP status code (400, 404, 409, etc.).
   * @param {string} code - Código simbólico del error (UPPER_SNAKE_CASE).
   */
  constructor(mensaje, statusCode, code) {
    super(mensaje);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;

    // Captura el stack trace sin incluir esta función constructor.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error 400 — Datos de entrada inválidos.
 *
 * Se lanza cuando el cliente envía datos que no cumplen las reglas de validación:
 * email con formato incorrecto, fecha mal formada, campos obligatorios vacíos, etc.
 */
export class ValidationError extends AppError {
  /** @param {string} mensaje */
  constructor(mensaje) {
    super(mensaje, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Error 404 — Recurso no encontrado.
 *
 * Se lanza cuando se busca una entidad por id/email y no existe en la BBDD.
 */
export class NotFoundError extends AppError {
  /** @param {string} mensaje */
  constructor(mensaje) {
    super(mensaje, 404, 'NOT_FOUND');
  }
}

/**
 * Error 409 — Conflicto con el estado actual del recurso.
 *
 * Se lanza típicamente al intentar crear una entidad duplicada:
 * un usuario con un email ya registrado, por ejemplo.
 */
export class ConflictError extends AppError {
  /** @param {string} mensaje */
  constructor(mensaje) {
    super(mensaje, 409, 'CONFLICT');
  }
}

/**
 * Error 401 — No autenticado.
 *
 * Se lanza cuando se intenta acceder a una operación protegida sin
 * enviar un token JWT válido. Se usará en la Fase 5.
 */
export class UnauthorizedError extends AppError {
  /** @param {string} mensaje */
  constructor(mensaje) {
    super(mensaje, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error 403 — Autenticado pero sin permisos.
 *
 * Se lanza cuando el usuario está autenticado pero no tiene el rol
 * necesario para ejecutar la operación. Se usará en la Fase 5.
 */
export class ForbiddenError extends AppError {
  /** @param {string} mensaje */
  constructor(mensaje) {
    super(mensaje, 403, 'FORBIDDEN');
  }
}