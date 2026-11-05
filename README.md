# 🔨 Simple Auction Smart Contract (Ethereum)

A clean, minimalist, and secure Decentralized English Auction system built with Solidity, Ethers.js, and Remix IDE.

**Academic Project by:**
1. **Rahul Kumar**
2. **Shubham Yadav**

---

## 📌 Project Overview
In a traditional auction, intermediaries charge high fees (10-25%), and buyers face custodial risks. 
This project deploys an autonomous smart contract on Ethereum that acts as an automated escrow:
- Anyone can place an ETH bid higher than the current highest bid (`bid()`).
- Previous bidders can withdraw their refunded ETH safely (`withdraw()`).
- When the timer ends, the seller receives the winning amount, and the highest bidder wins the item (`auctionEnd()`).

---

## 🛡️ Key Security Concept: Pull-over-Push Payments
Instead of the contract automatically pushing refunds to outbid users, the contract marks their balance in `pendingReturns[bidder]`. 
Users pull (withdraw) their own funds. This completely eliminates **Reentrancy Attacks** and **Denial of Service (DoS)** vulnerabilities.

---

## ⚡ How to Run Live on Remix IDE (2 Minutes Viva Demo)

1. Open **[https://remix.ethereum.org](https://remix.ethereum.org)**.
2. In File Explorer, create `SimpleAuction.sol` and paste the code from `contracts/SimpleAuction.sol`.
3. In **Solidity Compiler** tab, compile with version `0.8.20`.
4. In **Deploy & Run Transactions** tab:
   - Environment: `Remix VM (Cancun)`.
   - Pass constructor parameters:
     - `biddingTimeInMinutes`: `10`
     - `_itemDescription`: `"Rolex Watch #01"`
   - Click **Deploy**.
5. **Testing Functions:**
   - **Account 2:** Set `Value` = `1 Ether`, click `bid()`. (Highest bid = 1 ETH).
   - **Account 3:** Set `Value` = `2 Ether`, click `bid()`. (Account 3 takes lead).
   - **Account 2:** Call `pendingReturns()` -> see 1 ETH. Click `withdraw()` -> gets 1 ETH refund!
   - **End:** Call `auctionEnd()` after time expires to settle funds to the seller.

---

## 📁 Files Included

- `contracts/SimpleAuction.sol` - 55 lines clean smart contract.
- `frontend/` - Clean, minimal light-theme web dashboard (`index.html`, `style.css`, `app.js`).
- `Simple_Auction_Presentation.pdf` - 8 Slides minimal presentation.
- `Simple_Auction_Presentation.pptx` - Editable presentation file.
