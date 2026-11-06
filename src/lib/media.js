"use strict";

/* Local image/video validation and resizing. No uploads to a server. */

function safeMedia(v) {
  return /^data:(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime));base64,[a-zA-Z0-9+/=\r\n]+$/.test(
    v || "",
  )
    ? v
    : "";
}
async function mediaData(file) {
  const isVideo =
    /^video\//.test(file.type) || /\.(mp4|webm|mov)$/i.test(file.name || "");
  if (isVideo) {
    if (file.size > 12 * 1024 * 1024)
      throw new Error(
        "That video is over 12 MB. Choose a shorter saved Story.",
      );
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error("Couldn’t read that video."));
      r.readAsDataURL(file);
    });
  }
  if (file.size > 30 * 1024 * 1024)
    throw new Error("Choose a photo under 30 MB.");
  const img = await createImageBitmap(file).catch(() => {
    throw new Error(
      "That photo format isn’t supported. Try a JPG, PNG, or WebP.",
    );
  });
  const max = 1300,
    scale = Math.min(1, max / Math.max(img.width, img.height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  return canvas.toDataURL("image/jpeg", 0.84);
}
