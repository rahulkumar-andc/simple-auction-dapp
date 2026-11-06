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
let startingPriceEth = 0.5;
let curHighestBidEth = 0;
let auctionEndTimeVal = 0;
let isEnded = false;

// DOM Elements
const connectBtn = document.getElementById("connectBtn");
const accountBadge = document.getElementById("accountBadge");
const highestBidDisplay = document.getElementById("highestBidDisplay");
const highestBidderDisplay = document.getElementById("highestBidderDisplay");
const startingPriceDisplay = document.getElementById("startingPriceDisplay");
const myRefundDisplay = document.getElementById("myRefundDisplay");
const bidAmountInput = document.getElementById("bidAmountInput");
const placeBidBtn = document.getElementById("placeBidBtn");
const withdrawBtn = document.getElementById("withdrawBtn");
const endAuctionBtn = document.getElementById("endAuctionBtn");
const winnerAnnouncement = document.getElementById("winnerAnnouncement");
const activityLog = document.getElementById("activityLog");
const clearLogBtn = document.getElementById("clearLogBtn");
const auctionStatus = document.getElementById("auctionStatus");

function logMsg(type, msg) {
  const item = document.createElement("div");
  item.className = `log-item ${type}`;
  const t = new Date().toLocaleTimeString();
  item.textContent = `[${t}] ${msg}`;
  activityLog.prepend(item);
}

clearLogBtn.addEventListener("click", () => {
  activityLog.innerHTML = '<div class="log-item system">[RESET] Log cleared.</div>';
});

// Always use active provider (MetaMask if connected, otherwise direct RPC)
function getActiveReadContract() {
  if (window.ethereum) {
    const metaMaskProvider = new ethers.BrowserProvider(window.ethereum);
    return new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, metaMaskProvider);
  }
  const fallbackProvider = new ethers.JsonRpcProvider(HARDHAT_RPC);
  return new ethers.Contract(CONTRACT_ADDRESS, AUCTION_ABI, fallbackProvider);
}

// Real-Time Dynamic Sync function (Pulls live from blockchain)
async function syncBlockchainData() {
  try {
    const liveContract = getActiveReadContract();

    const [hBid, hBidder, startP, seller, endTime, ended] = await Promise.all([
      liveContract.highestBid(),
      liveContract.highestBidder(),
      liveContract.startingPrice(),
      liveContract.beneficiary(),
      liveContract.auctionEndTime(),
      liveContract.ended()
    ]);

    sellerAddress = seller;
    auctionEndTimeVal = Number(endTime);
    isEnded = ended;
    startingPriceEth = parseFloat(ethers.formatEther(startP));
    curHighestBidEth = parseFloat(ethers.formatEther(hBid));

    if (startingPriceDisplay) {
      startingPriceDisplay.textContent = `${startingPriceEth.toFixed(4)} ETH`;
    }

    if (curHighestBidEth === 0) {
      highestBidDisplay.textContent = "No bids yet";
    } else {
      highestBidDisplay.textContent = `${curHighestBidEth.toFixed(4)} ETH`;
    }

    if (hBidder === ethers.ZeroAddress) {
      highestBidderDisplay.textContent = "None";
    } else {
      const isMe = userAddress && hBidder.toLowerCase() === userAddress.toLowerCase();
      highestBidderDisplay.textContent = `${hBidder.slice(0, 6)}...${hBidder.slice(-4)}${isMe ? " (You)" : ""}`;
    }

    if (ended) {
      auctionStatus.textContent = "Ended";
      auctionStatus.className = "stat-value";
      auctionStatus.style.color = "#dc2626";
      winnerAnnouncement.innerHTML = `🏆 <strong>Auction Finished!</strong><br>Winner: ${hBidder}<br>Winning Bid: <strong>${curHighestBidEth} ETH</strong>`;
      winnerAnnouncement.className = "winner-box show";
      placeBidBtn.disabled = true;
    } else {
      auctionStatus.textContent = "Active";
      auctionStatus.className = "stat-value status-active";
    }

    // Dynamic user refund tracking for connected wallet
    if (userAddress) {
      const myRefundWei = await liveContract.pendingReturns(userAddress);
      const myRefundEth = ethers.formatEther(myRefundWei);
      myRefundDisplay.textContent = `${parseFloat(myRefundEth).toFixed(4)} ETH`;
      withdrawBtn.disabled = myRefundWei === 0n;
    } else {
      myRefundDisplay.textContent = "0.0000 ETH";
      withdrawBtn.disabled = true;
    }

    // Dynamic seller status alert in sidebar
    const sellerStatusAlert = document.getElementById("sellerStatusAlert");
    if (sellerStatusAlert) {
      if (!userAddress) {
        sellerStatusAlert.style.background = "#fef3c7";
        sellerStatusAlert.style.color = "#92400e";
        sellerStatusAlert.style.borderColor = "#fde68a";
        sellerStatusAlert.innerHTML = "⚠️ Connect seller wallet to finalize auction.";
      } else if (userAddress.toLowerCase() === sellerAddress?.toLowerCase()) {
        sellerStatusAlert.style.background = "#dcfce7";
        sellerStatusAlert.style.color = "#166534";
        sellerStatusAlert.style.borderColor = "#bbf7d0";
        sellerStatusAlert.innerHTML = `✅ <strong>Seller Verified:</strong> You can finalize & withdraw.`;
      } else {
        sellerStatusAlert.style.background = "#f1f5f9";
        sellerStatusAlert.style.color = "#64748b";
        sellerStatusAlert.style.borderColor = "#e2e8f0";
        sellerStatusAlert.innerHTML = `🔒 <strong>Bidder Mode:</strong> Only seller can settle.`;
      }
    }
  } catch (e) {
    console.error("Dynamic sync error:", e);
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask to interact with this Ethereum dApp!");
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
    await syncBlockchainData();
  } catch (err) {
    logMsg("warning", `Wallet connection failed: ${err.message}`);
  }
}

connectBtn.addEventListener("click", connectWallet);

// Real on-chain bid submission
placeBidBtn.addEventListener("click", async () => {
  if (!signer || !contract) {
    alert("⚠️ Please connect your MetaMask wallet first!");
    return;
  }

  const val = parseFloat(bidAmountInput.value);

  if (!val || val <= 0) {
    alert("❌ Invalid Bid: Bid amount must be strictly greater than 0 ETH!");
    return;
  }

  if (val < startingPriceEth) {
    alert(`❌ Bid Rejected: Minimum starting price is ${startingPriceEth} ETH.`);
    return;
  }

  if (val <= curHighestBidEth) {
    alert(`❌ Bid Rejected: Your bid (${val} ETH) must be strictly HIGHER than the current highest bid (${curHighestBidEth} ETH)!`);
    return;
  }

  try {
    logMsg("system", `Broadcasting bid of ${val} ETH to Ethereum...`);
    const tx = await contract.bid({ value: ethers.parseEther(val.toString()) });
    logMsg("system", `Tx Hash: ${tx.hash.slice(0, 10)}... (Waiting for block confirmation)`);

    await tx.wait();
    logMsg("success", `✅ Confirmed on Block! You are now the leading bidder with ${val} ETH.`);
    bidAmountInput.value = "";
    await syncBlockchainData();
  } catch (e) {
    const reason = e.reason || e.message;
    logMsg("warning", `Smart contract rejected: ${reason}`);
  }
});

// Real on-chain withdraw
withdrawBtn.addEventListener("click", async () => {
  if (!signer || !contract) {
    alert("Please connect MetaMask first!");
    return;
  }

  try {
    logMsg("system", "Withdrawing outbid refund via Pull Pattern...");
    const tx = await contract.withdraw();
    await tx.wait();
    logMsg("success", "💰 Refund successfully transferred to your wallet!");
    await syncBlockchainData();
  } catch (e) {
    logMsg("warning", `Withdrawal error: ${e.reason || e.message}`);
  }
});

// Real on-chain finalize
endAuctionBtn.addEventListener("click", async () => {
  if (!signer || !contract) {
    alert("Please connect MetaMask wallet first!");
    return;
  }

  if (userAddress.toLowerCase() !== sellerAddress.toLowerCase()) {
    alert(`⛔ Access Denied: Only the auction seller (${sellerAddress.slice(0, 6)}...${sellerAddress.slice(-4)}) can finalize this auction!`);
    logMsg("warning", `Unauthorized attempt: Only seller can finalize.`);
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now < auctionEndTimeVal) {
    const minsLeft = Math.ceil((auctionEndTimeVal - now) / 60);
    alert(`⏳ Auction is still active! ${minsLeft} minutes remaining before settlement is allowed.`);
    logMsg("warning", `Cannot finalize yet: ${minsLeft} minutes remaining.`);
    return;
  }

  try {
    logMsg("system", "Seller finalizing auction on blockchain...");
    const tx = await contract.auctionEnd();
    await tx.wait();
    logMsg("success", "🏁 Auction finalized! Winning ETH transferred to seller.");
    if (window.confetti) confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    await syncBlockchainData();
  } catch (e) {
    logMsg("warning", `Finalize error: ${e.reason || e.message}`);
  }
});

// Dynamic Event Listeners & Auto-Sync
if (window.ethereum) {
  window.ethereum.on("accountsChanged", async () => {
    await connectWallet();
  });
  window.ethereum.on("chainChanged", async () => {
    await syncBlockchainData();
  });

  // Auto-connect if already authorized in MetaMask
  window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
    if (accs.length > 0) {
      connectWallet();
    } else {
      syncBlockchainData();
    }
  });
}

// Real-time automatic polling every 2 seconds
setInterval(syncBlockchainData, 2000);

// Initial call
syncBlockchainData();
