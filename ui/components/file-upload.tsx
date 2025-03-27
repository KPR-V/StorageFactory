"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, FileIcon, Upload, X } from "lucide-react";
import { pinataUpload } from "@/utils/pinataFunctions";

interface FileUploadProps {
  onUploadComplete?: (cid: string, url: string, fileId?: string) => void;
  folderName?: string;
  maxSizeMB?: number;
  acceptedFileTypes?: string;
  allowMultiple?: boolean;
}

export function FileUpload({
  onUploadComplete,
  folderName,
  maxSizeMB = 50,
  acceptedFileTypes = "",
  allowMultiple = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);

    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);

      // Check file sizes
      const oversizedFiles = selectedFiles.filter(
        (file) => maxSizeMB > 0 && file.size > maxSizeMB * 1024 * 1024
      );

      if (oversizedFiles.length > 0) {
        setError(
          `${oversizedFiles.length} file(s) exceed the maximum limit of ${maxSizeMB}MB`
        );
        return;
      }

      // If multiple files aren't allowed, only keep the first file
      if (!allowMultiple && selectedFiles.length > 1) {
        setFiles([selectedFiles[0]]);
      } else {
        setFiles(selectedFiles);
      }
    }
  };

  // Function to truncate long filenames
  const truncateFilename = (filename: string, maxLength = 20) => {
    if (filename.length <= maxLength) return filename;

    const extension = filename.includes(".")
      ? filename.slice(filename.lastIndexOf("."))
      : "";

    const nameWithoutExtension = filename.slice(
      0,
      filename.length - extension.length
    );

    const truncatedName =
      nameWithoutExtension.slice(0, maxLength - 3 - extension.length) + "...";
    return truncatedName + extension;
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      // For single file upload
      if (files.length === 1) {
        setUploadProgress(30);
        const uploadResult = await pinataUpload.file(files[0]);
        setUploadProgress(100);

        toast({
          title: "Upload Successful",
          description: `File has been uploaded with CID: ${uploadResult.cid.substring(
            0,
            10
          )}...`,
        });

        if (onUploadComplete) {
          // Make sure we're passing all required parameters
          onUploadComplete(uploadResult.cid, uploadResult.url, uploadResult.id);
        }
      }
      // For multiple files upload
      else {
        setUploadProgress(30);
        const uploadResult = await pinataUpload.fileArray(files);
        setUploadProgress(100);

        toast({
          title: "Upload Successful",
          description: `${
            files.length
          } files have been uploaded with CID: ${uploadResult.cid.substring(
            0,
            10
          )}...`,
        });

        if (onUploadComplete) {
          // Make sure we're passing all required parameters
          onUploadComplete(uploadResult.cid, uploadResult.url, uploadResult.id);
        }
      }

      // Reset the file input
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      let errorMessage = "Unknown error occurred";

      if (error instanceof Error) {
        errorMessage = error.message;
        // Check specifically for authentication errors
        if (
          errorMessage.includes("Authentication failed") ||
          errorMessage.includes("invalid bearer token")
        ) {
          errorMessage =
            "Authentication failed. Please check your Pinata API credentials.";
        }
      }

      setError(errorMessage);
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
          accept={acceptedFileTypes}
          className="mt-1"
          multiple={allowMultiple}
        />
        {maxSizeMB > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Maximum file size: {maxSizeMB}MB
          </p>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="text-sm flex items-center justify-between gap-2 p-2 bg-muted rounded-md"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                <div className="overflow-hidden">
                  <p className="font-medium truncate">
                    {truncateFilename(file.name)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                    {file.type && ` • ${file.type}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
                disabled={isUploading}
                className="h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-sm flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-md">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {uploadProgress < 30
              ? "Preparing upload..."
              : uploadProgress < 70
              ? "Uploading to IPFS..."
              : "Processing..."}
          </p>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={files.length === 0 || isUploading || !!error}
        className="w-full"
      >
        {isUploading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Uploading...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload {files.length > 1 ? `${files.length} Files` : "File"}
          </span>
        )}
      </Button>
    </div>
  );
}
