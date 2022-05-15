const { ethers } = require("hardhat");
const { getSelectors } = require("./utils");

async function main() {
  const FEATURE_SET1 = 0b1010;
  const FEATURE_SET2 = 0b1100;

  const TestImplV1 = await ethers.getContractFactory("TestImplV1");
  const testImplV1 = await (await TestImplV1.deploy()).deployed();

  console.log("TestImplV1 deployed to:", testImplV1.address);

  const selectors1 = getSelectors(testImplV1);

  const CloneFactory = await ethers.getContractFactory("CloneFactory");
  const cloneFactory = await (await CloneFactory.deploy(testImplV1.address, selectors1)).deployed();

  console.log("CloneFactory deployed to:", cloneFactory.address);

  const { events } = await (await cloneFactory.clone(FEATURE_SET1)).wait();
  const proxyAddr = events[0].args.proxy;

  console.log("Proxy deployed to:", proxyAddr);

  const TestImplV2 = await ethers.getContractFactory("TestImplV2");
  const testImplV2 = await (await TestImplV2.deploy()).deployed();

  console.log("TestImplV2 deployed to:", testImplV2.address);

  const selectors2 = getSelectors(TestImplV2);

  await (await cloneFactory.upgradeImplementation(testImplV2.address, selectors2)).wait();

  await (await cloneFactory.updateFeatureSet(proxyAddr, FEATURE_SET2)).wait();

  console.log("Implementation upgraded to:", testImplV2.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
