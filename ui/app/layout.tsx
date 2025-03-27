import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Providers } from "@/app/providers"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Storage Factory",
  description: "Decentralized file storage system on IPFS",
  icons: {
    icon: [
      { url: '/logo.png' }
    ],
    apple: [
      { url: '/logo.png' }
    ]
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}