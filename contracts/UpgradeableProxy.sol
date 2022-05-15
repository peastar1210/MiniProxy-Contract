//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./CloneFactory.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract UpgradeableProxy is Proxy, Initializable {
    uint256 public featureSet;
    CloneFactory public factory;

    event FeatureSetUpdated(uint256 indexed newFeatureSet);

    modifier onlyFactory() {
        require(msg.sender == address(factory), "caller is not factory");
        _;
    }

    function setUp(uint256 _featureSet, address _factory) external initializer {
        featureSet = _featureSet;
        factory = CloneFactory(_factory);

        emit FeatureSetUpdated(featureSet);
    }

    function updateFeatureSet(uint256 _featureSet) onlyFactory external {
        featureSet = _featureSet;

        emit FeatureSetUpdated(featureSet);
    }

    function _implementation() internal view override returns (address) {
        return factory.getImplementation();
    }

    function _beforeFallback() internal view override {
        bytes4 sig;

        assembly {
            let _sig := mload(0x40)
            calldatacopy(_sig, 0, 4)
            sig := mload(_sig)
        }

        uint256 id = factory.getFuncId(sig);

        require(id > 0, "no function in the contract");

        uint256 flag = (featureSet >> (id - 1)) & 1;

        require(flag == 1, "no permission for this call");
    }
}
