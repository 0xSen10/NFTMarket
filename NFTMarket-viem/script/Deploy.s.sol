// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/NFTMarket.sol";
import "../src/MyNFT.sol";

contract DeployScript is Script {
    function run() external {
        // 使用 Anvil 的默认私钥
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        console.log(" Deploying MyNFT...");
        MyNFT nft = new MyNFT();
        console.log(" MyNFT deployed at:", address(nft));
        
        console.log(" Deploying NFTMarket...");
        NFTMarket market = new NFTMarket();
        console.log(" NFTMarket deployed at:", address(market));

        vm.stopBroadcast();

        console.log(" All contracts deployed successfully!");
        console.log("=========================================");
        console.log("MyNFT address:", address(nft));
        console.log("NFTMarket address:", address(market));
    }
}