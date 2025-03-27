import { pinata } from "./config";


export const pinataUpload = {
  file: async (file: File) => {
    try {
      const urlRequest = await fetch("/api/url");
      if (!urlRequest.ok) {
        throw new Error(`Failed to get signed URL: ${urlRequest.statusText}`);
      }
      const urlResponse = await urlRequest.json();
      const upload = await pinata.upload.public.file(file).url(urlResponse.url);
      const fileUrl = await pinata.gateways.public.convert(upload.cid);

      return {
        cid: upload.cid,
        url: fileUrl,
        ipfsHash: upload.cid,
        id: upload.id,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  },


  fileArray: async (files: File[]) => {
    try {
      const urlRequest = await fetch("/api/url");
      if (!urlRequest.ok) {
        throw new Error(`Failed to get signed URL: ${urlRequest.statusText}`);
      }
      const urlResponse = await urlRequest.json();
      const upload = await pinata.upload.public
        .fileArray(files)
        .url(urlResponse.url);
      const fileUrl = await pinata.gateways.public.convert(upload.cid);
      return {
        cid: upload.cid,
        url: fileUrl,
        ipfsHash: upload.cid,
        id: upload.id,
      };
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
  },

  json: async (content: any, name?: string) => {
    try {
      const urlRequest = await fetch("/api/url");
      if (!urlRequest.ok) {
        throw new Error(`Failed to get signed URL: ${urlRequest.statusText}`);
      }
      const urlResponse = await urlRequest.json();
      const upload = await pinata.upload.public
        .json({
          content,
          name: name || "json-content",
        })
        .url(urlResponse.url);

      const fileUrl = await pinata.gateways.public.convert(upload.cid);
      return {
        cid: upload.cid,
        url: fileUrl,
        ipfsHash: upload.cid,
        id: upload.id,
      };
    } catch (error) {
      console.error("Error uploading JSON:", error);
      throw error;
    }
  },
};


export const pinataFiles = {
  list: async () => {
    try {
      const response = await pinata.files.public.list();
      return response;
    } catch (error) {
      console.error("Error listing files:", error);
      throw error;
    }
  },


  update: async (id: string, name: string) => {
    try {
      const result = await pinata.files.public.update({ id, name });
      return result;
    } catch (error) {
      console.error("Error updating file:", error);
      throw error;
    }
  },

  delete: async (ids: string[]) => {
    try {
      const result = await pinata.files.public.delete(ids);
      return result;
    } catch (error) {
      console.error("Error deleting files:", error);
      throw error;
    }
  },
};

export const pinataGroups = {

  create: async (params: { name: string }) => {
    try {
      const group = await pinata.groups.public.create(params);
      return group;
    } catch (error) {
      console.error("Error creating group:", error);
      throw error;
    }
  },


  get: async (groupId: string) => {
    try {
     
      const group = await pinata.groups.public.get({ groupId });
      return group;
    } catch (error) {
      console.error("Error getting group:", error);
      throw error;
    }
  },

  list: async () => {
    try {
      const response = await pinata.groups.public.list();
      
      return response;
    } catch (error) {
      console.error("Error listing groups:", error);
      throw error;
    }
  },

 
  addFiles: async (params: { groupId: string; files: string[] }) => {
    try {
      const result = await pinata.groups.public.addFiles(params);
      return result;
    } catch (error) {
      console.error("Error adding files to group:", error);
      throw error;
    }
  },

 
  removeFiles: async (params: { groupId: string; files: string[] }) => {
    try {
      const result = await pinata.groups.public.removeFiles(params);
      return result;
    } catch (error) {
      console.error("Error removing files from group:", error);
      throw error;
    }
  },

 
  delete: async (params: { groupId: string }) => {
    try {
      const result = await pinata.groups.public.delete(params);
      return result;
    } catch (error) {
      console.error("Error deleting group:", error);
      throw error;
    }
  },
};
