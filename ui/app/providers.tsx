"use client"

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import {  WagmiProvider, createConfig, http } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { getDefaultWallets, RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@rainbow-me/rainbowkit/styles.css"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"

// Get WalletConnect project ID from environment variables
const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "default_project_id"

// Log warning if project ID is not set
if (WALLET_CONNECT_PROJECT_ID === "default_project_id") {
  console.warn(
    "WalletConnect Project ID is not set. Please add NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID to your environment variables for production use.",
  )
}

// Configure RainbowKit
const { connectors } = getDefaultWallets({
  appName: "Storage Factory",
  projectId: WALLET_CONNECT_PROJECT_ID,
});

// Create wagmi config
const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(mainnet.rpcUrls.default.http[0]),
    [sepolia.id]: http(sepolia.rpcUrls.default.http[0]),
  },
  connectors,
});

// Create a QueryClient for React Query
const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  // Avoid hydration mismatch by only mounting after client-side render
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={resolvedTheme === "dark" ? darkTheme() : lightTheme()}
          modalSize="compact"
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

