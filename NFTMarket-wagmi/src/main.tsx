import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sepolia } from 'wagmi/chains'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import App from './App.tsx'
import './index.css'

const projectId = import.meta.env.VITE_PROJECT_ID || '80d5dff8b89bf0a91eb0aa84c55b6af0'

// 创建 wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  networks: [sepolia],
  projectId,
})

// 初始化 AppKit
createAppKit({
  adapters: [wagmiAdapter],
  networks: [sepolia],
  projectId,
  metadata: {
    name: 'NFT Market',
    description: 'Decentralized NFT Marketplace',
    url: window.location.origin,
    icons: [`${window.location.origin}/vite.svg`]
  },
  features: {
    analytics: false,
    email: true,
    socials: ['google', 'github', 'apple', 'facebook', 'x'],
    emailShowWallets: true,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#000000',
    '--w3m-color-mix-strength': 0,
    // '--w3m-overlay-background-color': 'rgba(0, 0, 0, 0.5)',
    // '--w3m-overlay-backdrop-filter': 'none'
  }
})

// 创建 QueryClient
const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
