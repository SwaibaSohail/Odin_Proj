// Picks where uploaded files are stored, based on STORAGE_DRIVER in .env.
// Both drivers have the same functions: save, remove and download.

const driver = process.env.STORAGE_DRIVER || "local";

if (driver !== "local" && driver !== "supabase") {
  throw new Error(`Unknown STORAGE_DRIVER "${driver}". Use "local" or "supabase".`);
}

const storage = driver === "supabase" ? require("./supabase") : require("./local");

// Removes files from storage after their database rows are gone. A file left
// behind is invisible to users, so a failure is logged rather than shown.
async function removeQuietly(keys) {
  if (keys.length === 0) return;
  try {
    await storage.remove(keys);
  } catch (err) {
    console.error("Couldn't remove files from storage:", keys, err);
  }
}

module.exports = { ...storage, removeQuietly };
