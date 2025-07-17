const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const http = require('http');
const cors = require('cors');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');

const connectDB = require('./db');
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./schema/resolvers');

(async () => {
  await connectDB();

  const app = express();
  
  // Trust proxy to get real IP addresses
  app.set('trust proxy', true);
  
  // Increase payload limits for base64 images
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cors());

  const httpServer = http.createServer(app);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    context: ({ req }) => ({
      req
    }),
  });

  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}${server.graphqlPath}`);
  });
})();