import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { localhost } from 'viem/chains'
import { config } from 'dotenv'

config()

async function deployContracts() {
  const client = createWalletClient({
    chain: localhost,
    transport: http('http://localhost:8545')
  })

  // 使用 Anvil 的默认私钥
  const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')

  console.log('🚀 部署合约...')
  
  // 这里添加你的部署逻辑
  // 实际部署需要合约的字节码
  
  console.log('✅ 合约部署完成')
}

deployContracts().catch(console.error)