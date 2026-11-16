// Database questions that more than one page asks: who follows whom, and how
// to load a post with everything a page shows about it.

const prisma = require("./prisma");

// What's needed to show someone's name and face. Never the password hash.
const USER_CARD = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  requiresApproval: true,
  isGuest: true,
  createdAt: true,
  avatar: { select: { id: true } },
};

const PAGE_SIZE = 15;

// A post with its author, picture, counts, the newest comments, and whether
// the viewer has liked it.
function postSelect(viewerId, commentCount) {
  return {
    id: true,
    body: true,
    createdAt: true,
    author: { select: USER_CARD },
    image: { select: { id: true, width: true, height: true } },
    _count: { select: { likes: true, comments: true } },
    likes: { where: { userId: viewerId }, select: { userId: true } },
    comments: {
      orderBy: { id: "desc" },
      take: commentCount,
      select: { id: true, body: true, createdAt: true, author: { select: USER_CARD } },
    },
  };
}

function tidyPost(post) {
  const { likes, _count, comments, ...rest } = post;
  return { ...rest, liked: likes.length > 0, likeCount: _count.likes, commentCount: _count.comments, comments: comments.reverse() };
}

// One page of posts, newest first. `before` is the id to continue from.
async function listPosts(viewerId, where, before) {
  const rows = await prisma.post.findMany({
    where: { ...where, ...(before ? { id: { lt: before } } : {}) },
    orderBy: { id: "desc" },
    take: PAGE_SIZE + 1,
    select: postSelect(viewerId, 2),
  });
  const posts = rows.slice(0, PAGE_SIZE).map(tidyPost);
  return { posts, older: rows.length > PAGE_SIZE ? posts[posts.length - 1].id : null };
}

async function findPost(viewerId, id) {
  const post = await prisma.post.findUnique({ where: { id }, select: postSelect(viewerId, 200) });
  return post && tidyPost(post);
}

// The ids of everyone the viewer follows (accepted only).
async function followingIds(userId) {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId, status: "ACCEPTED" },
    select: { followingId: true },
  });
  return rows.map((row) => row.followingId);
}

// Adds two things to each person: `follow` is "following", "requested" or
// null (what the viewer is to them), and `followsYou` is the other direction.
async function withFollowState(viewerId, people) {
  const ids = people.map((person) => person.id);
  const [mine, theirs] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: viewerId, followingId: { in: ids } }, select: { followingId: true, status: true } }),
    prisma.follow.findMany({ where: { followingId: viewerId, followerId: { in: ids }, status: "ACCEPTED" }, select: { followerId: true } }),
  ]);
  const state = new Map(mine.map((row) => [row.followingId, row.status === "ACCEPTED" ? "following" : "requested"]));
  const fans = new Set(theirs.map((row) => row.followerId));
  return people.map((person) => ({ ...person, follow: state.get(person.id) || null, followsYou: fans.has(person.id) }));
}

function pendingRequestCount(userId) {
  return prisma.follow.count({ where: { followingId: userId, status: "PENDING" } });
}

// A few people the viewer has no connection with yet, most followed first.
async function suggestions(viewerId, take = 5) {
  return prisma.user.findMany({
    where: { id: { not: viewerId }, isGuest: false, followers: { none: { followerId: viewerId } } },
    orderBy: [{ followers: { _count: "desc" } }, { id: "asc" }],
    take,
    select: USER_CARD,
  });
}

module.exports = { USER_CARD, PAGE_SIZE, listPosts, findPost, followingIds, withFollowState, pendingRequestCount, suggestions };
