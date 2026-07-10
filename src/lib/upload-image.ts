import { supabase } from "@/integrations/supabase/client";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Same shape as profile.tsx's uploadAvatar, generalized for any public
// bucket — used by the Projects creation form (post-images/project-images
// buckets from Phase 1) without touching the existing avatar upload path.
export async function uploadImage(bucket: string, userId: string, file: File, prefix: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be under 5MB");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
