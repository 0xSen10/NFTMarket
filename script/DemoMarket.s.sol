// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/NFTMarket.sol";
import "../src/MyNFT.sol";

contract DemoMarketScript is Script {
    function run() external {
        uint256 sellerKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        uint256 buyerKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
        
        address seller = vm.addr(sellerKey);
        address buyer = vm.addr(buyerKey);
        
        console.log("Seller: %s", seller);
        console.log("Buyer: %s", buyer);
        
        vm.startBroadcast(sellerKey);
        NFTMarket market = new NFTMarket();
        MyNFT nft = new MyNFT();
        console.log("Contracts deployed");
        console.log("  Market: %s", address(market));
        console.log("  NFT: %s", address(nft));
        
        nft.mint(seller, 1);
        console.log("Minted NFT - TokenID: 1 to seller");
        
        nft.approve(address(market), 1);
        market.list(address(nft), 1, 1.5 ether);
        console.log("NFT listed");
        console.log("  Price: 1.5 ETH");
        console.log("  Timestamp: %s", block.timestamp);
        vm.stopBroadcast();
        
        vm.startBroadcast(buyerKey);
        console.log("Buyer purchasing...");
        market.buyNFT{value: 1.5 ether}(address(nft), 1);
        console.log("Purchase successful!");
        console.log("  Buyer: %s", buyer);
        console.log("  Paid: 1.5 ETH");
        console.log("  Timestamp: %s", block.timestamp);
        vm.stopBroadcast();
        
        console.log("Demo completed!");
    }
}