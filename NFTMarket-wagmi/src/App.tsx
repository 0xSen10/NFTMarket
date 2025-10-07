import { useState, useEffect } from 'react';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from 'wagmi';
import { useAppKit, useDisconnect } from '@reown/appkit/react';
import { sepolia } from 'wagmi/chains'; 

// ABI 
import nftABI from './abi/MyFirstNFT.json';
import tokenABI from './abi/SENERC20V2.json';
import marketABI from './abi/NFTMarket.json';

//  替换为你的合约地址
const NFT_ADDRESS = '0x967F94485Eeb4bf58addc27a19434f1646dC3c6e';
const TOKEN_ADDRESS = '0xCb06Ce74C50DF2722ECBB52C8348E02aBDBf0Cfc';
const MARKET_ADDRESS = '0xA96DDa7eAfF52e800c83fe1bA2a1F4536634a0Ab';

// 主组件
export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f2027 100%)',
      color: '#ffffff',
      fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <MarketPage />
    </div>
  );
}

function MarketPage() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  // 状态管理
  const [ownedTokenIds, setOwnedTokenIds] = useState<number[]>([]);
  const [listedNFTs, setListedNFTs] = useState<Array<{tokenId: number, price: string, seller: string, isActive: boolean}>>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [nftPrices, setNftPrices] = useState<{[tokenId: number]: string}>({});
  
  // 临时存储待操作的NFT信息
  const [pendingListNFT, setPendingListNFT] = useState<{tokenId: number, price: string} | null>(null);
  const [pendingBuyNFT, setPendingBuyNFT] = useState<{tokenId: number, price: string} | null>(null);

  // 显示成功消息
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // 显示错误消息
  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // 添加调试信息
  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  // 读取用户 Token 余额
  const { data: tokenBalance, error: tokenBalanceError, isLoading: isLoadingTokenBalance } = useBalance({
    address,
    token: TOKEN_ADDRESS,
    chainId: sepolia.id,
    query: { 
      enabled: !!address && !!TOKEN_ADDRESS,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // 测试合约连接
  const { data: nftName, error: nftNameError, isLoading: isLoadingNftName } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftABI,
    functionName: 'name',
    chainId: sepolia.id,
    query: { 
      enabled: !!NFT_ADDRESS,
      retry: 3,
      retryDelay: 1000,
    },
  });

  const { data: tokenName, error: tokenNameError, isLoading: isLoadingTokenName } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: tokenABI,
    functionName: 'name',
    chainId: sepolia.id,
    query: { 
      enabled: !!TOKEN_ADDRESS,
      retry: 3,
      retryDelay: 1000,
    },
  });

  const { data: marketContractTest, error: marketContractError, isLoading: isLoadingMarketContract } = useReadContract({
    address: MARKET_ADDRESS,
    abi: marketABI,
    functionName: 'getTotalListedCount',
    chainId: sepolia.id,
    query: { 
      enabled: !!MARKET_ADDRESS,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // 写入合约 hooks
  const {
    writeContract: writeList,
    data: listHash,
    isPending: isListPending,
    error: listError,
  } = useWriteContract();

  const {
    writeContract: writeBuy,
    data: buyHash,
    isPending: isBuyPending,
    error: buyError,
  } = useWriteContract();

  const {
    writeContract: writeApproveNFT,
    data: approveNFTHash,
    isPending: isApproveNFTPending,
    error: approveNFTError,
  } = useWriteContract();

  const {
    writeContract: writeApproveToken,
    data: approveTokenHash,
    isPending: isApproveTokenPending,
    error: approveTokenError,
  } = useWriteContract();

  const {
    writeContract: writeDelist,
    data: delistHash,
    isPending: isDelistPending,
    error: delistError,
  } = useWriteContract();

  //  等待交易确认
  const { isSuccess: isListSuccess } = useWaitForTransactionReceipt({ hash: listHash });
  const { isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash });
  const { isSuccess: isDelistSuccess } = useWaitForTransactionReceipt({ hash: delistHash });
  const { isSuccess: isApproveNFTSuccess } = useWaitForTransactionReceipt({ hash: approveNFTHash });
  const { isSuccess: isApproveTokenSuccess } = useWaitForTransactionReceipt({ hash: approveTokenHash });

  // 使用新的tokensOfOwner方法获取用户拥有的NFT
  const { 
    data: ownedTokensData, 
    isLoading: isLoadingNFTs,
    error: ownedTokensError,
    refetch: refetchOwnedTokens
  } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftABI,
    functionName: 'tokensOfOwner',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address && !!NFT_ADDRESS,
    },
    chainId: sepolia.id,
  });

  // 处理用户拥有的NFT数据
  useEffect(() => {
    if (ownedTokensData && Array.isArray(ownedTokensData)) {
      const tokenIds = ownedTokensData.map(tokenId => Number(tokenId));
      setOwnedTokenIds(tokenIds);
    } else {
      setOwnedTokenIds([]);
    }

    if (ownedTokensError) {
      showErrorMessage('获取NFT列表失败');
    }
  }, [ownedTokensData, ownedTokensError]);

  // 获取已上架的NFT
  const { 
    data: activeListingsData, 
    error: activeListingsError,
    refetch: refetchActiveListings
  } = useReadContract({
    address: MARKET_ADDRESS,
    abi: marketABI,
    functionName: 'getActiveListings',
    chainId: sepolia.id,
    query: { 
      enabled: !!MARKET_ADDRESS,
      retry: 3,
      retryDelay: 1500,
    },
  });

  // 处理已上架NFT数据
  useEffect(() => {
    const listed: Array<{tokenId: number, price: string, seller: string, isActive: boolean}> = [];
    const myListed: Array<{tokenId: number, price: string, isActive: boolean}> = [];
    
    try {
      if (activeListingsData && Array.isArray(activeListingsData) && activeListingsData.length === 2) {
        const [tokenIds, listings] = activeListingsData as [bigint[], any[]];
        
        // 处理活跃的上架数据
        for (let i = 0; i < tokenIds.length; i++) {
          const tokenId = Number(tokenIds[i]);
          const listingData = listings[i];
          
          if (listingData && listingData.isActive) {
            const listingInfo = {
              tokenId: tokenId,
              price: (Number(listingData.price) / 1e18).toFixed(4),
              seller: listingData.seller,
              isActive: listingData.isActive
            };
            
            listed.push(listingInfo);
            
            // 如果是当前用户的NFT
            if (address && listingData.seller.toLowerCase() === address.toLowerCase()) {
              myListed.push({
                tokenId: tokenId,
                price: (Number(listingData.price) / 1e18).toFixed(4),
                isActive: listingData.isActive
              });
            }
          }
        }
      }
    } catch (error) {
      showErrorMessage('处理NFT数据时出错');
    }
    
    setListedNFTs(listed);
    
    if (activeListingsError) {
      showErrorMessage('获取NFT列表失败');
    }
  }, [address, activeListingsData, activeListingsError]);



  useEffect(() => {
    if (listError) addDebugInfo(`上架失败: ${listError.message}`);
    if (buyError) addDebugInfo(`购买失败: ${buyError.message}`);
    if (delistError) addDebugInfo(`下架失败: ${delistError.message}`);
    if (approveNFTError) addDebugInfo(`NFT授权失败: ${approveNFTError.message}`);
    if (approveTokenError) addDebugInfo(`Token授权失败: ${approveTokenError.message}`);
  }, [listError, buyError, delistError, approveNFTError, approveTokenError]);

  useEffect(() => {
    addDebugInfo(`当前网络: ${chainId === sepolia.id ? 'Sepolia' : `未知(${chainId})`}`);
    addDebugInfo(`钱包连接: ${isConnected ? '已连接' : '未连接'}`);
    if (address) addDebugInfo(`钱包地址: ${address.slice(0, 6)}...${address.slice(-4)}`);
  }, [chainId, isConnected, address]);

  // 交易成功监听
  useEffect(() => {
    if (isListSuccess) {
      showSuccessMessage('NFT上架成功！');
      // 刷新数据
      refetchOwnedTokens();
      refetchActiveListings();
    }
  }, [isListSuccess, refetchOwnedTokens, refetchActiveListings]);

  useEffect(() => {
    if (isBuySuccess) {
      showSuccessMessage('NFT购买成功！');
      // 刷新数据
      refetchOwnedTokens();
      refetchActiveListings();
    }
  }, [isBuySuccess, refetchOwnedTokens, refetchActiveListings]);

  useEffect(() => {
    if (isDelistSuccess) {
      showSuccessMessage('NFT下架成功！');
      // 刷新数据
      refetchOwnedTokens();
      refetchActiveListings();
    }
  }, [isDelistSuccess, refetchOwnedTokens, refetchActiveListings]);

  // 授权成功后自动执行操作
  useEffect(() => {
    if (isApproveNFTSuccess && pendingListNFT) {
      // NFT授权成功后，执行上架操作
      writeList({
        address: MARKET_ADDRESS,
        abi: marketABI,
        functionName: 'list',
        args: [BigInt(pendingListNFT.tokenId), BigInt(parseFloat(pendingListNFT.price) * 1e18)],
      });
      // 清除待处理状态
      setPendingListNFT(null);
    }
  }, [isApproveNFTSuccess, pendingListNFT, writeList]);

  useEffect(() => {
    if (isApproveTokenSuccess && pendingBuyNFT) {
      // Token授权成功后，执行购买操作
      writeBuy({
        address: MARKET_ADDRESS,
        abi: marketABI,
        functionName: 'buyNFT',
        args: [BigInt(pendingBuyNFT.tokenId)],
      });
      // 清除待处理状态
      setPendingBuyNFT(null);
    }
  }, [isApproveTokenSuccess, pendingBuyNFT, writeBuy]);

  // 🔄 重试连接函数
  const handleRetry = () => {
    // 重新获取数据
    refetchOwnedTokens();
    refetchActiveListings();
    showSuccessMessage('正在重新连接...');
  };

  // 🚪 强制断开连接（含页面重载，彻底解决长时间未操作后断不开问题）
  const handleDisconnectSafe = async () => {
    try {
      // 显示断开中状态
      showSuccessMessage('正在断开连接...');
      
      // 清理待处理状态，避免悬挂事务影响断开
      setPendingListNFT(null);
      setPendingBuyNFT(null);
      setNftPrices({});

      // 先尝试正常断开
      try {
        await disconnect();
      } catch (disconnectError) {
        console.warn('正常断开失败，将强制清理:', disconnectError);
      }

      // 强制清理所有钱包相关缓存
      try {
        const lsKeys = Object.keys(localStorage);
        for (const k of lsKeys) {
          if (k.startsWith('wc@') || 
              k.toLowerCase().includes('walletconnect') || 
              k.startsWith('appkit') || 
              k.startsWith('w3m') || 
              k.startsWith('wagmi') ||
              k.includes('reown') ||
              k.includes('connector') ||
              k.includes('wallet') ||
              k.includes('web3modal') ||
              k.includes('auth')) {
            localStorage.removeItem(k);
          }
        }
        const ssKeys = Object.keys(sessionStorage);
        for (const k of ssKeys) {
          if (k.startsWith('wc@') || 
              k.toLowerCase().includes('walletconnect') || 
              k.startsWith('appkit') || 
              k.startsWith('w3m') || 
              k.startsWith('wagmi') ||
              k.includes('reown') ||
              k.includes('connector') ||
              k.includes('wallet') ||
              k.includes('web3modal') ||
              k.includes('auth')) {
            sessionStorage.removeItem(k);
          }
        }
        
        // 清理 IndexedDB 中的钱包相关数据
        if ('indexedDB' in window) {
          const dbsToDelete = ['keyvaluestorage-polyfill', 'wagmi', 'appkit', 'walletconnect', 'web3modal', 'reown'];
          for (const dbName of dbsToDelete) {
            try {
              const deleteReq = indexedDB.deleteDatabase(dbName);
              deleteReq.onsuccess = () => console.log(`已删除 IndexedDB: ${dbName}`);
              deleteReq.onerror = () => console.warn(`删除 IndexedDB ${dbName} 失败`);
            } catch (e) {
              console.warn(`删除 IndexedDB ${dbName} 失败:`, e);
            }
          }
        }
        
        // 清理 cookies 中的钱包相关数据
        try {
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.includes('wallet') || name.includes('appkit') || name.includes('web3modal') || name.includes('wc')) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
          }
        } catch (cookieError) {
          console.warn('清理 cookies 失败:', cookieError);
        }
        
      } catch (cacheError) {
        console.warn('清理缓存失败:', cacheError);
      }

      // 延迟后强制重载页面，确保完全重置状态
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      showSuccessMessage('钱包已断开，页面即将刷新...');
    } catch (error) {
      console.error('断开连接失败:', error);
      addDebugInfo(`断开连接异常: ${(error as any)?.message || String(error)}`);
      
      // 即使出错也强制重载页面
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
      showErrorMessage('断开连接失败，页面即将强制刷新...');
    }
  };

  // 📤 上架 NFT (新的卡片式)
  const handleListNFT = async (tokenId: number, price: string) => {
    if (!price || parseFloat(price) <= 0) {
      showErrorMessage('请输入有效的价格');
      return;
    }

    try {
      // 存储待上架的NFT信息
      setPendingListNFT({ tokenId, price });
      
      // 先授权市场操作 NFT
      writeApproveNFT({
        address: NFT_ADDRESS,
        abi: nftABI,
        functionName: 'setApprovalForAll',
        args: [MARKET_ADDRESS, true],
      });
    } catch (error) {
      showErrorMessage('上架失败');
      setPendingListNFT(null);
    }
  };

  // 检查NFT是否已上架
  const isNFTListed = (tokenId: number) => {
    return listedNFTs.some(nft => nft.tokenId === tokenId && nft.isActive);
  };

  // 获取已上架NFT的价格
  const getListedNFTPrice = (tokenId: number) => {
    const listedNFT = listedNFTs.find(nft => nft.tokenId === tokenId && nft.isActive);
    return listedNFT ? listedNFT.price : '';
  };

  // 📤 下架 NFT
  const handleDelist = async (tokenIdToDelist: number) => {
    if (!tokenIdToDelist) {
      showErrorMessage('请选择要下架的NFT');
      return;
    }

    writeDelist({
      address: MARKET_ADDRESS,
      abi: marketABI,
      functionName: 'delist',
      args: [BigInt(tokenIdToDelist)],
    });
  };

  // 🛒 直接购买 NFT（从市场列表）
  const handleDirectBuy = async (tokenIdToBuy: number, priceInBERC20: string) => {
    if (!tokenIdToBuy || !priceInBERC20) {
      showErrorMessage('无效的购买信息');
      return;
    }

    try {
      // 存储待购买的NFT信息
      setPendingBuyNFT({ tokenId: tokenIdToBuy, price: priceInBERC20 });
      
      // 将价格转换为 wei（假设 BERC20 有 18 位小数）
      const priceInWei = BigInt(parseFloat(priceInBERC20) * 1e18);

      // 先授权市场使用 Token
      writeApproveToken({
        address: TOKEN_ADDRESS,
        abi: tokenABI,
        functionName: 'approve',
        args: [MARKET_ADDRESS, priceInWei],
      });
    } catch (error) {
      showErrorMessage('购买失败');
      setPendingBuyNFT(null);
    }
  };

  // 样式定义
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      minHeight: '100vh',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '40px',
      padding: '20px 0',
    },
    title: {
      fontSize: 'clamp(2rem, 5vw, 3.5rem)',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '10px',
      textShadow: '0 0 30px rgba(0, 255, 136, 0.3)',
    },
    subtitle: {
      fontSize: '1.2rem',
      color: '#a0a0a0',
      fontWeight: '300',
    },
    debugPanel: {
      background: 'rgba(0, 255, 136, 0.05)',
      border: '1px solid rgba(0, 255, 136, 0.2)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '30px',
      maxHeight: '250px',
      overflowY: 'auto' as const,
    },
    statusPanel: {
      // background: 'rgba(0, 0, 0, 0.4)',
      // border: '1px solid rgba(0, 255, 136, 0.3)',
      borderRadius: '12px',
      padding: '20px',
      // marginBottom: '30px',
    },
    statusGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px',
      marginTop: '15px',
    },
    statusItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      fontSize: '0.9rem',
    },
    connectButton: {
      background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
      color: '#000',
      border: 'none',
      padding: '15px 30px',
      borderRadius: '12px',
      fontSize: '1.1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 20px rgba(0, 255, 136, 0.3)',
    },
    walletInfo: {
      // background: 'rgba(0, 255, 136, 0.1)',
      // border: '1px solid rgba(0, 255, 136, 0.3)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '30px',
    },
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '30px',
      marginTop: '30px',
    },
    card: {
      background: 'rgba(0, 0, 0, 0.6)',
      border: '1px solid rgba(0, 255, 136, 0.2)',
      borderRadius: '16px',
      padding: '25px',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s ease',
    },
    cardTitle: {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#00ff88',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    inputGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      color: '#b0b0b0',
      fontSize: '0.9rem',
      fontWeight: '500',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(0, 255, 136, 0.3)',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '1rem',
      transition: 'all 0.3s ease',
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(0, 0, 0, 0.8)',
      border: '1px solid rgba(0, 255, 136, 0.3)',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '1rem',
      cursor: 'pointer',
    },
    button: {
      background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
      color: '#000',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      width: '100%',
      marginTop: '10px',
    },
    buttonDisabled: {
      background: 'rgba(128, 128, 128, 0.3)',
      color: '#666',
      cursor: 'not-allowed',
    },
    listingInfo: {
      background: 'rgba(0, 255, 136, 0.1)',
      border: '1px solid rgba(0, 255, 136, 0.3)',
      borderRadius: '8px',
      padding: '15px',
      marginTop: '15px',
    },
    successMessage: {
      position: 'fixed' as const,
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
      color: '#000',
      padding: '15px 25px',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      boxShadow: '0 4px 20px rgba(0, 255, 136, 0.4)',
      zIndex: 1000,
      animation: 'slideIn 0.3s ease-out',
    },
  };

  // 🖥️ 渲染
  return (
    <div style={styles.container}>
      {/* 成功消息 */}
      {successMessage && (
        <div style={styles.successMessage}>
          {successMessage}
        </div>
      )}
      
      {/* 错误消息 Toast */}
      {errorMessage && (
        <div style={{
          position: 'fixed' as const,
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #ff4757 0%, #c44569 100%)',
          color: '#fff',
          padding: '15px 25px',
          borderRadius: '12px',
          fontSize: '1rem',
          fontWeight: '600',
          boxShadow: '0 4px 20px rgba(255, 71, 87, 0.4)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out',
          maxWidth: '400px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}
      {/* 头部 */}
      <div style={styles.header}>
        <h1 style={styles.title}>🎨 NFT 市场</h1>
        <p style={styles.subtitle}>基于区块链的去中心化 NFT 交易平台</p>
      </div>



      
      {!isConnected ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2 style={{ color: '#00ff88', marginBottom: '20px' }}>连接钱包开始交易</h2>
          <p style={{ color: '#a0a0a0', marginBottom: '30px', fontSize: '1.1rem' }}>
            请连接您的钱包以使用 NFT 市场功能
          </p>
          <button 
            style={styles.connectButton}
            onClick={() => open()}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 255, 136, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 255, 136, 0.3)';
            }}
          >
            连接钱包
          </button>
        </div>
      ) : (
        <div>
          {/* 钱包信息 */}
          <div style={styles.walletInfo}>
            <h3 style={{ color: '#00ff88', marginBottom: '15px' }}>💼 钱包信息</h3>
            <div style={styles.statusGrid}>
              <div style={styles.statusItem}>
                <span>👤</span>
                <span>地址: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <div style={styles.statusItem}>
                <span>💰</span>
                <span>余额: {
                  isLoadingTokenBalance ? '⏳ 加载中...' : 
                  tokenBalanceError ? `❌ 加载失败 (${tokenBalanceError.message.slice(0, 30)}...)` : 
                  tokenBalance ? `${Number(tokenBalance.formatted).toFixed(4)} ${tokenBalance.symbol}` : 
                  '⚠️ 未获取到余额'
                }</span>
              </div>
              <div style={styles.statusItem}>
                <span>🖼️</span>
                <span>NFT: {
                  isLoadingNFTs ? '⏳ 检测中...' : 
                  ownedTokenIds.length > 0 ? `✅ 拥有 ${ownedTokenIds.length} 个` : 
                  '📭 无'
                }</span>
              </div>
            </div>
            
            {/* 钱包操作按钮 */}
            <div style={{
              marginTop: '15px',
              display: 'flex',
              gap: '20px',
              flexWrap: 'nowrap',
              alignItems: 'center',
              justifyContent: 'space-evenly',
              width: '100%'
            }}>
              <button
                onClick={() => open()}
                style={{
                  background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
                  color: '#000',
                  fontSize: '14px',
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: '1px solid rgba(0,255,136,0.5)',
                  boxShadow: '0 4px 15px rgba(0, 255, 136, 0.4)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  flex: '1'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 255, 136, 0.6)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #00ff88 0%, #00dd77 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)';
                }}
              >
                🔄 个人中心
              </button>
              <button
                onClick={handleDisconnectSafe}
                style={{
                  background: 'linear-gradient(135deg, #ff4757 0%, #e74c3c 100%)',
                  color: '#fff',
                  fontSize: '14px',
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: '1px solid rgba(255, 71, 87, 0.5)',
                  boxShadow: '0 4px 15px rgba(255, 71, 87, 0.4)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  flex: '1'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 71, 87, 0.6)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ff6b7a 0%, #ff4757 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 71, 87, 0.4)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ff4757 0%, #e74c3c 100%)';
                }}
              >
                🔐 断开连接
              </button>
            </div>
          </div>

          {/* NFT市场 - 主要展示区域 */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '25px'
          }}>
            <h3 style={{ 
              color: '#00ff88', 
              marginBottom: '20px', 
              fontSize: '1.5rem',
              textAlign: 'center',
              textShadow: '0 0 10px rgba(0, 255, 136, 0.5)'
            }}>
              🏪 NFT 市场
            </h3>
            
            {listedNFTs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#888',
                fontSize: '1.1rem'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🛍️</div>
                <p>暂无NFT上架，快来上架您的第一个NFT吧！</p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '20px'
              }}>
                {listedNFTs.map((nft, index) => {
                  const isOwnNFT = address && nft.seller.toLowerCase() === address.toLowerCase();
                  return (
                    <div key={index} style={{
                      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 50, 30, 0.4) 100%)',
                      border: '1px solid rgba(0, 255, 136, 0.4)',
                      borderRadius: '15px',
                      padding: '20px',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 255, 136, 0.3)';
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.4)';
                    }}
                    >
                      {/* NFT图标和状态指示器 */}
                      <div style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: isOwnNFT ? 'rgba(0, 255, 136, 0.2)' : 'rgba(52, 152, 219, 0.2)',
                        color: isOwnNFT ? '#00ff88' : '#3498db',
                        padding: '5px 10px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {isOwnNFT ? '✅ 我的' : '🛒 可购买'}
                      </div>

                      {/* NFT信息 */}
                      <div style={{ marginBottom: '15px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '10px'
                        }}>
                          <span style={{ fontSize: '2rem', marginRight: '10px' }}>🎨</span>
                          <div>
                            <h4 style={{ 
                              color: '#fff', 
                              margin: '0',
                              fontSize: '1.2rem',
                              fontWeight: '600'
                            }}>
                              Token ID: {nft.tokenId}
                            </h4>
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '15px'
                        }}>
                          <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>👤</span>
                          <span style={{ color: '#a0a0a0', fontSize: '0.95rem' }}>
                            卖家: {nft.seller.slice(0, 8)}...{nft.seller.slice(-6)}
                          </span>
                        </div>

                        <div style={{
                          background: 'rgba(0, 255, 136, 0.1)',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                          borderRadius: '10px',
                          padding: '12px',
                          textAlign: 'center',
                          marginBottom: '15px'
                        }}>
                          <div style={{ color: '#00ff88', fontSize: '1.1rem', fontWeight: '600' }}>
                            💰 {nft.price} BERC20
                          </div>
                        </div>
                      </div>

                      {/* 操作按钮 - 只有登录用户才显示 */}
                      {isConnected && (
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {isOwnNFT ? (
                            <button
                              disabled={true}
                              style={{
                                background: 'linear-gradient(135deg, #666 0%, #555 100%)',
                                color: '#999',
                                border: 'none',
                                borderRadius: '25px',
                                padding: '12px 24px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'not-allowed',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                boxShadow: '0 4px 15px rgba(102, 102, 102, 0.3)'
                              }}
                            >
                              🚫 不可购买（自己的NFT）
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDirectBuy(nft.tokenId, nft.price)}
                              disabled={isBuyPending || isApproveTokenPending}
                              style={{
                                background: (isBuyPending || isApproveTokenPending) ? 
                                  'linear-gradient(135deg, #666 0%, #555 100%)' : 
                                  'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '25px',
                                padding: '12px 24px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: (isBuyPending || isApproveTokenPending) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                boxShadow: '0 4px 15px rgba(0, 255, 136, 0.3)'
                              }}
                              onMouseEnter={(e) => {
                                if (!e.currentTarget.disabled) {
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.3)';
                              }}
                            >
                              {isApproveTokenPending ? '⏳ 授权中...' : isBuyPending ? '⏳ 购买中...' : '🛒 立即购买'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 我的NFT管理区域 */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '12px',
            padding: '25px',
            margin: '0 auto'
          }}>
            <h2 style={{
              color: '#00ff88',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: '1.3rem',
              textShadow: '0 0 10px rgba(0, 255, 136, 0.5)'
            }}>
              <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🎨</span>
              我的 NFT 收藏
            </h2>
            
            {ownedTokenIds.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#888',
                padding: '40px 20px',
                fontSize: '1.1rem'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎭</div>
                <p>您还没有拥有任何 NFT</p>
                <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                  去市场购买一些 NFT 或者铸造新的 NFT 吧！
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
                marginTop: '20px'
              }}>
                {ownedTokenIds.map((tokenId) => {
                  const isListed = isNFTListed(tokenId);
                  const currentPrice = isListed ? getListedNFTPrice(tokenId) : (nftPrices[tokenId] || '');
                  
                  return (
                    <div
                      key={tokenId}
                      style={{
                        background: 'rgba(0, 0, 0, 0.8)',
                        border: `2px solid ${isListed ? 'rgba(255, 193, 7, 0.5)' : 'rgba(0, 255, 136, 0.3)'}`,
                        borderRadius: '12px',
                        padding: '20px',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = `0 10px 25px ${isListed ? 'rgba(255, 193, 7, 0.3)' : 'rgba(0, 255, 136, 0.3)'}`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* NFT状态标识 */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: isListed ? 'linear-gradient(135deg, #ffc107, #ff8f00)' : 'linear-gradient(135deg, #00ff88, #00cc6a)',
                        color: '#000',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {isListed ? '🔥 已上架' : '💎 未上架'}
                      </div>

                      {/* NFT信息 */}
                      <div style={{
                        textAlign: 'center',
                        marginBottom: '15px'
                      }}>
                        <div style={{
                          fontSize: '2.5rem',
                          marginBottom: '10px'
                        }}>🖼️</div>
                        <h3 style={{
                          color: '#fff',
                          margin: '0 0 5px 0',
                          fontSize: '1.2rem'
                        }}>
                          NFT #{tokenId}
                        </h3>
                        <p style={{
                          color: '#888',
                          margin: '0',
                          fontSize: '0.9rem'
                        }}>
                          Token ID: {tokenId}
                        </p>
                      </div>

                      {/* 价格显示/输入 */}
                      {isListed ? (
                        <div style={{
                          background: 'rgba(255, 193, 7, 0.1)',
                          border: '1px solid rgba(255, 193, 7, 0.3)',
                          borderRadius: '8px',
                          padding: '12px',
                          marginBottom: '15px',
                          textAlign: 'center'
                        }}>
                          <div style={{ color: '#ffc107', fontSize: '0.9rem', marginBottom: '5px' }}>
                            当前售价
                          </div>
                          <div style={{ color: '#fff', fontSize: '1.3rem', fontWeight: '600' }}>
                            {currentPrice} BERC20
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{
                            display: 'block',
                            color: '#00ff88',
                            marginBottom: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            设置售价 (BERC20)
                          </label>
                          <input
                            type="number"
                            value={nftPrices[tokenId] || ''}
                            onChange={(e) => setNftPrices(prev => ({ ...prev, [tokenId]: e.target.value }))}
                            placeholder="例如: 1.5"
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: 'rgba(0, 0, 0, 0.7)',
                              border: '1px solid rgba(0, 255, 136, 0.3)',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '1rem',
                              outline: 'none',
                              transition: 'all 0.3s ease'
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#00ff88';
                              e.target.style.boxShadow = '0 0 8px rgba(0, 255, 136, 0.3)';
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = 'rgba(0, 255, 136, 0.3)';
                              e.target.style.boxShadow = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* 操作按钮 */}
                      {isListed ? (
                        <button
                          onClick={() => handleDelist(tokenId)}
                          disabled={isDelistPending}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: isDelistPending ? 
                              'linear-gradient(135deg, #666 0%, #555 100%)' : 
                              'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: isDelistPending ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {isDelistPending ? '⏳ 下架中...' : '🗑️ 取消上架'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleListNFT(tokenId, nftPrices[tokenId] || '')}
                          disabled={isListPending || isApproveNFTPending || !nftPrices[tokenId] || parseFloat(nftPrices[tokenId] || '0') <= 0}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: (isListPending || isApproveNFTPending || !nftPrices[tokenId] || parseFloat(nftPrices[tokenId] || '0') <= 0) ? 
                              'linear-gradient(135deg, #666 0%, #555 100%)' : 
                              'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: (isListPending || isApproveNFTPending || !nftPrices[tokenId] || parseFloat(nftPrices[tokenId] || '0') <= 0) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {isApproveNFTPending ? '⏳ 授权中...' : isListPending ? '⏳ 上架中...' : '📤 立即上架'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 合约连接状态 */}
      <div style={styles.statusPanel}>
        {/* <h4 style={{ margin: '0 0 15px 0', color: '#00ff88', fontSize: '1.1rem' }}>📡 合约连接状态</h4> */}
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <span>🎨</span>
            <span>NFT合约: {isLoadingNftName ? '检测中...' : nftName ? `✅ ${nftName}` : '❌ 连接失败'}</span>
          </div>
          <div style={styles.statusItem}>
            <span>💰</span>
            <span>Token合约: {isLoadingTokenName ? '检测中...' : tokenName ? `✅ ${tokenName}` : '❌ 连接失败'}</span>
          </div>
          <div style={styles.statusItem}>
            <span>🏪</span>
            <span>Market合约: {isLoadingMarketContract ? '检测中...' : marketContractTest !== undefined ? `✅ 已连接` : marketContractError ? '❌ 连接失败' : '⏳ 等待连接'}</span>
          </div>
          <div style={styles.statusItem}>
            <span>🌐</span>
            <span>网络: {chainId === sepolia.id ? '✅ Sepolia' : `❌ 错误网络 (${chainId})`}</span>
          </div>
        </div>
        
        {/* 重试按钮 */}
        {(nftNameError || tokenNameError || tokenBalanceError || marketContractError || activeListingsError) && (
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <button
              onClick={handleRetry}
              style={{
                background: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
                color: '#000',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              🔄 重试连接
            </button>
          </div>
        )}

      </div>
      
      {/* 页面底部调试信息区域 */}
      <div style={{
        display: 'none', // 隐藏开发者信息模块
        marginTop: '50px',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        fontSize: '0.8rem'
      }}>
        <details style={{ color: '#888' }}>
          <summary style={{ 
            cursor: 'pointer', 
            color: '#00ff88', 
            marginBottom: '10px',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            🔧 开发者信息 (点击展开)
          </summary>
          
          {/* 系统日志 */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00ff88', fontSize: '0.9rem' }}>🔍 系统日志</h4>
            {debugInfo.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', margin: '0' }}>等待系统信息...</p>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {debugInfo.map((info, index) => {
                  let style: any = { marginBottom: '4px', padding: '2px 0', fontSize: '0.8rem' };
                  if (info.includes('✅')) {
                    style = { ...style, color: '#00ff88' };
                  } else if (info.includes('❌')) {
                    style = { ...style, color: '#ff4757' };
                  } else if (info.includes('🔍')) {
                    style = { ...style, color: '#3742fa' };
                  } else if (info.includes('📭')) {
                    style = { ...style, color: '#ffa502' };
                  }
                  
                  return (
                    <div key={index} style={style}>{info}</div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* 技术错误信息 */}
          {(nftNameError || tokenNameError || tokenBalanceError || marketContractError || activeListingsError || listError || buyError || delistError || approveNFTError || approveTokenError) && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#ff4757', fontSize: '0.9rem' }}>⚠️ 技术错误详情</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {nftNameError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    🎨 NFT合约: {nftNameError.message}
                  </div>
                )}
                {tokenNameError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    🪙 Token合约: {tokenNameError.message}
                  </div>
                )}
                {tokenBalanceError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    💰 余额查询: {tokenBalanceError.message}
                  </div>
                )}
                {marketContractError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    🏪 市场合约: {marketContractError.message}
                  </div>
                )}
                {activeListingsError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    📋 获取列表: {activeListingsError.message}
                  </div>
                )}
                {listError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    📤 上架操作: {listError.message}
                  </div>
                )}
                {buyError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    🛒 购买操作: {buyError.message}
                  </div>
                )}
                {delistError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    🗑️ 下架操作: {delistError.message}
                  </div>
                )}
                {approveNFTError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    ✅ NFT授权: {approveNFTError.message}
                  </div>
                )}
                {approveTokenError && (
                  <div style={{ color: '#ff4757', fontSize: '0.8rem', padding: '6px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '4px' }}>
                    ✅ Token授权: {approveTokenError.message}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 合约地址信息 */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#00ff88', fontSize: '0.9rem' }}>📋 合约地址</h4>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>
              <div>NFT: {NFT_ADDRESS}</div>
              <div>Token: {TOKEN_ADDRESS}</div>
              <div>Market: {MARKET_ADDRESS}</div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}