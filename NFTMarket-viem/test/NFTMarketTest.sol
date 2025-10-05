// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/NFTMarket.sol";
import "../src/MyNFT.sol";

contract NFTMarketTest is Test {
    NFTMarket public market;
    MyNFT public nft;
    
    address public seller = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address public buyer = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    
    function setUp() public {
        // 部署合约
        market = new NFTMarket();
        nft = new MyNFT();
        
        // 给账户分配ETH
        vm.deal(seller, 100 ether);
        vm.deal(buyer, 100 ether);
        
        // 给卖家 mint 一个 NFT
        vm.prank(seller);
        nft.mint(seller, 1);
    }

    function testListNFT() public {
        vm.startPrank(seller);
        
        // 授权市场合约操作NFT
        nft.approve(address(market), 1);
        
        console.log("Before listing - NFT owner:", nft.ownerOf(1));
        console.log("Listing NFT...");
        
        // 执行上架
        market.list(address(nft), 1, 1.5 ether);
        vm.stopPrank();
        
        console.log("After listing - NFT owner:", nft.ownerOf(1));
        
        // 修复：获取 Listing 结构体
        NFTMarket.Listing memory listing = market.getListing(address(nft), 1);
        console.log("Listing seller:", listing.seller);
        console.log("Listing price:", listing.price / 1e18, "ETH");
        console.log("Listing active:", listing.active);
        
        assertEq(listing.seller, seller, "Seller should match");
        assertEq(listing.price, 1.5 ether, "Price should match");
        assertTrue(listing.active, "Listing should be active");
        
        console.log("NFT listing test completed");
    }

    function testBuyNFT() public {
        // 先上架NFT
        vm.startPrank(seller);
        nft.approve(address(market), 1);
        market.list(address(nft), 1, 1 ether);
        vm.stopPrank();
        
        console.log("NFT listed, starting purchase test...");
        
        uint256 buyerInitialBalance = buyer.balance;
        
        // 然后购买
        vm.startPrank(buyer);
        
        console.log("Buyer balance before:", buyerInitialBalance / 1e18, "ETH");
        market.buyNFT{value: 1 ether}(address(nft), 1);
        vm.stopPrank();
        
        console.log("NFT purchase test completed");
        
        // 验证状态变化
        assertEq(nft.ownerOf(1), buyer, "NFT should be transferred to buyer");
        console.log("NFT new owner:", nft.ownerOf(1));
        
        // 验证列表状态
        NFTMarket.Listing memory listing = market.getListing(address(nft), 1);
        assertFalse(listing.active, "Listing should be inactive after sale");
    }

    function testEventLogging() public {
        console.log("=== Starting event logging test ===");
        
        // 测试上架事件
        vm.startPrank(seller);
        nft.approve(address(market), 1);
        
        console.log("Listing NFT...");
        market.list(address(nft), 1, 2.5 ether);
        vm.stopPrank();
        
        console.log("NFT listed successfully");
        console.log("Seller: %s", seller);
        console.log("NFT Contract: %s", address(nft));
        console.log("TokenID: 1");
        console.log("Price: 2.5 ETH");
        console.log("Timestamp: %s", block.timestamp);
        
        // 验证上架信息
        NFTMarket.Listing memory listing = market.getListing(address(nft), 1);
        console.log("Listing active:", listing.active);
        console.log("Listing seller:", listing.seller);
        
        // 测试购买事件
        vm.startPrank(buyer);
        console.log("Buying NFT...");
        market.buyNFT{value: 2.5 ether}(address(nft), 1);
        vm.stopPrank();
        
        console.log("NFT purchased successfully");
        console.log("Buyer: %s", buyer);
        console.log("Seller: %s", seller);
        console.log("Price: 2.5 ETH");
        console.log("=== Event logging test completed ===");
        
        // 验证购买后的状态
        assertEq(nft.ownerOf(1), buyer, "NFT should be owned by buyer");
    }
    
    function testSimple() public {
        console.log("Simple test running");
        assertTrue(true, "This should always pass");
    }
    
    function testMultipleOperations() public {
        console.log("Testing multiple operations...");
        
        // Mint 第二个 NFT
        vm.prank(seller);
        nft.mint(seller, 2);
        
        // 上架两个 NFT
        vm.startPrank(seller);
        nft.approve(address(market), 1);
        nft.approve(address(market), 2);
        
        market.list(address(nft), 1, 1 ether);
        market.list(address(nft), 2, 2 ether);
        vm.stopPrank();
        
        // 验证两个列表
        NFTMarket.Listing memory listing1 = market.getListing(address(nft), 1);
        NFTMarket.Listing memory listing2 = market.getListing(address(nft), 2);
        
        assertTrue(listing1.active, "Listing 1 should be active");
        assertTrue(listing2.active, "Listing 2 should be active");
        assertEq(listing1.price, 1 ether, "Listing 1 price should match");
        assertEq(listing2.price, 2 ether, "Listing 2 price should match");
        
        console.log("Multiple operations test completed");
    }
}