export type MediaType = "image" | "video" | "youtube" | "drive" | "other";

export interface MediaPreview {
  type: MediaType;
  previewUrl: string;
}

export function getMediaPreview(url: string): MediaPreview {
  if (!url) return { type: "other", previewUrl: "" };

  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (yt) return { type: "youtube", previewUrl: `https://img.youtube.com/vi/${yt[1]}/mqdefault.jpg` };

  // Google Drive
  const drive = url.match(/\/d\/([^/?#]+)/);
  if (url.includes("drive.google.com") && drive)
    return { type: "drive", previewUrl: `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w400` };

  // Video directo
  if (/\.(mp4|mov|avi|webm)([?#]|$)/i.test(url))
    return { type: "video", previewUrl: url };

  // Imagen directa
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)([?#]|$)/i.test(url))
    return { type: "image", previewUrl: url };

  // Supabase Storage (asumir imagen)
  if (url.includes("supabase.co/storage") || url.includes("supabase.in/storage"))
    return { type: "image", previewUrl: url };

  return { type: "other", previewUrl: "" };
}
