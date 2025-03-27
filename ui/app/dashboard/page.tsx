"use client"

import { useState, useEffect } from "react"
import { useAccount, useDisconnect } from "wagmi"
import { useRouter } from "next/navigation"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { motion, AnimatePresence } from "framer-motion"
import { CreateFolderDialog } from "@/components/create-folder-dialog"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

 const Dashboard= ()=> {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const router = useRouter()
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!isConnected) {
      router.push("/")
    }
  }, [isConnected, router])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
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
          <Button onClick={() => setIsCreateFolderOpen(true)}>Create Folder</Button>
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
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64 border rounded-lg p-6"
            >
              <h3 className="text-xl font-medium mb-2">No folders yet</h3>
              <p className="text-muted-foreground mb-4">Create your first folder to get started</p>
              <Button onClick={() => setIsCreateFolderOpen(true)}>Create Folder</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        onCreateFolder={async (folderName, file) => {
          // Implement folder creation logic here
          console.log("Creating folder:", folderName, file);
          setIsLoading(false);
        }}
      />
    </div>
  )
}

export default Dashboard;
