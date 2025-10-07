// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
";

contract MyFirstNFT is ERC721, Ownable {
    using Strings for uint256;
    
    // 使用原生 uint256 替代 Counters
    uint256 private _tokenIdCounter;
    
    string private _baseTokenURI;

    // OpenZeppelin v5 的 Ownable 构造函数需要初始所有者
    constructor() ERC721("CmFirstNFT", "CFN") Ownable(msg.sender) {
        _baseTokenURI = "https://gateway.pinata.cloud/ipfs/bafybeiep4e4u3fwvmfps7s3sq5kztblkrpuwt5fgvaosiww52rmy5o6axi/";
        _tokenIdCounter = 0; // 从 0 开始，或者从 1 开始根据您的需求
    }

    // 简化铸造：只需要传入接收地址，自动使用 tokenId 作为 JSON 文件名
    function mint(address to) public onlyOwner {
        _tokenIdCounter++; // 先递增再使用
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId); // 使用 _safeMint 更安全
    }

    // 批量铸造功能（可选添加）
    function mintBatch(address to, uint256 quantity) public onlyOwner {
        for (uint256 i = 0; i < quantity; i++) {
            _tokenIdCounter++;
            uint256 tokenId = _tokenIdCounter;
            _safeMint(to, tokenId);
        }
    }

    // 自动拼接：baseURI + tokenId
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId); // OpenZeppelin v5 的新方法，检查 token 是否存在
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json")); // 添加 .json 后缀
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter; // 直接返回计数器值
    }

    // 获取下一个可用的 tokenId（可选）
    function getNextTokenId() public view returns (uint256) {
        return _tokenIdCounter + 1;
    }

    // 重写 _update 函数以支持未来的扩展（如果需要继承其他扩展）
    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
}