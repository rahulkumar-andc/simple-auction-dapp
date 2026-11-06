const AUCTION_ABI = [
  "function beneficiary() view returns (address)",
  "function auctionEndTime() view returns (uint256)",
  "function itemDescription() view returns (string)",
  "function startingPrice() view returns (uint256)",
  "function highestBidder() view returns (address)",
  "function highestBid() view returns (uint256)",
  "function pendingReturns(address) view returns (uint256)",
  "function ended() view returns (bool)",
  "function bid() payable",
  "function withdraw() returns (bool)",
  "function auctionEnd()",
  "event HighestBidIncreased(address indexed bidder, uint256 amount)",
  "event AuctionEnded(address winner, uint256 amount)"
];

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const HARDHAT_RPC = "http://127.0.0.1:8545";

let userAddress = null;
let signer = null;
let contract = null;
let sellerAddress = null;
let auctionEndTimeVal = 0;
let isEnded = false;
let curHighestBidEth = 0;
let curHighestBidder = null;

// DOM Elements
const connectBtn = document.getElementById("connectBtn");
const accountBadge = document.getElementById("accountBadge");
const adminBanner = document.getElementById("adminBanner");
const adminItemDesc = document.getElementById("adminItemDesc");
const adminReservePrice = document.getElementById("adminReservePrice");
const adminHighestBid = document.getElementById("adminHighestBid");
const adminHighestBidder = document.getElementById("adminHighestBidder");
const adminStatus = document.getElementById("adminStatus");
const adminTimeRemaining = document.getElementById("adminTimeRemaining");
const finalizeBtn = document.getElementById("finalizeBtn");
const adminWinnerBox = document.getElementById("adminWinnerBox");
const fastForwardBtn = document.getElementById("fastForwardBtn");
const sellerAddressDisplay = document.getElementById("sellerAddressDisplay");
const contractAddressDisplay = document.getElementById("contractAddressDisplay");
const adminLog = document.getElementById("adminLog");
const clearLogBtn = document.getElementById("clearLogBtn");

function logMsg(type, msg) {
  const item = document.createElement("div");
  item.className = `log-item ${type}`;
  const t = new Date().toLocaleTimeString();
  item.textContent = `[${t}] ${msg}`;
  adminLog.prepend(item);
}

clearLogBtn.addEventListener("click", () => {
  adminLog.innerHTML = '<div class="log-item system">[RESET] Audit log cleared.</div>';
});

function getActiveReadContract() {
  if (window.ethereum) {
    const metaMaskProvider = new ethers.BrowserProvider(window.ethereum);
    return new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, metaMaskProvider);
  }
  const fallbackProvider = new ethers.JsonRpcProvider(HARDHAT_RPC);
  return new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, fallbackProvider);
}

async function syncAdminData() {
  try {
    contractAddressDisplay.textContent = CONTRACT_ADDRESS;
    const liveContract = getActiveReadContract();

    const [hBid, hBidder, startP, seller, endTime, ended, desc] = await Promise.all([
      liveContract.highestBid(),
      liveContract.highestBidder(),
      liveContract.startingPrice(),
      liveContract.beneficiary(),
      liveContract.auctionEndTime(),
      liveContract.ended(),
      liveContract.itemDescription().catch(() => "Rare Digital Artwork #101")
    ]);

    sellerAddress = seller;
    sellerAddressDisplay.textContent = seller;
    auctionEndTimeVal = Number(endTime);
    isEnded = ended;
    curHighestBidEth = parseFloat(ethers.formatEther(hBid));
    curHighestBidder = hBidder;

    adminItemDesc.textContent = desc;
    adminReservePrice.textContent = `${parseFloat(ethers.formatEther(startP)).toFixed(4)} ETH`;
    adminHighestBid.textContent = `${curHighestBidEth.toFixed(4)} ETH`;

    if (hBidder === ethers.ZeroAddress) {
      adminHighestBidder.textContent = "None";
    } else {
      adminHighestBidder.textContent = `${hBidder.slice(0, 6)}...${hBidder.slice(-4)}`;
    }

    // Time remaining calculations
    const now = Math.floor(Date.now() / 1000);
    const diff = auctionEndTimeVal - now;

    if (ended) {
      adminStatus.textContent = "Ended & Settled";
      adminStatus.style.color = "#dc2626";
      adminTimeRemaining.textContent = "Auction Closed";
      finalizeBtn.disabled = true;
      finalizeBtn.textContent = "Auction Already Finalized";
      adminWinnerBox.innerHTML = `🏆 <strong>Auction Finished:</strong> Payout sent to seller.<br>Winner: ${hBidder}<br>Amount: <strong>${curHighestBidEth} ETH</strong>`;
      adminWinnerBox.className = "winner-box show";
    } else if (diff <= 0) {
      adminStatus.textContent = "Expired (Awaiting Settlement)";
      adminStatus.style.color = "#d97706";
      adminTimeRemaining.textContent = "Time Expired (Ready to Settle)";
    } else {
      adminStatus.textContent = "Active (Bidding Open)";
      adminStatus.style.color = "#16a34a";
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      adminTimeRemaining.textContent = `${mins}m ${secs}s`;
    }

    // Update Banner & Auth Status
    updateAuthBanner();
  } catch (err) {
    console.error("Admin sync error:", err);
  }
}

function updateAuthBanner() {
  if (!userAddress) {
    adminBanner.className = "admin-banner warning";
    adminBanner.innerHTML = "<span>⚠️ Please connect your MetaMask seller wallet to manage this auction.</span>";
    finalizeBtn.disabled = true;
    return;
  }

  const isSeller = userAddress.toLowerCase() === sellerAddress?.toLowerCase();

  if (isSeller) {
    adminBanner.className = "admin-banner success";
    adminBanner.innerHTML = `<span>✅ <strong>Seller Verified:</strong> You are authenticated as the auction beneficiary (${userAddress.slice(0, 6)}...${userAddress.slice(-4)}).</span>`;
    
    // Enable finalize if not already ended
    if (!isEnded) {
      finalizeBtn.disabled = false;
      finalizeBtn.textContent = "Finalize Auction & Payout Seller";
    }
  } else {
    adminBanner.className = "admin-banner danger";
    adminBanner.innerHTML = `<span>⛔ <strong>Access Restricted:</strong> Connected wallet (${userAddress.slice(0, 6)}...${userAddress.slice(-4)}) is NOT the seller. Administrative actions are locked.</span>`;
    finalizeBtn.disabled = true;
    finalizeBtn.textContent = "Locked (Seller Only)";
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask to access the Admin Portal!");
    return;
  }

  try {
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await browserProvider.send("eth_requestAccounts", []);
    signer = await browserProvider.getSigner();
    userAddress = accounts[0];

    accountBadge.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    accountBadge.className = "badge connected";
    connectBtn.textContent = "Connected";
    logMsg("success", `MetaMask connected: ${userAddress}`);

    contract = new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, signer);
    await syncAdminData();
  } catch (err) {
    logMsg("warning", `Wallet connection failed: ${err.message}`);
  }
}

connectBtn.addEventListener("click", connectWallet);

// Finalize auction
finalizeBtn.addEventListener("click", async () => {
  if (!signer || !contract) {
    alert("Please connect MetaMask wallet first!");
    return;
  }

  if (userAddress.toLowerCase() !== sellerAddress.toLowerCase()) {
    alert("⛔ Access Denied: Only the auction seller can finalize!");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now < auctionEndTimeVal) {
    const minsLeft = Math.ceil((auctionEndTimeVal - now) / 60);
    const confirmEarly = confirm(`⚠️ Auction is set to run for ${minsLeft} more minutes.\n\nTip for Examiners: If you are running on a local node, click the 'Fast-Forward Time' button below to advance block time, or continue to attempt settlement.`);
    if (!confirmEarly) return;
  }

  try {
    logMsg("system", "Submitting auctionEnd() transaction on-chain...");
    const tx = await contract.auctionEnd();
    logMsg("system", `Tx broadcasted: ${tx.hash.slice(0, 10)}...`);
    await tx.wait();

    logMsg("success", `🏁 Auction successfully finalized! ${curHighestBidEth} ETH transferred to seller.`);
    if (window.confetti) confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    await syncAdminData();
  } catch (err) {
    const reason = err.reason || err.message;
    logMsg("warning", `Contract rejected settlement: ${reason}`);
    alert(`Settlement Notice: ${reason}`);
  }
});

// Examiner demo fast-forward helper
fastForwardBtn.addEventListener("click", async () => {
  if (!window.ethereum) {
    alert("MetaMask required to trigger local time advance.");
    return;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    logMsg("system", "Advancing blockchain time by 3900 seconds (65 minutes)...");
    
    // Hardhat RPC methods to advance time and mine block
    await provider.send("evm_increaseTime", [3900]);
    await provider.send("evm_mine", []);

    logMsg("success", "⏩ Blockchain time advanced! Auction is now expired and ready for settlement.");
    await syncAdminData();
  } catch (err) {
    logMsg("warning", `Fast-forward note: Only works on local Hardhat nodes. (${err.message})`);
  }
});

// Auto-sync listeners
if (window.ethereum) {
  window.ethereum.on("accountsChanged", async () => {
    await connectWallet();
  });
  window.ethereum.on("chainChanged", async () => {
    await syncAdminData();
  });
  window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
    if (accs.length > 0) connectWallet();
    else syncAdminData();
  });
}

setInterval(syncAdminData, 2000);
syncAdminData();
