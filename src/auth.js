const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server-express");

function getTokenPayload(token) {
  return jwt.verify(token, process.env.APP_SECRET);
}

function getUserId(req = null, authToken = null) {
  const token =
    req?.headers?.authorization?.replace("Bearer ", "") ||
    authToken?.replace("Bearer ", "");

  if (token) {
    try {
      return getTokenPayload(token).userId;
    } catch (ex) {
      throw new AuthenticationError("Invalid token");
    }
  }

  throw new AuthenticationError("Not authenticated");
}

async function getUser(prisma, req = null, authToken = null) {
  const userId = getUserId(req, authToken);
  return await prisma.user.findUnique({ where: { id: userId } });
}

module.exports = {
  getUser,
  getUserId,
};
