// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SENERC20V2.sol";

interface IMyFirstNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function getApproved(uint256 tokenId) external view returns (address);
}

contract NFTMarket {
    // 合约引用
    IMyFirstNFT public nftContract;
    BaseERC20V2 public tokenContract;
    
    // 上架信息结构体
    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
    }
    
    // tokenId 到上架信息的映射
    mapping(uint256 => Listing) public listings;
    
    // 事件
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event NFTPurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event NFTDelisted(uint256 indexed tokenId, address indexed seller);
    
    constructor(address _nftContract, address _tokenContract) {
        nftContract = IMyFirstNFT(_nftContract);
        tokenContract = BaseERC20V2(_tokenContract);
    }
    
    /**
     * @dev 上架NFT到市场
     * @param tokenId 要上架的NFT tokenId
     * @param price 价格（BERC20代币数量）
     */
    function list(uint256 tokenId, uint256 price) external {
        // 验证调用者是NFT所有者
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not NFT owner");
        // 验证价格大于0
        require(price > 0, "Price must be greater than 0");
        // 验证市场合约已被授权管理该NFT
        require(nftContract.isApprovedForAll(msg.sender, address(this)) || 
                nftContract.getApproved(tokenId) == address(this), "Market not approved");
        
        // 创建上架信息
        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isActive: true
        });
        
        emit NFTListed(tokenId, msg.sender, price);
    }
    
    /**
     * @dev 取消上架
     * @param tokenId 要取消上架的NFT tokenId
     */
    function delist(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "NFT not listed");
        require(listing.seller == msg.sender, "Not seller");
        
        // 取消上架
        listings[tokenId].isActive = false;
        
        emit NFTDelisted(tokenId, msg.sender);
    }
    
    /**
     * @dev 普通的购买函数
     * @param tokenId 要购买的NFT tokenId
     */
    function buyNFT(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "NFT not for sale");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");
        
        // 检查市场合约对NFT有转移权限
        require(nftContract.isApprovedForAll(listing.seller, address(this)) || 
                nftContract.getApproved(tokenId) == address(this), "Market not approved for transfer");
        
        // 转移代币从买家到卖家
        bool success = tokenContract.transferFrom(msg.sender, listing.seller, listing.price);
        require(success, "Token transfer failed");
        
        // 执行NFT转移
        _executePurchase(tokenId, msg.sender, listing.seller, listing.price);
    }
    
    /**
     * @dev 代币接收回调函数 - 通过代币转账直接购买NFT
     * @param from 代币发送者（买家）
     * @param amount 代币数量
     * @param data 附加数据（包含要购买的tokenId）
     */
    function tokensReceived(address from, uint256 amount, bytes calldata data) 
        external 
        returns (bool) 
    {
        // 确保只有指定的代币合约可以调用
        require(msg.sender == address(tokenContract), "Only accept specific token");
        
        // 解析数据获取tokenId
        require(data.length >= 32, "Invalid data");
        uint256 tokenId = abi.decode(data, (uint256));
        
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "NFT not for sale");
        require(listing.seller != from, "Cannot buy your own NFT");
        require(amount >= listing.price, "Insufficient payment");
        
        // 检查市场合约对NFT有转移权限
        require(nftContract.isApprovedForAll(listing.seller, address(this)) || 
                nftContract.getApproved(tokenId) == address(this), "Market not approved for transfer");
        
        // 如果支付金额超过定价，退还多余部分
        if (amount > listing.price) {
            uint256 refund = amount - listing.price;
            require(tokenContract.transfer(from, refund), "Refund failed");
        }
        
        // 转移代币到卖家（实际只需要定价部分）
        require(tokenContract.transfer(listing.seller, listing.price), "Payment to seller failed");
        
        // 执行NFT转移
        _executePurchase(tokenId, from, listing.seller, listing.price);
        
        return true;
    }
    
    /**
     * @dev 执行购买逻辑的内部函数
     */
    function _executePurchase(uint256 tokenId, address buyer, address seller, uint256 price) internal {
        // 取消上架状态
        listings[tokenId].isActive = false;
        
        // 转移NFT从卖家到买家
        nftContract.safeTransferFrom(seller, buyer, tokenId);
        
        emit NFTPurchased(tokenId, buyer, seller, price);
    }
    
    /**
     * @dev 获取上架信息
     * @param tokenId NFT的tokenId
     */
    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }
    
    /**
     * @dev 检查NFT是否在售
     * @param tokenId NFT的tokenId
     */
    function isNFTForSale(uint256 tokenId) external view returns (bool) {
        return listings[tokenId].isActive;
    }
    
    /**
     * @dev 获取在售NFT的价格
     * @param tokenId NFT的tokenId
     */
    function getNFTPrice(uint256 tokenId) external view returns (uint256) {
        require(listings[tokenId].isActive, "NFT not for sale");
        return listings[tokenId].price;
    }
}