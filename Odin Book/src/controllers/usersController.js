const prisma = require("../lib/prisma");
const { parseId, flash, goBack, NotFound } = require("../lib/http");
const { USER_CARD, listPosts, withFollowState } = require("../lib/social");

const NO_SUCH_PERSON = "That person doesn't exist.";

async function findUser(username) {
  const user = await prisma.user.findUnique({ where: { username: String(username).toLowerCase() }, select: USER_CARD });
  if (!user) throw new NotFound(NO_SUCH_PERSON);
  return user;
}

// GET /users. Everyone, with a button to follow each person. ?q= searches.
async function index(req, res) {
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 40) : "";
  const search = q ? { OR: [{ displayName: { contains: q, mode: "insensitive" } }, { username: { contains: q.toLowerCase() } }] } : {};
  const users = await prisma.user.findMany({
    where: { id: { not: req.user.id }, isGuest: false, ...search },
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
    take: 100,
    select: USER_CARD,
  });
  res.render("users", { title: "People", q, people: await withFollowState(req.user.id, users) });
}

async function profileData(req) {
  const user = await findUser(req.params.username);
  const [[person], posts, followers, following] = await Promise.all([
    withFollowState(req.user.id, [user]),
    prisma.post.count({ where: { authorId: user.id } }),
    prisma.follow.count({ where: { followingId: user.id, status: "ACCEPTED" } }),
    prisma.follow.count({ where: { followerId: user.id, status: "ACCEPTED" } }),
  ]);
  return { person, counts: { posts, followers, following } };
}

// GET /users/:username. Their details and their posts.
async function profile(req, res) {
  const { person, counts } = await profileData(req);
  const { posts, older } = await listPosts(req.user.id, { authorId: person.id }, parseId(req.query.before));
  res.render("profile", { title: person.displayName, person, counts, view: "posts", posts, older, people: [] });
}

// GET /users/:username/followers and /following
function connections(view) {
  return async (req, res) => {
    const { person, counts } = await profileData(req);
    const rows = await prisma.follow.findMany({
      where: view === "followers" ? { followingId: person.id, status: "ACCEPTED" } : { followerId: person.id, status: "ACCEPTED" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { follower: { select: USER_CARD }, following: { select: USER_CARD } },
    });
    const people = await withFollowState(req.user.id, rows.map((row) => (view === "followers" ? row.follower : row.following)));
    res.render("profile", { title: person.displayName, person, counts, view, posts: [], older: null, people });
  };
}

// POST /users/:username/follow. Follows straight away, or sends a request if
// that person approves their followers.
async function follow(req, res) {
  const target = await findUser(req.params.username);
  const me = req.user.id;
  if (target.id === me) {
    flash(req, "error", "You can't follow yourself.");
    return goBack(req, res);
  }
  const status = target.requiresApproval ? "PENDING" : "ACCEPTED";
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: me, followingId: target.id } },
    update: {},
    create: { followerId: me, followingId: target.id, status },
  });
  flash(req, "good", status === "PENDING" ? `Follow request sent to ${target.displayName}.` : `You're now following ${target.displayName}.`);
  goBack(req, res, `/users/${target.username}`);
}

// POST /users/:username/unfollow. Also takes back a request that's still waiting.
async function unfollow(req, res) {
  const target = await findUser(req.params.username);
  await prisma.follow.deleteMany({ where: { followerId: req.user.id, followingId: target.id } });
  goBack(req, res, `/users/${target.username}`);
}

// GET /requests. People waiting for your answer, and requests you've sent.
async function requests(req, res) {
  const me = req.user.id;
  const [incoming, sent] = await Promise.all([
    prisma.follow.findMany({ where: { followingId: me, status: "PENDING" }, orderBy: { createdAt: "desc" }, select: { follower: { select: USER_CARD } } }),
    prisma.follow.findMany({ where: { followerId: me, status: "PENDING" }, orderBy: { createdAt: "desc" }, select: { following: { select: USER_CARD } } }),
  ]);
  res.render("requests", {
    title: "Follow requests",
    incoming: incoming.map((row) => row.follower),
    sent: sent.map((row) => ({ ...row.following, follow: "requested", followsYou: false })),
  });
}

// POST /requests/:username/accept and /decline
function answer(accept) {
  return async (req, res) => {
    const asker = await findUser(req.params.username);
    const where = { followerId: asker.id, followingId: req.user.id, status: "PENDING" };
    const { count } = accept
      ? await prisma.follow.updateMany({ where, data: { status: "ACCEPTED" } })
      : await prisma.follow.deleteMany({ where });
    if (!count) throw new NotFound("That request isn't waiting any more.");
    flash(req, "good", accept ? `${asker.displayName} now follows you.` : "Request declined.");
    goBack(req, res, "/requests");
  };
}

module.exports = {
  index,
  profile,
  followers: connections("followers"),
  following: connections("following"),
  follow,
  unfollow,
  requests,
  accept: answer(true),
  decline: answer(false),
};
