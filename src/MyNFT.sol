// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
    uint256 private _nextTokenId = 1;  // 直接使用 uint256
    
    constructor() ERC721("senNFT", "ssNFT") {}
    
    /**
     * @dev Mint 一个 NFT 给指定地址（指定 tokenId）
     */
    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
    
    /**
     * @dev 安全的 mint 函数，自动分配 tokenId
     */
    function safeMint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;  // 直接递增
        _safeMint(to, tokenId);
        return tokenId;
    }
    
    /**
     * @dev 批量 mint
     */
    function mintBatch(address to, uint256[] calldata tokenIds) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _mint(to, tokenIds[i]);
        }
    }
    
    /**
     * @dev 获取下一个 tokenId
     */
    function getNextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}