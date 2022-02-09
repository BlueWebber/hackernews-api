const config = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 5000,
    message: {
      errors: [
        {
          message:
            "Too many requests, the rate limit is 100 requests every 15 minutes.",
        },
      ],
    },
  },
  queryComplexity: {
    maxComplexity: 1000,
    maxSubscriptionComplexity: 70,
    defaultEstimatorComplexity: 1,
  },
  port: 4000,
};

module.exports = config;
