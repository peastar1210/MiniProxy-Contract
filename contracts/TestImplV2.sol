//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract TestImplV2 {
    uint256 public testNumber;

    constructor() {
        testNumber = 0;
    }

    function func21() external {
        testNumber = 1;
    }

    function func22() external {
        testNumber = 2;
    }

    function func23() external {
        testNumber = 3;
    }
}