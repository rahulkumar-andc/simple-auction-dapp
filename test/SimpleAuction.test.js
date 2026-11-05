const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("🔨 SimpleAuction Smart Contract Unit Tests", function () {
  let auction;
  let seller, bidder1, bidder2, bidder3;
  const DURATION_MINUTES = 10;
  const ITEM_NAME = "Rolex Submariner #007";
  const STARTING_PRICE = ethers.parseEther("0.5");

  beforeEach(async function () {
    [seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

    const SimpleAuction = await ethers.getContractFactory("SimpleAuction");
    auction = await SimpleAuction.connect(seller).deploy(DURATION_MINUTES, ITEM_NAME, STARTING_PRICE);
    await auction.waitForDeployment();
  });

  it("1. Should deduct EXACT bid amount from bidder wallet into contract escrow", async function () {
    const bidAmount = ethers.parseEther("1.0");
    const contractAddr = await auction.getAddress();

    const bidderBalanceBefore = await ethers.provider.getBalance(bidder1.address);
    const tx = await auction.connect(bidder1).bid({ value: bidAmount });
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const bidderBalanceAfter = await ethers.provider.getBalance(bidder1.address);

    // Exact deduction: BalanceAfter = BalanceBefore - bidAmount - gas
    expect(bidderBalanceAfter).to.equal(bidderBalanceBefore - bidAmount - gasUsed);
    // Contract holds exact funds in escrow
    expect(await ethers.provider.getBalance(contractAddr)).to.equal(bidAmount);
  });

  it("2. Current WINNING bidder CANNOT withdraw their active bid", async function () {
    await auction.connect(bidder1).bid({ value: ethers.parseEther("1.0") });

    // Bidder 1 is current winner, attempts withdraw -> MUST BE REVERTED
    await expect(auction.connect(bidder1).withdraw()).to.be.revertedWith(
      "Winning highest bidder cannot refund their active bid!"
    );
  });

  it("3. ONLY outbid users can withdraw their refund", async function () {
    await auction.connect(bidder1).bid({ value: ethers.parseEther("1.0") });
    // Bidder 2 outbids Bidder 1
    await auction.connect(bidder2).bid({ value: ethers.parseEther("2.0") });

    // Now Bidder 1 is outbid, can withdraw
    const tx = await auction.connect(bidder1).withdraw();
    await tx.wait();
    expect(await auction.pendingReturns(bidder1.address)).to.equal(0);

    // Bidder 2 is new winner, STILL CANNOT withdraw
    await expect(auction.connect(bidder2).withdraw()).to.be.revertedWith(
      "Winning highest bidder cannot refund their active bid!"
    );
  });

  it("4. Should transfer exact winning bid to seller on finalization", async function () {
    const winningBid = ethers.parseEther("3.0");
    await auction.connect(bidder1).bid({ value: winningBid });

    await time.increase(DURATION_MINUTES * 60 + 1);

    const sellerBefore = await ethers.provider.getBalance(seller.address);
    const tx = await auction.connect(seller).auctionEnd();
    const receipt = await tx.wait();
    const gas = receipt.gasUsed * receipt.gasPrice;
    const sellerAfter = await ethers.provider.getBalance(seller.address);

    expect(sellerAfter).to.equal(sellerBefore + winningBid - gas);
  });
});
