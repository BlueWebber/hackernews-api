const { shield, not, rule, allow, deny } = require("graphql-shield");
const {
  ForbiddenError,
  AuthenticationError,
} = require("apollo-server-express");

const isAuthenticated = rule({ cache: "contextual" })(
  //eslint-disable-next-line
  async (parent, args, ctx) => {
    const user = !!ctx.user;
    return user ? user : new AuthenticationError("Not authenticated");
  }
);

const isAdmin = rule({ cache: "contextual" })(
  //eslint-disable-next-line
  async (parent, args, ctx) => {
    const admin =
      ctx?.user?.role === "admin"
        ? true
        : new ForbiddenError("You must be an admin to execute this action");
    return admin;
  }
);

const permissions = shield(
  {
    Query: {
      "*": deny,
      feed: allow,
      info: isAuthenticated,
    },
    Mutation: {
      "*": deny,
      post: isAdmin,
      signup: not(isAuthenticated),
      login: not(isAuthenticated),
      vote: isAuthenticated,
    },
    Subscription: {
      "*": deny,
      newLink: isAuthenticated,
      newVote: isAuthenticated,
    },
  },
  {
    fallbackError: new AuthenticationError(
      "Unknown authentication error, please make sure your access token is correct"
    ),
    fallbackRule: allow,
  }
);

module.exports = permissions;
