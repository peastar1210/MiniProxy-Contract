//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./UpgradeableProxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract CloneFactory is Ownable {
    address public implementation;
    address public proxySample;
    mapping(bytes4 => uint256) public funcIds;     // methodId(signature) => index

    event ImplUpgraded(address indexed oldImpl, address indexed newImpl, address indexed admin);
    event ProxyCloned(address indexed proxy);

    constructor(address _impl, bytes4[] memory _funcIds) {
        upgradeImplementation(_impl, _funcIds);

        proxySample = address(new UpgradeableProxy());
    }

    function clone(uint256 _featureSet) onlyOwner external {
        address proxyAddr = Clones.clone(proxySample);
        emit ProxyCloned(proxyAddr);
        
        UpgradeableProxy proxy = UpgradeableProxy(payable(proxyAddr));
        proxy.setUp(_featureSet, address(this));
    }

    function updateFeatureSet(address payable _proxy, uint256 _newFeatureSet) onlyOwner external {
        UpgradeableProxy proxy = UpgradeableProxy(_proxy);
        proxy.updateFeatureSet(_newFeatureSet);
    }

    function upgradeImplementation(address _impl, bytes4[] memory _funcIds) onlyOwner public {
        assert(implementation != _impl);

        address oldImpl = implementation;
        implementation = _impl;

        for (uint8 i = 0; i < _funcIds.length; i ++) {
            funcIds[_funcIds[i]] = i + 1;
        }

        emit ImplUpgraded(oldImpl, _impl, msg.sender);
    }

    function getImplementation() public view returns (address _impl) {
        _impl = implementation;
    }

    function getFuncId(bytes4 _sig) public view returns (uint256 id) {
        id = funcIds[_sig];
    }
}