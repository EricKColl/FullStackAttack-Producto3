export const resolvers = {
    Query: {
        saludo: () => {
            return "Hola, GraphQL está funcionando";
        },
        estado: () => {
            return "Backend operativo";
        },
    },
};