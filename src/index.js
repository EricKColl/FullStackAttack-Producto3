import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { typeDefs } from "./graphql/typeDefs.js";
import { resolvers } from "./graphql/resolvers/index.js";
import { connectToMongo } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

async function startServer() {
    try {
        // 1. Conectar a MongoDB
        await connectToMongo();

        // 2. Arrancar Apollo
        await server.start();

        // 3. Middlewares de Express
        app.use(cors());
        app.use(express.json());

        // 4. Ruta GraphQL
        app.use(
            "/graphql",
            expressMiddleware(server, {
                context: async () => ({}),
            })
        );

        // 5. Ruta simple para comprobar que Express vive
        app.get("/", (req, res) => {
            res.send("Servidor backend de JobConnect funcionando");
        });

        // 6. Arrancar servidor
        app.listen(PORT, () => {
            console.log(`Servidor escuchando en http://localhost:${PORT}/graphql`);
        });
    } catch (error) {
        console.error("Error al arrancar el servidor:", error.message);
    }
}

startServer();