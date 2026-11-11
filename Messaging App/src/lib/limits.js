// Limits on how fast things can be done, to slow down password guessing and spam.

const { rateLimit } = require("express-rate-limit");

const MINUTE = 60 * 1000;
const shared = { standardHeaders: "draft-8", legacyHeaders: false };

// 10 wrong passwords per 15 minutes from one address.
const loginLimiter = rateLimit({
  ...shared,
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

// 20 new accounts per hour from one address.
const signupLimiter = rateLimit({
  ...shared,
  windowMs: 60 * MINUTE,
  limit: 20,
  skipFailedRequests: true,
  message: { error: "Too many new accounts from this network. Try again later." },
});

// 20 messages per 10 seconds from one person.
const sendLimiter = rateLimit({
  ...shared,
  windowMs: 10 * 1000,
  limit: 20,
  keyGenerator: (req) => `user:${req.user.id}`,
  message: { error: "You're sending messages too fast. Wait a moment." },
});

module.exports = { loginLimiter, signupLimiter, sendLimiter };
