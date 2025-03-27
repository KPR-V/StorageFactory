"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, FileIcon, Upload } from "lucide-react"; // Import icons

interface FileUploadProps {
  onUploadComplete?: (cid: string, url: string) => void;
  folderName?: string;
  useSignedUrl?: boolean;
  maxSizeMB?: number; // Add max file size prop
  acceptedFileTypes?: string; // Add accepted file types prop
}

export function FileUpload({
  onUploadComplete,
  folderName,
  useSignedUrl = false,
  maxSizeMB = 50, // Default max size is 50MB
  acceptedFileTypes = "", // Default is any file type
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check file size
      if (maxSizeMB > 0 && selectedFile.size > maxSizeMB * 1024 * 1024) {
        setError(`File size exceeds the maximum limit of ${maxSizeMB}MB`);
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleDirectUpload = async () => {
    if (!file) return;
    
    setError(null);
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const data = new FormData();
      data.set("file", file);
      
      if (folderName) {
        data.set("folderName", folderName);
      }
      
      setUploadProgress(30);
      
      const response = await fetch("/api/files", {
        method: "POST",
        body: data,
      });
      
      setUploadProgress(70);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      setUploadProgress(100);
      
      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }
      
      toast({
        title: "Upload Successful",
        description: `File has been uploaded with CID: ${result.cid}`,
      });
      
      if (onUploadComplete && result.cid && result.url) {
        onUploadComplete(result.cid, result.url);
      }
      
      // Reset the file input
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignedUrlUpload = async () => {
    if (!file) return;
    
    setError(null);
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      // First get a signed URL from our API
      const urlResponse = await fetch("/api/url");
      
      if (!urlResponse.ok) {
        throw new Error(`Failed to get signed URL: ${urlResponse.statusText}`);
      }
      
      const urlData = await urlResponse.json();
      
      if (!urlData.success || !urlData.url) {
        throw new Error("Failed to get signed upload URL");
      }
      
      setUploadProgress(30);
      
      // Prepare form data for the upload
      const formData = new FormData();
      formData.append("file", file);
      
      // Upload directly to Pinata using the signed URL
      const uploadResponse = await fetch(urlData.url, {
        method: "POST",
        body: formData,
      });
      
      setUploadProgress(70);
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }
      
      const result = await uploadResponse.json();
      
      if (!result || !result.IpfsHash) {
        throw new Error("Upload response missing CID");
      }
      
      // Get a gateway URL for the uploaded file
      const gatewayResponse = await fetch(`/api/pinata/gateway?cid=${result.IpfsHash}`);
      
      if (!gatewayResponse.ok) {
        throw new Error(`Failed to get gateway URL: ${gatewayResponse.statusText}`);
      }
      
      const gatewayData = await gatewayResponse.json();
      
      setUploadProgress(100);
      
      toast({
        title: "Upload Successful",
        description: `File has been uploaded with CID: ${result.IpfsHash}`,
      });
      
      if (onUploadComplete) {
        const gatewayUrl = gatewayData.success && gatewayData.url 
          ? gatewayData.url 
          : `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
          
        onUploadComplete(result.IpfsHash, gatewayUrl);
      }
      
      // Reset the file input
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading with signed URL:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (useSignedUrl) {
      await handleSignedUrlUpload();
    } else {
      await handleDirectUpload();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="file-upload" className="flex items-center gap-2">
          <FileIcon className="h-4 w-4" />
          Choose File
        </Label>
        <Input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
          accept={acceptedFileTypes}
          className="mt-1"
        />
        {maxSizeMB > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Maximum file size: {maxSizeMB}MB
          </p>
        )}
      </div>
      
      {file && (
        <div className="text-sm flex items-center gap-2 p-2 bg-muted rounded-md">
          <FileIcon className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(2)} KB
              {file.type && ` • ${file.type}`}
            </p>
          </div>
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
            {uploadProgress < 30 ? "Preparing upload..." : 
             uploadProgress < 70 ? "Uploading to IPFS..." : 
             "Processing..."}
          </p>
        </div>
      )}
      
      <Button 
        onClick={handleUpload} 
        disabled={!file || isUploading || !!error}
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
            Upload to IPFS
          </span>
        )}
      </Button>
    </div>
  );
}
