// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../lib/openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract NFTMarket is ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }
    
    // 事件定义
    event NFTListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        uint256 timestamp
    );

    event NFTSold(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        address seller,
        uint256 timestamp
    );
    
    // NFT地址 => tokenId => 列表信息
    mapping(address => mapping(uint256 => Listing)) public listings;
    
    /**
     * @dev 上架NFT函数 - 必须是public或external
     */
    function list(address nftAddress, uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be greater than 0");
        require(IERC721(nftAddress).ownerOf(tokenId) == msg.sender, "Not the owner");
        
        // 转移NFT到市场合约
        IERC721(nftAddress).transferFrom(msg.sender, address(this), tokenId);
        
        // 创建列表
        listings[nftAddress][tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });
        
        // 触发事件
        emit NFTListed(msg.sender, nftAddress, tokenId, price, block.timestamp);
    }
    
    /**
     * @dev 购买NFT函数
     */
    function buyNFT(address nftAddress, uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[nftAddress][tokenId];
        require(listing.active, "NFT not for sale");
        require(msg.value == listing.price, "Incorrect payment amount");
        
        // 标记为已售出
        listings[nftAddress][tokenId].active = false;
        
        // 转移NFT给买家
        IERC721(nftAddress).transferFrom(address(this), msg.sender, tokenId);
        
        // 转账给卖家
        (bool success, ) = listing.seller.call{value: msg.value}("");
        require(success, "Transfer failed");
        
        // 触发事件
        emit NFTSold(msg.sender, nftAddress, tokenId, msg.value, listing.seller, block.timestamp);
    }
    
    /**
     * @dev 取消上架
     */
    function cancelListing(address nftAddress, uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[nftAddress][tokenId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Listing not active");
        
        listings[nftAddress][tokenId].active = false;
        IERC721(nftAddress).transferFrom(address(this), msg.sender, tokenId);
    }
    
    /**
     * @dev 获取列表信息
     */
    function getListing(address nftAddress, uint256 tokenId) external view returns (Listing memory) {
        return listings[nftAddress][tokenId];
    }
}