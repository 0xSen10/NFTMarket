import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { config } from 'dotenv'

config()

async function testInteractions() {
  // 使用自定义链配置来匹配 Anvil
  const client = createWalletClient({
    chain: {
      id: 31337, // Anvil 默认链 ID
      name: 'Anvil',
      network: 'anvil',
      nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
      },
      rpcUrls: {
        default: {
          http: ['http://localhost:8545'],
        },
        public: {
          http: ['http://localhost:8545'],
        },
      },
    },
    transport: http('http://localhost:8545')
  })

  // Anvil 账户
  const seller = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
  const buyer = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d')

  const nftAddress = process.env.MY_NFT_ADDRESS as `0x${string}`
const marketAddress = process.env.NFT_MARKET_ADDRESS as `0x${string}`

console.log('使用的地址:')
console.log('MyNFT:', nftAddress)
console.log('NFTMarket:', marketAddress)

  console.log('🧪 开始测试合约交互...')
  console.log('卖家:', seller.address)
  console.log('买家:', buyer.address)

  try {
    // 1. Mint NFT
    console.log('1. Minting NFT...')
    const mintHash = await client.writeContract({
      address: nftAddress,
      abi: [{
        name: 'mint',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'tokenId', type: 'uint256' }
        ],
        outputs: []
      }],
      functionName: 'mint',
      args: [seller.address, 1n],
      account: seller
    })
    console.log('   ✅ NFT Minted:', mintHash)

    // 等待区块确认
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 2. 授权市场合约
    console.log('2. Approving market...')
    const approveHash = await client.writeContract({
      address: nftAddress,
      abi: [{
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'tokenId', type: 'uint256' }
        ],
        outputs: []
      }],
      functionName: 'approve',
      args: [marketAddress, 1n],
      account: seller
    })
    console.log('   ✅ Market Approved:', approveHash)

    await new Promise(resolve => setTimeout(resolve, 1000))

    // 3. 上架 NFT
    console.log('3. Listing NFT...')
    const listHash = await client.writeContract({
      address: marketAddress,
      abi: [{
        name: 'list',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'nftAddress', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'price', type: 'uint256' }
        ],
        outputs: []
      }],
      functionName: 'list',
      args: [nftAddress, 1n, parseEther('1.5')],
      account: seller
    })
    console.log('   ✅ NFT Listed:', listHash)

    await new Promise(resolve => setTimeout(resolve, 2000))

    // 4. 购买 NFT
    console.log('4. Buying NFT...')
    const buyHash = await client.writeContract({
      address: marketAddress,
      abi: [{
        name: 'buyNFT',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: 'nftAddress', type: 'address' },
          { name: 'tokenId', type: 'uint256' }
        ],
        outputs: []
      }],
      functionName: 'buyNFT',
      args: [nftAddress, 1n],
      value: parseEther('1.5'),
      account: buyer
    })
    console.log('   ✅ NFT Purchased:', buyHash)

    console.log('🎉 所有交互测试完成！')

  } catch (error) {
    console.error('❌ 交互测试失败:', error)
  }
}

// 运行测试
testInteractions().catch(console.error)