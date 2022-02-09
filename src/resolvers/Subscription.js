const newLink = {
  subscribe: (parent, args, context) =>
    context.pubsub.asyncIterator("NEW_LINK"),
  resolve: (payload) => {
    return payload;
  },
};

const newVote = {
  subscribe: (parent, args, context) =>
    context.pubsub.asyncIterator("NEW_VOTE"),
  resolve: (payload) => {
    return payload;
  },
};

module.exports = {
  newLink,
  newVote,
};
