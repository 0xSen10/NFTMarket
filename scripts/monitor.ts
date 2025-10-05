import { createPublicClient, http, parseAbiItem } from 'viem'
import { config } from 'dotenv'

config()

// 使用与 Anvil 匹配的链配置
const client = createPublicClient({
  chain: {
    id: 31337,
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
  transport: http(process.env.RPC_URL || 'http://localhost:8545')
})

const contractAddress = process.env.NFT_MARKET_ADDRESS as `0x${string}`

if (!contractAddress) {
  console.error('❌ 请设置 NFT_MARKET_ADDRESS 环境变量')
  process.exit(1)
}

console.log('🎯 开始监听 NFTMarket 事件...')
console.log('📍 合约地址:', contractAddress)
console.log('🔗 链 ID: 31337 (Anvil)')

// 测试连接
async function testConnection() {
  try {
    const blockNumber = await client.getBlockNumber()
    console.log('✅ RPC 连接成功，当前区块:', blockNumber.toString())
    
    // 检查合约代码
    const code = await client.getBytecode({ address: contractAddress })
    if (!code || code === '0x') {
      console.error('❌ 合约地址上没有代码，请检查合约是否已部署')
      return false
    }
    console.log('✅ 合约代码存在，长度:', code.length)
    return true
  } catch (error) {
    console.error('❌ 连接测试失败:', error)
    return false
  }
}

async function startMonitoring() {
  const connected = await testConnection()
  if (!connected) {
    process.exit(1)
  }

  console.log('📡 开始监听事件...')

  // 监听 NFTListed 事件
  const unwatchListed = client.watchEvent({
    address: contractAddress,
    event: parseAbiItem('event NFTListed(address indexed seller, address indexed nftAddress, uint256 indexed tokenId, uint256 price, uint256 timestamp)'),
    onLogs: (logs) => {
      console.log(`📨 收到 ${logs.length} 个 NFTListed 事件`)
      logs.forEach((log: any) => {
        const args = log.args
        console.log('📈 NFT 上架:')
        console.log('   卖家:', args.seller)
        console.log('   NFT:', args.nftAddress)
        console.log('   TokenID:', args.tokenId.toString())
        console.log('   价格:', Number(args.price) / 1e18, 'ETH')
        console.log('   交易:', log.transactionHash)
        console.log('   ---')
      })
    },
    onError: (error) => {
      console.error('❌ NFTListed 监听错误:', error)
    }
  })

  // 监听 NFTSold 事件
  const unwatchSold = client.watchEvent({
    address: contractAddress,
    event: parseAbiItem('event NFTSold(address indexed buyer, address indexed nftAddress, uint256 indexed tokenId, uint256 price, address seller, uint256 timestamp)'),
    onLogs: (logs) => {
      console.log(`📨 收到 ${logs.length} 个 NFTSold 事件`)
      logs.forEach((log: any) => {
        const args = log.args
        console.log('💰 NFT 售出:')
        console.log('   买家:', args.buyer)
        console.log('   卖家:', args.seller)
        console.log('   TokenID:', args.tokenId.toString())
        console.log('   价格:', Number(args.price) / 1e18, 'ETH')
        console.log('   交易:', log.transactionHash)
        console.log('   ---')
      })
    },
    onError: (error) => {
      console.error('❌ NFTSold 监听错误:', error)
    }
  })

  console.log('✅ 监听器已启动并运行中')
  console.log('⏹️  按 Ctrl+C 停止')

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n🛑 停止监听...')
    unwatchListed()
    unwatchSold()
    process.exit(0)
  })
}

startMonitoring().catch(console.error)