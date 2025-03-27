"use client";
import { ethers } from "ethers";
import { useWalletClient } from "wagmi";
import { useEffect, useState } from "react";
import { pinataFiles, pinataGroups } from "@/utils/pinataFunctions";

const contractAbi = [
  {
    inputs: [
      { internalType: "string", name: "folderName", type: "string" },
      { internalType: "uint256", name: "versionNumber", type: "uint256" },
    ],
    name: "deleteParticularFile",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "folderName", type: "string" }],
    name: "deleteParticularFolder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "retrieveAllFoldersAndCIDs",
    outputs: [
      { internalType: "string[]", name: "folders", type: "string[]" },
      { internalType: "string[][]", name: "cids", type: "string[][]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "folderName", type: "string" },
      { internalType: "string", name: "cid", type: "string" },
    ],
    name: "uploadFileToFolder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

function useEthersSigner() {
  const { data: walletClient } = useWalletClient();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  useEffect(() => {
    const fetchSigner = async () => {
      if (walletClient) {
        const { account, transport } = walletClient;
        const provider = new ethers.BrowserProvider(transport);
        const signer = await provider.getSigner(account.address);
        setSigner(signer);
      }
    };
    fetchSigner();
  }, [walletClient]);

  return signer;
}

export const useContractFunctions = () => {
  const signer = useEthersSigner();
  const [isReady, setIsReady] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    if (signer) {
      setContract(new ethers.Contract(contractAddress, contractAbi, signer));
      setIsReady(true);
    } else {
      setIsReady(false);
      setContract(null);
    }
  }, [signer]);

  /**
   * Uploads a file to a folder both on Pinata and on-chain
   * @param folderName Name of the folder
   * @param cid IPFS CID of the uploaded file
   * @param fileId Optional Pinata file ID
   * @returns Success message
   */
  const uploadFileToFolder = async (
    folderName: string,
    cid: string,
    fileId?: string
  ) => {
    if (!contract) {
      console.warn("No contract available. Please connect your wallet");
      return "Wallet not connected";
    }

    try {
      console.log("Uploading file to folder:", { folderName, cid, fileId });

      if (fileId) {
        try {
          const groupsResponse = await fetch("/api/pinata/groups");
          const groupsData = await groupsResponse.json();
          const groups = groupsData.groups || [];

          const group = groups.find((g: any) => g.name === folderName);

          if (group) {
            await fetch("/api/pinata/group-files", {
              method: "POST",
              body: JSON.stringify({ groupId: group.id, files: [fileId] }),
              headers: { "Content-Type": "application/json" },
            });
          } else {
            const newGroupResponse = await fetch("/api/pinata/groups", {
              method: "POST",
              body: JSON.stringify({ name: folderName }),
              headers: { "Content-Type": "application/json" },
            });
            const newGroup = await newGroupResponse.json();

            await fetch("/api/pinata/group-files", {
              method: "POST",
              body: JSON.stringify({ groupId: newGroup.id, files: [fileId] }),
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch (pinataError) {
          console.warn("Could not sync with Pinata groups:", pinataError);
        }
      }

      const tx = await contract.uploadFileToFolder(folderName, cid);
      const receipt = await tx.wait();
      console.log("File uploaded successfully");
      return "File uploaded successfully";
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const deleteParticularFile = async (
    folderName: string,
    versionNumber: number
  ) => {
    if (!contract) {
      console.warn("No contract available. Please connect your wallet");
      return "Wallet not connected";
    }

    try {
      const [folderNames, folderCids] =
        await contract.retrieveAllFoldersAndCIDs();
      const folderIndex = folderNames.findIndex(
        (name: string) => name === folderName
      );

      if (
        folderIndex >= 0 &&
        folderCids[folderIndex] &&
        versionNumber < folderCids[folderIndex].length
      ) {
        const cidToDelete = folderCids[folderIndex][versionNumber];

        if (cidToDelete !== "QmEmpty") {
          try {
            const filesResponse = await fetch("/api/pinata/files");
            const filesData = await filesResponse.json();
            const files = filesData.files || [];
            const fileToDelete = files.find(
              (file: any) => file.cid === cidToDelete
            );

            if (fileToDelete) {
              try {
                const groupsResponse = await fetch("/api/pinata/groups");
                const groupsData = await groupsResponse.json();
                const groups = groupsData.groups || [];
                const group = groups.find((g: any) => g.name === folderName);

                if (group) {
                  await fetch("/api/pinata/group-files", {
                    method: "DELETE",
                    body: JSON.stringify({
                      groupId: group.id,
                      files: [fileToDelete.id],
                    }),
                    headers: { "Content-Type": "application/json" },
                  });
                }
              } catch (groupError) {
                console.warn("Error removing file from group:", groupError);
              }

              await fetch("/api/pinata/files", {
                method: "DELETE",
                body: JSON.stringify({ fileIds: [fileToDelete.id] }),
                headers: { "Content-Type": "application/json" },
              });
            }
          } catch (pinataError) {
            console.warn("Could not delete file from Pinata:", pinataError);
          }
        }
      }

      // Delete from the smart contract
      const tx = await contract.deleteParticularFile(folderName, versionNumber);
      await tx.wait();
      console.log("File deleted successfully");
      return "File deleted successfully";
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  };

  /**
   * Deletes an entire folder and all its files
   * @param folderName Name of the folder to delete
   * @returns Success message
   */
  const deleteParticularFolder = async (folderName: string) => {
    if (!contract) {
      console.warn("No contract available. Please connect your wallet");
      return "Wallet not connected";
    }

    try {
      // Try to delete the folder from Pinata first
      try {
        const groupsResponse = await fetch("/api/pinata/groups");
        const groupsData = await groupsResponse.json();
        const groups = groupsData.groups || [];
        const group = groups.find((g: any) => g.name === folderName);

        if (group) {
          await fetch("/api/pinata/groups", {
            method: "DELETE",
            body: JSON.stringify({ groupId: group.id }),
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (pinataError) {
        console.warn("Could not delete folder from Pinata:", pinataError);
      }

      // Delete from the smart contract
      const tx = await contract.deleteParticularFolder(folderName);
      await tx.wait();
      console.log("Folder deleted successfully");
      return "Folder deleted successfully";
    } catch (error) {
      console.error("Error deleting folder:", error);
      throw error;
    }
  };

  /**
   * Retrieves all folders and their CIDs from the smart contract
   * @returns Array of folder names and their corresponding CIDs
   */
  const retrieveAllFoldersAndCIDs = async () => {
    if (!contract) {
      console.warn("No contract available. Please connect your wallet");
      return [[], []];
    }

    try {
      const data = await contract.retrieveAllFoldersAndCIDs();
      console.log("Retrieved folders and CIDs:", data);
      return data;
    } catch (error) {
      console.error("Error retrieving folders and CIDs:", error);
      throw error;
    }
  };

  return {
    uploadFileToFolder,
    deleteParticularFile,
    deleteParticularFolder,
    retrieveAllFoldersAndCIDs,
    isReady,
  };
};
