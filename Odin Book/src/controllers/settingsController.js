const prisma = require("../lib/prisma");
const { flash, goBack } = require("../lib/http");
const { MAX_AVATAR_BYTES, acceptImage, inspectImage } = require("../lib/images");

const tidy = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

function render(res, status, errors, values) {
  res.status(status).render("settings", { title: "Settings", errors, values });
}

// GET /settings
function show(req, res) {
  const { displayName, bio, requiresApproval } = req.user;
  render(res, 200, {}, { displayName, bio, requiresApproval });
}

// POST /settings/profile
async function saveProfile(req, res) {
  const values = {
    displayName: tidy(req.body?.displayName),
    bio: tidy(req.body?.bio),
    requiresApproval: req.body?.requiresApproval === "on",
  };
  const errors = {};
  if (!values.displayName) errors.displayName = "Enter your name.";
  else if (values.displayName.length > 40) errors.displayName = "Names can be up to 40 characters.";
  if (values.bio.length > 200) errors.bio = "Your bio can be up to 200 characters.";
  if (Object.keys(errors).length) return render(res, 400, errors, values);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: req.user.id }, data: values });
    // Opening up your account lets in everyone who was waiting.
    if (!values.requiresApproval) {
      await tx.follow.updateMany({ where: { followingId: req.user.id, status: "PENDING" }, data: { status: "ACCEPTED" } });
    }
  });
  flash(req, "good", "Profile saved.");
  goBack(req, res, "/settings");
}

// POST /settings/photo, with the picture in a form field called "photo".
const setPhoto = [
  acceptImage("photo"),
  async (req, res) => {
    const image = req.file && inspectImage(req.file);
    let problem = req.uploadError;
    if (!problem && !image) problem = "Choose a PNG, JPEG, GIF or WebP picture.";
    if (!problem && req.file.size > MAX_AVATAR_BYTES) problem = "Profile photos can be up to 500 KB.";
    if (problem) {
      flash(req, "error", problem);
      return goBack(req, res, "/settings");
    }
    const userId = req.user.id;
    await prisma.$transaction([
      prisma.image.deleteMany({ where: { userId } }),
      prisma.image.create({ data: { ...image, userId } }),
    ]);
    flash(req, "good", "Photo updated.");
    goBack(req, res, "/settings");
  },
];

// POST /settings/photo/remove
async function removePhoto(req, res) {
  await prisma.image.deleteMany({ where: { userId: req.user.id } });
  flash(req, "good", "Photo removed.");
  goBack(req, res, "/settings");
}

module.exports = { show, saveProfile, setPhoto, removePhoto };
