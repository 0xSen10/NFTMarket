// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; // 添加这个

contract MyFirstNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    using Strings for uint256;
    
    // 为每个 tokenId 存储独立的 URI
    mapping(uint256 => string) private _tokenURIs;
    string private _baseTokenURI;


    constructor() ERC721("CmFirstNFT", "CFN")  Ownable(msg.sender) {
        _baseTokenURI = "https://gateway.pinata.cloud/ipfs/bafybeiep4e4u3fwvmfps7s3sq5kztblkrpuwt5fgvaosiww52rmy5o6axi/";
    }

    // 简化铸造：只需要传入接收地址，自动使用 tokenId 作为 JSON 文件名
    function mint(address to) public onlyOwner {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _mint(to, tokenId);
    }


    // 自动拼接：baseURI + tokenId
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        // 修复：使用 ownerOf 来检查存在性，不影响返回格式
        ownerOf(tokenId); // 如果不存在会自动 revert
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString()));
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
}