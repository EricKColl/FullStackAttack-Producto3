/**
 * @file src/models/usuarioModel.js
 * @description Capa de acceso a datos para la entidad Usuario.
 *
 * Porta al backend la lógica de `almacenaje.js` del Producto 2 relacionada
 * con usuarios (listarUsuarios, crearUsuario, eliminarUsuario, loguearUsuario).
 *
 * ⚠️ Estado actual (Fase 3): los datos viven en un array en memoria.
 *    Al reiniciar el servidor se pierden, salvo los que carga el seed inicial.
 *    En la Fase 4 migraremos esta capa a MongoDB sin tocar los resolvers.
 *
 * Diseño:
 *   - Las funciones reciben datos crudos, los normalizan y validan.
 *   - Si los datos no pasan validación, lanzan ValidationError.
 *   - Si el recurso no existe o ya existe, lanzan NotFoundError / ConflictError.
 *   - Devuelven copias (no referencias) para evitar mutaciones accidentales
 *     desde capas superiores.
 */

import {
  normalizarTexto,
  normalizarEmail,
  validarCamposObligatorios,
  validarEmail,
  validarLongitudMinima,
  validarRol,
} from '../utils/validators.js';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

/**
 * "Tabla" de usuarios en memoria. Sembrada con los mismos usuarios iniciales
 * que tenía el Producto 2, para mantener continuidad con la webapp original.
 *
 * @type {Array<{id: number, nombre: string, apellidos: string, email: string, password: string, rol: string}>}
 */
const usuarios = [
  {
    id: 1,
    nombre: 'Laura',
    apellidos: 'Martínez',
    email: 'laura@jobconnect.com',
    password: '1234',
    rol: 'candidato',
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellidos: 'Gómez',
    email: 'carlos@techempresa.com',
    password: '1234',
    rol: 'empresa',
  },
  {
    id: 3,
    nombre: 'Ana',
    apellidos: 'Ruiz',
    email: 'ana@jobconnect.com',
    password: '1234',
    rol: 'candidato',
  },
];

/**
 * Devuelve una copia defensiva de un usuario, sin la contraseña.
 *
 * Jamás queremos exponer `password` en respuestas GraphQL aunque esté en la BBDD,
 * ni siquiera hasheada. Esta función centraliza esa garantía: cualquier cosa
 * que devuelva el model ya no contendrá password.
 *
 * @param {object} usuario
 * @returns {object} Copia del usuario sin la propiedad password.
 */
function serializarUsuario(usuario) {
  const { password, ...seguro } = usuario;
  return { ...seguro };
}

/**
 * Devuelve la lista de usuarios ordenada alfabéticamente por nombre completo.
 *
 * @returns {Array<object>} Usuarios sin password.
 */
export function listarUsuarios() {
  const ordenados = [...usuarios].sort((a, b) => {
    const nombreA = `${a.nombre} ${a.apellidos}`.toLowerCase();
    const nombreB = `${b.nombre} ${b.apellidos}`.toLowerCase();
    return nombreA.localeCompare(nombreB);
  });
  return ordenados.map(serializarUsuario);
}

/**
 * Busca un usuario por su id.
 *
 * @param {number|string} id
 * @returns {object|null} Usuario sin password, o null si no existe.
 */
export function buscarUsuarioPorId(id) {
  const idNum = Number(id);
  const encontrado = usuarios.find((u) => u.id === idNum);
  return encontrado ? serializarUsuario(encontrado) : null;
}

/**
 * Busca un usuario por su email (case-insensitive).
 *
 * @param {string} email
 * @returns {object|null} Usuario sin password, o null si no existe.
 */
export function buscarUsuarioPorEmail(email) {
  const emailNorm = normalizarEmail(email);
  const encontrado = usuarios.find((u) => u.email === emailNorm);
  return encontrado ? serializarUsuario(encontrado) : null;
}

/**
 * Crea un nuevo usuario tras normalizar y validar los datos de entrada.
 *
 * Flujo:
 *   1. Validar campos obligatorios presentes.
 *   2. Normalizar email (lowercase, trim).
 *   3. Validar formato email, longitud password, rol permitido.
 *   4. Comprobar que el email no esté ya registrado.
 *   5. Calcular nuevo id autoincremental.
 *   6. Insertar en la "tabla" y devolver el usuario sin password.
 *
 * @param {object} datos
 * @param {string} datos.nombre
 * @param {string} datos.apellidos
 * @param {string} datos.email
 * @param {string} datos.password
 * @param {string} datos.rol
 * @returns {object} Usuario creado (sin password).
 * @throws {ValidationError} Si los datos no son válidos.
 * @throws {ConflictError} Si el email ya está registrado.
 */
export function crearUsuario(datos) {
  // 1. Campos obligatorios.
  validarCamposObligatorios(datos, [
    'nombre',
    'apellidos',
    'email',
    'password',
    'rol',
  ]);

  // 2. Normalización.
  const nombre = normalizarTexto(datos.nombre);
  const apellidos = normalizarTexto(datos.apellidos);
  const email = normalizarEmail(datos.email);
  const password = normalizarTexto(datos.password);
  const rol = normalizarTexto(datos.rol).toLowerCase();

  // 3. Validaciones específicas.
  validarEmail(email);
  validarLongitudMinima(password, 4, 'password');
  validarRol(rol);

  // 4. Email único.
  if (usuarios.some((u) => u.email === email)) {
    throw new ConflictError('Ya existe un usuario con ese correo electrónico.');
  }

  // 5. Nuevo id autoincremental.
  const siguienteId =
    usuarios.length === 0
      ? 1
      : Math.max(...usuarios.map((u) => u.id)) + 1;

  // 6. Insertar y devolver.
  const nuevoUsuario = {
    id: siguienteId,
    nombre,
    apellidos,
    email,
    password,
    rol,
  };

  usuarios.push(nuevoUsuario);
  return serializarUsuario(nuevoUsuario);
}

/**
 * Elimina un usuario por su email.
 *
 * @param {string} email
 * @returns {object} El usuario eliminado (sin password).
 * @throws {ValidationError} Si el email no es válido.
 * @throws {NotFoundError} Si no existe ningún usuario con ese email.
 */
export function eliminarUsuarioPorEmail(email) {
  const emailNorm = normalizarEmail(email);

  if (emailNorm === '') {
    throw new ValidationError('Debes indicar el email del usuario a eliminar.');
  }

  const indice = usuarios.findIndex((u) => u.email === emailNorm);
  if (indice === -1) {
    throw new NotFoundError(`No se encontró ningún usuario con email "${emailNorm}".`);
  }

  const [eliminado] = usuarios.splice(indice, 1);
  return serializarUsuario(eliminado);
}

/**
 * Autentica a un usuario comprobando email + password.
 *
 * Nota: en Fase 5 sustituiremos la comparación directa de password por
 * comparación contra un hash bcrypt. De momento es comparación de strings
 * porque los seeds del P2 también eran en texto plano.
 *
 * @param {string} email
 * @param {string} password
 * @returns {object} Usuario autenticado (sin password).
 * @throws {ValidationError} Si faltan credenciales.
 * @throws {NotFoundError} Si las credenciales no coinciden con ningún usuario.
 */
export function loguearUsuario(email, password) {
  const emailNorm = normalizarEmail(email);
  const passwordNorm = normalizarTexto(password);

  if (emailNorm === '' || passwordNorm === '') {
    throw new ValidationError('Debes introducir correo y contraseña.');
  }

  const encontrado = usuarios.find(
    (u) => u.email === emailNorm && u.password === passwordNorm
  );

  if (!encontrado) {
    // Devolvemos NotFoundError en lugar de UnauthorizedError porque
    // todavía no tenemos sistema de sesiones. En Fase 5 esto cambia.
    throw new NotFoundError('Credenciales incorrectas. Revisa el correo y la contraseña.');
  }

  return serializarUsuario(encontrado);
}