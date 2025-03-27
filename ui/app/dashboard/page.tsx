"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { CreateFolderDialog } from "@/components/create-folder-dialog";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Folder, FileText, Trash, Upload, Plus } from "lucide-react";
import { useContractFunctions } from "@/lib/contractfunction";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/file-upload";
import { pinataGroups } from "@/utils/pinataFunctions";

interface FolderData {
  name: string;
  files: string[];
}

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const { toast } = useToast();
  const contract = useContractFunctions();

  useEffect(() => {
    // If not connected, redirect to home
    if (!isConnected) {
      router.push("/");
      return;
    }

    // Only load folders if the contract is ready
    if (contract.isReady) {
      loadFolders();
    }
  }, [isConnected, router, contract.isReady]);

  // Show a wallet connection message if wallet is connected but contract isn't ready
  const showWalletConnectionMessage = isConnected && !contract.isReady;

  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const [folderNames, folderCids] =
        await contract.retrieveAllFoldersAndCIDs();

      // Define types for the folderNames and folderCids arrays
      const formattedFolders: FolderData[] = folderNames.map(
        (name: string, index: number) => ({
          name,
          // Filter out the placeholder "QmEmpty" CID
          files: ((folderCids[index] as string[]) || []).filter(
            (cid: string) => cid !== "QmEmpty"
          ),
        })
      );

      setFolders(formattedFolders);
    } catch (error) {
      console.error("Error loading folders:", error);
      toast({
        title: "Error",
        description: "Failed to load your folders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async (folderName: string, cid?: string) => {
    try {
      // If the folder name already exists, show an error
      if (folders.some((folder) => folder.name === folderName)) {
        toast({
          title: "Error",
          description: `Folder "${folderName}" already exists.`,
          variant: "destructive",
        });
        return;
      }

      // Create a new group in Pinata - using proper object parameter
      await pinataGroups.create({ name: folderName });

      if (cid) {
        // If there's an initial file, use uploadFileToFolder
        await contract.uploadFileToFolder(folderName, cid);
      } else {
        // If there's no file, create an empty folder with a placeholder
        // that will be hidden in the UI
        await contract.uploadFileToFolder(folderName, "QmEmpty");
      }

      toast({
        title: "Success",
        description: `Folder "${folderName}" created successfully`,
      });

      await loadFolders();
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    try {
      // Try to find and delete the Pinata group
      try {
        const groupsResponse = await pinataGroups.list();

        // Safely access the groups array which could be in different places
        const groups =
          groupsResponse.groups || groupsResponse.next_page_token || [];
        const group = groups.find((g) => g.name === folderName);

        if (group) {
          await pinataGroups.delete({ groupId: group.id });
        }
      } catch (pinataError) {
        console.warn("Could not delete Pinata group:", pinataError);
        // Continue with on-chain deletion even if Pinata deletion fails
      }

      await contract.deleteParticularFolder(folderName);
      toast({
        title: "Success",
        description: `Folder "${folderName}" deleted successfully`,
      });
      await loadFolders();
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast({
        title: "Error",
        description: "Failed to delete folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async (
    folderName: string,
    versionNumber: number
  ) => {
    try {
      await contract.deleteParticularFile(folderName, versionNumber);
      toast({
        title: "Success",
        description: `File deleted successfully`,
      });
      await loadFolders();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddFileToFolder = (folderName: string) => {
    setSelectedFolder(folderName);
    setIsAddFileOpen(true);
  };

  const handleFileUploadComplete = async (
    cid: string,
    url: string,
    fileId?: string
  ) => {
    if (!selectedFolder) return;

    try {
      console.log("File upload complete:", { cid, url, fileId });

      // First, try to update the smart contract
      console.log("Adding file to contract with CID:", cid);
      await contract.uploadFileToFolder(selectedFolder, cid, fileId);

      // If that succeeded, try to add to Pinata group if fileId is provided
      if (fileId) {
        try {
          console.log("Adding file to Pinata group:", {
            folder: selectedFolder,
            fileId,
          });
          const groupsResponse = await pinataGroups.list();
          console.log("Groups response:", groupsResponse);

          // Safely access the groups array
          const groups = groupsResponse.groups || groupsResponse.next_page_token || [];
          console.log("Available groups:", groups);

          const group = groups.find((g) => g.name === selectedFolder);
          if (group) {
            console.log("Found group:", group);
            await pinataGroups.addFiles({
              groupId: group.id,
              files: [fileId],
            });
            console.log("File added to group successfully");
          } else {
            console.log("Group not found, creating new group");
            const newGroup = await pinataGroups.create({
              name: selectedFolder,
            });
            console.log("New group created:", newGroup);
            await pinataGroups.addFiles({
              groupId: newGroup.id,
              files: [fileId],
            });
            console.log("File added to new group successfully");
          }
        } catch (pinataError) {
          console.warn("Could not add file to Pinata group:", pinataError);
          // Continue with on-chain addition even if Pinata group addition fails
        }
      }

      toast({
        title: "Success",
        description: `File added to "${selectedFolder}" successfully`,
      });

      setIsAddFileOpen(false);
      setSelectedFolder(null);

      // Reload folders to show the updated content
      await loadFolders();
    } catch (error) {
      console.error("Error adding file to folder:", error);
      toast({
        title: "Error",
        description: "Failed to add file to folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add this code to truncate the CID display in the file list
  const truncateCid = (cid: string, maxLength = 20) => {
    if (cid.length <= maxLength) return cid;
    return `${cid.substring(0, maxLength / 2)}...${cid.substring(
      cid.length - maxLength / 2
    )}`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              Storage Factory
            </motion.div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-6"
        >
          <h1 className="text-3xl font-bold">Your Storage</h1>
          <Button
            onClick={() => setIsCreateFolderOpen(true)}
            disabled={!contract.isReady}
          >
            Create Folder
          </Button>
        </motion.div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center h-64"
            >
              <Loader2 className="h-8 w-8 animate-spin" />
            </motion.div>
          ) : showWalletConnectionMessage ? (
            <motion.div
              key="connecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64 border rounded-lg p-6"
            >
              <h3 className="text-xl font-medium mb-2">
                Connecting to wallet...
              </h3>
              <p className="text-muted-foreground mb-4">
                Please wait while we connect to your wallet
              </p>
              <Loader2 className="h-6 w-6 animate-spin" />
            </motion.div>
          ) : folders.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64 border rounded-lg p-6"
            >
              <h3 className="text-xl font-medium mb-2">No folders yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first folder to get started
              </p>
              <Button onClick={() => setIsCreateFolderOpen(true)}>
                Create Folder
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="folders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {folders.map((folder) => (
                <motion.div
                  key={folder.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">{folder.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAddFileToFolder(folder.name)}
                        title="Add file to folder"
                      >
                        <Plus className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFolder(folder.name)}
                        title="Delete folder"
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {folder.files.length > 0 ? (
                      folder.files.map((cid, index) => (
                        <div
                          key={`${folder.name}-${index}-${cid}`}
                          className="flex justify-between items-center p-2 bg-muted rounded"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-sm truncate">
                              {truncateCid(cid)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteFile(folder.name, index)}
                          >
                            <Trash className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No files in this folder
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        onCreateFolder={handleCreateFolder}
      />

      {/* Add File to Folder Dialog */}
      <Dialog open={isAddFileOpen} onOpenChange={setIsAddFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add File to Folder</DialogTitle>
            <DialogDescription>
              Upload files to add to "{selectedFolder}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <FileUpload
              onUploadComplete={handleFileUploadComplete}
              folderName={selectedFolder || undefined}
              allowMultiple={true} // Allow multiple files
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddFileOpen(false);
                setSelectedFolder(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
