const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getSelectors } = require("../scripts/utils");

describe("Minimal Clone Proxy", () => {

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const NO_PERMISSION_ERR = "no permission for this call";
  const FEATURE_SET1 = 0b1010;  // 1010 => testNumber: true, func13: false, func12: true,  func11: false
  const FEATURE_SET2 = 0b1100;  // 1100 => testNumber: true, func23: true,  func22: false, func21: false

  describe("Implementation v1", () => {
    let testImplV1;
    
    before(async () => {
      const TestImplV1 = await ethers.getContractFactory("TestImplV1");
      testImplV1 = await (await TestImplV1.deploy()).deployed();
    });

    it("Deploy", async () => {
      expect(testImplV1.address).to.not.equal(ZERO_ADDRESS);

      expect(await testImplV1.testNumber()).to.equal(0);
    });

    it("Test Functionality", async () => {
      const tx1 = await (await testImplV1.func11()).wait();

      expect(await tx1.status).to.equal(1);

      expect(await testImplV1.testNumber()).to.equal(1);

      const tx2 = await (await testImplV1.func12()).wait();

      expect(await tx2.status).to.equal(1);

      expect(await testImplV1.testNumber()).to.equal(2);

      const tx3 = await (await testImplV1.func13()).wait();

      expect(await tx3.status).to.equal(1);

      expect(await testImplV1.testNumber()).to.equal(3);
    });
  });

  describe("Clone Factory contract", () => {
    let testImplV1;
    let cloneFactory;
    let selectors;

    before(async () => {  
      const TestImplV1 = await ethers.getContractFactory("TestImplV1");
      testImplV1 = await (await TestImplV1.deploy()).deployed();
  
      selectors = getSelectors(testImplV1);
  
      const CloneFactory = await ethers.getContractFactory("CloneFactory");
      cloneFactory = await (await CloneFactory.deploy(testImplV1.address, selectors)).deployed();
    })

    it("Deploy", async () => {
      expect(cloneFactory.address).to.not.equal(ZERO_ADDRESS);

      for (let i = 0; i < selectors.length; i ++) {
        const id = await cloneFactory.getFuncId(selectors[i]);
        expect(id).to.equal(i+1);
      }
    });

    it("Clone Upgradable Proxy Contract", async () => {
      const { status } = await (await cloneFactory.clone(FEATURE_SET1)).wait();
      expect(status).to.equal(1);
    });
  });

  describe("Implementation V1 Clone", () => {
    let cloneFactory;
    let selectors;
    let proxy;
    let proxyAddr1;

    before(async () => {  
      const TestImplV1 = await ethers.getContractFactory("TestImplV1");
      testImplV1 = await (await TestImplV1.deploy()).deployed();

      selectors = getSelectors(testImplV1);

      const CloneFactory = await ethers.getContractFactory("CloneFactory");
      cloneFactory = await (await CloneFactory.deploy(testImplV1.address, selectors)).deployed();

      const { events } = await (await cloneFactory.clone(FEATURE_SET1)).wait();
      proxyAddr1 = events[0].args.proxy;

      proxy = await ethers.getContractAt("TestImplV1", proxyAddr1);
    });
    
    it("Calling func11 should be reverted", async () => {


      await expect(proxy.func11()).to.be.revertedWith(NO_PERMISSION_ERR);
      // expect(await proxy.factory()).to.equal(cloneFactory.address);
    });

    it("Calling func12 should be success", async () => {
      const { status } = await (await proxy.func12()).wait();

      expect(status).to.equal(1);

      expect(await proxy.testNumber()).to.equal(2);
    });
  });

  describe("Implementation v2", () => {
    let cloneFactory;
    let selectors;
    let proxy;
    let proxyAddr1;
    let testImplV2;

    before(async () => {
      const TestImplV1 = await ethers.getContractFactory("TestImplV1");
      testImplV1 = await (await TestImplV1.deploy()).deployed();

      selectors = getSelectors(testImplV1);

      const CloneFactory = await ethers.getContractFactory("CloneFactory");
      cloneFactory = await (await CloneFactory.deploy(testImplV1.address, selectors)).deployed();

      const { events } = await (await cloneFactory.clone(FEATURE_SET1)).wait();
      proxyAddr1 = events[0].args.proxy;

      proxy = await ethers.getContractAt("TestImplV1", proxyAddr1);
      
      const TestImplV2 = await ethers.getContractFactory("TestImplV2");
      testImplV2 = await (await TestImplV2.deploy()).deployed();
    });

    it("Deploy", async () => {
      expect(testImplV2.address).to.not.equal(ZERO_ADDRESS);

      expect(await testImplV2.testNumber()).to.equal(0);
    });

    it("Upgrade UpgradeableProxy to Implementation V2", async () => {
      const selectors2 = getSelectors(testImplV2);

      await (await cloneFactory.upgradeImplementation(testImplV2.address, selectors2));

      expect(await cloneFactory.getImplementation()).to.equal(testImplV2.address);
    })
  });

  describe("Implementation V2 Clone", () => {
    let cloneFactory;
    let selectors;
    let proxy;
    let proxyAddr1;
    let testImplV2;

    before(async () => {  
      const TestImplV1 = await ethers.getContractFactory("TestImplV1");
      testImplV1 = await (await TestImplV1.deploy()).deployed();

      selectors = getSelectors(testImplV1);

      const CloneFactory = await ethers.getContractFactory("CloneFactory");
      cloneFactory = await (await CloneFactory.deploy(testImplV1.address, selectors)).deployed();

      const { events } = await (await cloneFactory.clone(FEATURE_SET1)).wait();
      proxyAddr1 = events[0].args.proxy;

      proxy = await ethers.getContractAt("TestImplV1", proxyAddr1);
      
      const TestImplV2 = await ethers.getContractFactory("TestImplV2");
      testImplV2 = await (await TestImplV2.deploy()).deployed();

      const selectors2 = getSelectors(testImplV2);

      await (await cloneFactory.upgradeImplementation(testImplV2.address, selectors2)).wait();

      await (await cloneFactory.updateFeatureSet(proxyAddr1, FEATURE_SET2)).wait();

      proxy = await ethers.getContractAt("TestImplV2", proxyAddr1);
    });

    it("Calling func21 should be reverted", async () => {
      await expect(proxy.func21()).to.be.revertedWith(NO_PERMISSION_ERR);
    });

    it("Calling func22 should be reverted", async () => {
      await expect(proxy.func22()).to.be.revertedWith(NO_PERMISSION_ERR);
    });

    it("Calling func23 should be success", async () => {
      const { status } = await (await proxy.func23()).wait();

      expect(status).to.equal(1);

      expect(await proxy.testNumber()).to.equal(3);
    });
  });

  describe("Implementation Multi-Cloning", () => {
    let cloneFactory;
    let selectors;
    let proxy1;
    let proxy2;
    let proxyAddr1;
    let proxyAddr2;

    before(async () => {  
      const TestImplV1 = await ethers.getContractFactory("TestImplV1");
      testImplV1 = await (await TestImplV1.deploy()).deployed();

      selectors = getSelectors(testImplV1);

      const CloneFactory = await ethers.getContractFactory("CloneFactory");
      cloneFactory = await (await CloneFactory.deploy(testImplV1.address, selectors)).deployed();

      const tx1 = await (await cloneFactory.clone(FEATURE_SET1)).wait();
      proxyAddr1 = tx1.events[0].args.proxy;

      proxy1 = await ethers.getContractAt("TestImplV1", proxyAddr1);

      const tx2 = await (await cloneFactory.clone(FEATURE_SET2)).wait();
      proxyAddr2 = tx2.events[0].args.proxy;

      proxy2 = await ethers.getContractAt("TestImplV1", proxyAddr2);
    });

    it("Proxies should have their own storages respectively", async () => {
      const tx1 = await (await proxy1.func12()).wait();

      expect(tx1.status).to.equal(1);

      const tx2 = await (await proxy2.func13()).wait();

      expect(tx2.status).to.equal(1);

      expect(await proxy1.testNumber()).to.equal(2);
      expect(await proxy2.testNumber()).to.equal(3);
    });
  });
});
