import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME;

let client;
let db;

export async function connectToMongo() {
    try {
        client = new MongoClient(uri);
        await client.connect();
        db = client.db(dbName);
        console.log(`Conectado a MongoDB: ${dbName}`);
        return db;
    } catch (error) {
        console.error("Error al conectar con MongoDB:", error.message);
        throw error;
    }
}

export function getDb() {
    if (!db) {
        throw new Error("La base de datos no está conectada todavía.");
    }
    return db;
}