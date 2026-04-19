import { teacherSupabase } from "@/integrations/supabase/teacher-client";
import { toast } from "@/hooks/use-toast";

const BUCKET_NAME = "course-files";

/**
 * Ensure the course-files storage bucket exists
 * This should be called once when the app initializes
 */
export async function ensureCourseFilesBucket() {
  try {
    // Try to list buckets to check if the bucket exists
    const { data: buckets, error: listError } = await teacherSupabase.storage.listBuckets();

    if (listError) {
      console.warn("Could not list storage buckets:", listError);
      return;
    }

    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await teacherSupabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
          "text/csv",
        ],
      });

      if (createError) {
        console.warn("Could not create storage bucket:", createError);
        return;
      }

      console.log("Created course-files storage bucket");
    }
  } catch (error) {
    console.error("Error ensuring course files bucket:", error);
  }
}

/**
 * Upload a file to the course-files bucket
 */
export async function uploadCourseFile(
  courseId: string,
  file: File,
  fileName: string = file.name
): Promise<{ publicUrl: string; error: any } | null> {
  try {
    // Generate unique file name with timestamp
    const uniqueFileName = `${Date.now()}_${fileName}`;
    const filePath = `${courseId}/${uniqueFileName}`;

    // Upload the file
    const { data: uploadData, error: uploadError } = await teacherSupabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = teacherSupabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return { publicUrl: urlData.publicUrl, error: null };
  } catch (error) {
    console.error("Error uploading file:", error);
    return { publicUrl: "", error };
  }
}

/**
 * Delete a file from the course-files bucket
 */
export async function deleteCourseFile(courseId: string, fileName: string) {
  try {
    const filePath = `${courseId}/${fileName}`;

    const { error } = await teacherSupabase.storage.from(BUCKET_NAME).remove([filePath]);

    if (error) {
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { success: false, error };
  }
}
