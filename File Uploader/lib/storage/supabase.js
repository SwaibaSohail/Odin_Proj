// Stores files in a private Supabase Storage bucket. Nobody can open a file
// directly: downloads go through the app, which checks permission first and
// then redirects to a link that only works for one minute.

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const BUCKET = process.env.SUPABASE_BUCKET || "files";
const DOWNLOAD_LINK_SECONDS = 60;

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = supabase.storage.from(BUCKET);

async function save({ key, buffer, mimeType }) {
  const { error } = await bucket.upload(key, buffer, { contentType: mimeType, upsert: false });
  if (error) throw error;
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${key}`;
}

async function remove(keys) {
  // Supabase removes up to 1000 files per request.
  for (let i = 0; i < keys.length; i += 1000) {
    const { error } = await bucket.remove(keys.slice(i, i + 1000));
    if (error) throw error;
  }
}

async function download(res, file) {
  const { data, error } = await bucket.createSignedUrl(file.storageKey, DOWNLOAD_LINK_SECONDS, {
    download: file.name,
  });
  if (error) throw error;
  res.redirect(data.signedUrl);
}

module.exports = { name: "supabase", save, remove, download };
