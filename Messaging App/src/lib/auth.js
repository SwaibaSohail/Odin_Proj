const jwt = require("jsonwebtoken");
const prisma = require("./prisma");

const COOKIE = "parley_token";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// The app checks in every few seconds while it's open. Someone counts as
// online if their last check-in was within this window.
const ONLINE_WINDOW_MS = 90 * 1000;
// Writing every check-in to the database would be wasteful, so do it this often.
const CHECK_IN_EVERY_MS = 30 * 1000;
const lastCheckIn = new Map();

// JavaScript on the page can't read the cookie, and other sites can't send it
// along with their requests.
function cookieOptions() {
  return { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" };
}

async function logIn(res, userId) {
  const token = jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: WEEK_MS });
  await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  lastCheckIn.set(userId, Date.now());
}

async function logOut(res, userId) {
  res.clearCookie(COOKIE, cookieOptions());
  if (!userId) return;
  // Move the last check-in back so they show as offline straight away.
  lastCheckIn.delete(userId);
  await prisma.user.updateMany({
    where: { id: userId },
    data: { lastSeenAt: new Date(Date.now() - ONLINE_WINDOW_MS) },
  });
}

// The logged-in user's id, or null if the cookie is missing, expired or forged.
function userIdFromRequest(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  const id = userIdFromRequest(req);
  if (!id) return res.status(401).json({ error: "Log in to continue." });

  if (Date.now() - (lastCheckIn.get(id) || 0) > CHECK_IN_EVERY_MS) {
    const { count } = await prisma.user.updateMany({ where: { id }, data: { lastSeenAt: new Date() } });
    if (count === 0) {
      // The cookie is real but the account is gone.
      res.clearCookie(COOKIE, cookieOptions());
      return res.status(401).json({ error: "Log in to continue." });
    }
    lastCheckIn.set(id, Date.now());
  }

  req.user = { id };
  next();
}

function isOnline(lastSeenAt) {
  return Boolean(lastSeenAt) && Date.now() - lastSeenAt.getTime() < ONLINE_WINDOW_MS;
}

module.exports = { logIn, logOut, userIdFromRequest, requireAuth, isOnline };
