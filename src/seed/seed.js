/**
 * @file src/seed/seed.js
 * @description Seed inicial de la base de datos MongoDB.
 *
 * Este script inserta datos base heredados del Producto 2 y crea índices
 * mínimos para garantizar integridad y mejorar búsquedas frecuentes.
 *
 * Se ejecuta al arrancar el servidor, pero evita duplicar datos si la base
 * ya contiene usuarios o publicaciones.
 */

import { getDb } from '../config/db.js';

/**
 * Crea índices en las colecciones principales.
 *
 * Los índices refuerzan reglas de negocio y optimizan consultas habituales:
 *   - email único para usuarios.
 *   - id único para usuarios y publicaciones.
 *   - tipo/fecha para filtros y ordenaciones de publicaciones.
 *   - publicacionId único para evitar seleccionadas duplicadas.
 *
 * @returns {Promise<void>}
 */
async function crearIndices() {
    const db = getDb();

    const usuarios = db.collection('usuarios');
    const publicaciones = db.collection('publicaciones');
    const seleccionadas = db.collection('seleccionadas');

    await usuarios.createIndex({ email: 1 }, { unique: true });
    await usuarios.createIndex({ id: 1 }, { unique: true });

    await publicaciones.createIndex({ id: 1 }, { unique: true });
    await publicaciones.createIndex({ tipo: 1 });
    await publicaciones.createIndex({ fecha: -1 });

    await seleccionadas.createIndex({ publicacionId: 1 }, { unique: true });

    console.log('[seed] Índices verificados.');
}

/**
 * Inserta datos iniciales si la base está vacía.
 *
 * @returns {Promise<void>}
 */
export async function seedDatabase() {
    const db = getDb();

    const usuarios = db.collection('usuarios');
    const publicaciones = db.collection('publicaciones');

    await crearIndices();

    const countUsuarios = await usuarios.countDocuments();
    const countPublicaciones = await publicaciones.countDocuments();

    if (countUsuarios > 0 || countPublicaciones > 0) {
        console.log('[seed] Datos iniciales ya existentes. Seed no ejecutado.');
        return;
    }

    await usuarios.insertMany([
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
    ]);

    await publicaciones.insertMany([
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
    ]);

    console.log('[seed] Datos iniciales insertados correctamente.');
}