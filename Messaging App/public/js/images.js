// Getting pictures ready in the browser before they're uploaded.

const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_SIDE = 1600;
const MAX_BYTES = 1024 * 1024;
const AVATAR_SIDE = 256;

export const isPicture = (file) => TYPES.includes(file.type);

function load(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That picture couldn't be opened."));
    image.src = url;
  });
}

// Draws part of a picture onto a new canvas as a JPEG file.
// The white background is for PNGs with see-through parts.
function redraw(image, name, { sx, sy, sw, sh, width, height, quality }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  URL.revokeObjectURL(image.src);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], `${name.replace(/\.\w+$/, "")}.jpg`, { type: "image/jpeg" })) : reject(new Error("That picture couldn't be prepared."))),
      "image/jpeg",
      quality,
    );
  });
}

// Shrinks big photos so they send quickly. Small pictures go as they are, and
// so do GIFs, which may be animated.
export async function prepareImage(file) {
  if (file.type === "image/gif") return file;
  const image = await load(file);
  const { naturalWidth: w, naturalHeight: h } = image;
  const longest = Math.max(w, h);
  if (longest <= MAX_SIDE && file.size <= MAX_BYTES) {
    URL.revokeObjectURL(image.src);
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / longest);
  return redraw(image, file.name, { sx: 0, sy: 0, sw: w, sh: h, width: Math.round(w * scale), height: Math.round(h * scale), quality: 0.85 });
}

// Cuts a square out of the middle of a picture and shrinks it for a profile photo.
export async function squarePhoto(file) {
  const image = await load(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  return redraw(image, file.name, {
    sx: (image.naturalWidth - side) / 2,
    sy: (image.naturalHeight - side) / 2,
    sw: side,
    sh: side,
    width: AVATAR_SIDE,
    height: AVATAR_SIDE,
    quality: 0.9,
  });
}
