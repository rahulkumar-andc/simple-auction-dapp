const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying SimpleAuction contract with account:", deployer.address);

  const DURATION_MINUTES = 60; // 60 minutes
  const ITEM_DESCRIPTION = "Rare Digital Artwork #101";
  const STARTING_PRICE_ETH = "0.5"; // Minimum Starting Price = 0.5 ETH
  const STARTING_PRICE_WEI = hre.ethers.parseEther(STARTING_PRICE_ETH);

  const SimpleAuction = await hre.ethers.getContractFactory("SimpleAuction");
  const auction = await SimpleAuction.deploy(DURATION_MINUTES, ITEM_DESCRIPTION, STARTING_PRICE_WEI);
  await auction.waitForDeployment();

  const address = await auction.getAddress();
  console.log("--------------------------------------------------");
  console.log("SimpleAuction deployed successfully to:", address);
  console.log("Auction item:", ITEM_DESCRIPTION);
  console.log("Starting Price:", STARTING_PRICE_ETH, "ETH");
  console.log("Duration:", DURATION_MINUTES, "minutes");
  console.log("Beneficiary (Seller):", deployer.address);
  console.log("--------------------------------------------------");

  // Automatically update frontend/app.js with deployed contract address
  const fs = require("fs");
  const path = require("path");
  const appJsPath = path.join(__dirname, "../frontend/app.js");
  if (fs.existsSync(appJsPath)) {
    let content = fs.readFileSync(appJsPath, "utf8");
    content = content.replace(/const CONTRACT_ADDRESS = "0x[a-fA-F0-9]+";/, `const CONTRACT_ADDRESS = "${address}";`);
    fs.writeFileSync(appJsPath, content, "utf8");
    console.log("[Auto-Sync] Updated frontend/app.js with CONTRACT_ADDRESS:", address);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
