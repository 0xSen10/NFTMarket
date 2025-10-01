// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol";

interface ITokenReceiver {
    function tokensReceived(address from, uint256 amount,bytes calldata data) external returns (bool);
}

contract BaseERC20V2 is ERC20 {
    
    constructor() ERC20("BaseERC20", "BERC20") {
        _mint(msg.sender,100000000 * 10 ** 18);
    }

    

    function transferWithCallback(address _to, uint256 _value,bytes calldata data) public returns (bool){
        bool success = super.transfer(_to, _value);
        // 如果转账成功且接受地址为合约地址的话，则发送通知
        if(_isContract(_to) && success){
            try ITokenReceiver(_to).tokensReceived(msg.sender, _value,data) {
                // 返回值方便后续扩展
                return true;
            } catch {
                return false; 
            }
        }
        return success;   
     }

    function _isContract(address _to) internal view returns (bool){
        return _to.code.length > 0;
    }

}