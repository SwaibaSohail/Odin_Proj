// JWT log-in. Clients send the token in an "Authorization: Bearer <token>" header.

const jwt = require("jsonwebtoken");
const prisma = require("./prisma");

const TOKEN_LIFETIME = "7d";
const PUBLIC_USER_FIELDS = { id: true, username: true, name: true, role: true };

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_LIFETIME,
  });
}

// Reads the token, if there is one. Returns the user, null when there's no
// token, or throws an error with a message for the client when it's invalid.
async function userFromRequest(req) {
  const header = req.get("Authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new Error('Send the token as "Authorization: Bearer <token>".');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error(
      err.name === "TokenExpiredError" ? "Your session has expired. Log in again." : "Invalid token."
    );
  }

  // The account might have been deleted since the token was made.
  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) }, select: PUBLIC_USER_FIELDS });
  if (!user) throw new Error("Invalid token.");
  return user;
}

// For routes anyone can use, where a logged-in author sees more (like drafts).
// A token that's present but invalid is still rejected, so clients find out.
async function optionalAuth(req, res, next) {
  try {
    req.user = await userFromRequest(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
  next();
}

async function requireAuth(req, res, next) {
  let user;
  try {
    user = await userFromRequest(req);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
  if (!user) return res.status(401).json({ error: "Log in first." });
  req.user = user;
  next();
}

// Authors only. Use after requireAuth.
function requireAuthor(req, res, next) {
  if (req.user.role !== "AUTHOR") {
    return res.status(403).json({ error: "Only authors can do that." });
  }
  next();
}

const isAuthor = (user) => Boolean(user && user.role === "AUTHOR");

module.exports = { signToken, optionalAuth, requireAuth, requireAuthor, isAuthor, PUBLIC_USER_FIELDS };
