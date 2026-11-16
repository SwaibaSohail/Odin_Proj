// Limits on how fast things can be done, to slow down password guessing and spam.

const { rateLimit } = require("express-rate-limit");

const MINUTE = 60 * 1000;

function limiter(options, text) {
  return rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...options,
    handler: (req, res) => res.status(429).render("error", { title: "Slow down", message: text }),
  });
}

// 10 wrong passwords per 15 minutes from one address.
const loginLimiter = limiter({ windowMs: 15 * MINUTE, limit: 10, skipSuccessfulRequests: true }, "Too many attempts. Try again in a few minutes.");
// 20 new accounts, guests included, per hour from one address.
const signupLimiter = limiter({ windowMs: 60 * MINUTE, limit: 20, skipFailedRequests: true }, "Too many new accounts from this network. Try again later.");
// 30 posts, comments, likes or follows per 10 seconds from one person.
const writeLimiter = limiter({ windowMs: 10 * 1000, limit: 30, keyGenerator: (req) => `user:${req.user.id}` }, "You're doing that too fast. Wait a moment.");

module.exports = { loginLimiter, signupLimiter, writeLimiter };
