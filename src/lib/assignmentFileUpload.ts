import { teacherSupabase, teacherClassroomSupabase } from "@/integrations/supabase/teacher-client";
import { toast } from "@/hooks/use-toast";

export interface AssignmentFileMetadata {
  name: string;
  type: string;
  size: number;
  id?: string; // Populated after upload
}

export async function uploadAssignmentFile(
  assignmentId: string,
  file: File,
  createdByUserId: string
): Promise<{ id: string; name: string; type: string; size: number }> {
  // Validate file size
  if (file.size > 1_500_000) {
    throw new Error(`${file.name} exceeds 1.5 MB limit`);
  }

  // Read file as ArrayBuffer
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsArrayBuffer(file);
  });

  // Convert to Uint8Array for Supabase
  const bytes = new Uint8Array(buffer);

  // Upload to Supabase
  const { data, error } = await teacherClassroomSupabase
    .from("assignment_files")
    .insert({
      assignment_id: assignmentId,
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      file_data: bytes,
      created_by: createdByUserId,
    })
    .select("id, file_name, file_type, file_size")
    .single();

  if (error) {
    console.error("File upload error:", error);
    throw new Error(`Failed to upload ${file.name}: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.file_name,
    type: data.file_type,
    size: data.file_size,
  };
}

export async function fetchAssignmentFiles(assignmentId: string) {
  const { data, error } = await teacherClassroomSupabase
    .from("assignment_files")
    .select("id, file_name, file_type, file_size, created_at")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch assignment files:", error);
    return [];
  }

  return data || [];
}

export async function downloadAssignmentFile(fileId: string, fileName: string) {
  try {
    const { data, error } = await teacherClassroomSupabase
      .from("assignment_files")
      .select("file_data")
      .eq("id", fileId)
      .single();

    if (error) throw error;
    if (!data?.file_data) throw new Error("File data not found");

    // Convert back from Uint8Array
    const bytes = new Uint8Array(data.file_data);
    const blob = new Blob([bytes]);
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download file:", error);
    toast({
      title: "Download failed",
      description: error instanceof Error ? error.message : "Could not download file",
      variant: "destructive",
    });
  }
}

export async function deleteAssignmentFile(fileId: string) {
  const { error } = await teacherClassroomSupabase
    .from("assignment_files")
    .delete()
    .eq("id", fileId);

  if (error) {
    console.error("Failed to delete file:", error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Converts file references from data URLs (legacy) to file IDs (new format)
 * For backward compatibility with existing assignments
 */
export function migrateDataUrlToFileId(dataUrl: string, fileId: string): string {
  // Returns the file ID reference
  return fileId;
}

/**
 * Builds a file reference string that can be stored in assignment metadata
 */
export function buildFileReference(fileId: string, fileName: string): string {
  return JSON.stringify({ type: "file-ref", id: fileId, name: fileName });
}

/**
 * Parses file reference from metadata
 */
export function parseFileReference(ref: string): { id: string; name: string } | null {
  try {
    const parsed = JSON.parse(ref);
    if (parsed.type === "file-ref") {
      return { id: parsed.id, name: parsed.name };
    }
    return null;
  } catch {
    return null;
  }
}
