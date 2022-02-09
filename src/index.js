const { createServer } = require("http");
const { execute, subscribe, separateOperations } = require("graphql");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const express = require("express");
const {
  ApolloServer,
  AuthenticationError,
  ValidationError,
} = require("apollo-server-express");
const fs = require("fs");
const path = require("path");
const Query = require("./resolvers/Query");
const Mutation = require("./resolvers/Mutation");
const User = require("./resolvers/User");
const Link = require("./resolvers/Link");
const Subscription = require("./resolvers/Subscription");
const Vote = require("./resolvers/Vote");
const { getUser } = require("./auth");
const { PrismaClient } = require("@prisma/client");
const { PubSub } = require("graphql-subscriptions");
const { applyMiddleware } = require("graphql-middleware");
const permissions = require("./permissions");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const {
  createComplexityDirective,
  directiveEstimator,
  getComplexity,
  simpleEstimator,
} = require("graphql-query-complexity");

(async function () {
  const app = express();
  const prisma = new PrismaClient();
  const pubsub = new PubSub();
  const httpServer = createServer(app);

  let schema = makeExecutableSchema({
    typeDefs: fs.readFileSync(path.join(__dirname, "schema.graphql"), "utf8"),
    resolvers: {
      Query,
      Mutation,
      Subscription,
      User,
      Link,
      Vote,
    },
    schemaDirectives: {
      complexity: createComplexityDirective({
        name: "complexity",
      }),
    },
  });
  schema = applyMiddleware(schema, permissions);

  const context = { prisma, pubsub };
  const queryComplexityGetter = ({ query, variables }) =>
    getComplexity({
      schema,
      query,
      variables,
      estimators: [
        directiveEstimator({
          name: "complexity",
        }),
        simpleEstimator({
          defaultComplexity: config.queryComplexity.defaultEstimatorComplexity,
        }),
      ],
    });

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      return {
        ...context,
        user: req?.headers?.authorization ? await getUser(prisma, req) : null,
      };
    },
    formatError: (err) => {
      if (err.message.startsWith("Context creation failed:")) {
        return new AuthenticationError("Invalid token form/signature");
      }
      return err;
    },

    plugins: [
      {
        requestDidStart: () => ({
          didResolveOperation({ request, document }) {
            const complexity = queryComplexityGetter({
              query: request.operationName
                ? separateOperations(document)[request.operationName]
                : document,
              variables: request.variables,
            });

            if (complexity >= config.queryComplexity.maxComplexity) {
              throw new ValidationError(
                `Sorry, your query is too complex! ${complexity} is over ${config.queryComplexity.maxComplexity} which is the max allowed Query/Mutation complexity.`
              );
            }
          },
        }),
      },
    ],
  });
  await server.start();

  const limitMiddleware = rateLimit(config.rateLimit);
  app.use(limitMiddleware);
  server.applyMiddleware({ app });

  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe: (
        schema,
        document,
        rootValue,
        contextValue,
        variableValues,
        operationName
      ) => {
        const complexity = queryComplexityGetter({
          query: operationName
            ? separateOperations(document)[operationName]
            : document,
          variables: variableValues,
        });

        if (complexity >= config.queryComplexity.maxSubscriptionComplexity) {
          throw new ValidationError(
            `Sorry, your subscription query is too complex! ${complexity} is over ${config.queryComplexity.maxSubscriptionComplexity} 
            which is the max allowed Subscription complexity.`
          );
        }

        return subscribe(
          schema,
          document,
          rootValue,
          contextValue,
          variableValues,
          operationName
        );
      },
      onConnect: async (connectionParams) => {
        const user = connectionParams?.authorization
          ? await getUser(prisma, null, connectionParams.authorization)
          : null;
        return {
          ...context,
          user,
        };
      },
    },
    { server: httpServer, path: server.graphqlPath }
  );

  httpServer.listen(config.port, () =>
    console.log(
      `Server is now running on http://localhost:${config.port}/graphql`
    )
  );
})();
