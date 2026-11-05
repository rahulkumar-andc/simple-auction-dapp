// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleAuction
 * @dev Decentralized English Auction smart contract on Ethereum.
 * Evaluator / College Project: Rahul Kumar & Shubham Yadav
 */
contract SimpleAuction {
    address payable public immutable beneficiary; // Seller who receives highest bid
    uint256 public immutable auctionEndTime;       // Timestamp when auction ends
    string public itemDescription;                 // Name of item being auctioned
    uint256 public immutable startingPrice;        // Minimum base price set by seller

    address public highestBidder;
    uint256 public highestBid;

    // Allowed withdrawals of previous bids (Pull over Push security pattern)
    mapping(address => uint256) public pendingReturns;

    bool public ended;

    event HighestBidIncreased(address indexed bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);

    modifier onlySeller() {
        require(msg.sender == beneficiary, "Only the auction seller (beneficiary) can finalize");
        _;
    }

    constructor(
        uint256 biddingTimeInMinutes,
        string memory _itemDescription,
        uint256 _startingPriceWei
    ) {
        beneficiary = payable(msg.sender);
        auctionEndTime = block.timestamp + (biddingTimeInMinutes * 1 minutes);
        itemDescription = _itemDescription;
        startingPrice = _startingPriceWei;
    }

    /// @notice Place a bid with ETH.
    /// Rules:
    /// 1. Must be positive (> 0)
    /// 2. Must be at least startingPrice
    /// 3. Must be strictly higher than current highestBid
    /// Exact amount msg.value is deducted from bidder wallet and held in contract escrow.
    function bid() external payable {
        require(block.timestamp < auctionEndTime, "Auction has already ended");
        require(msg.value > 0, "Bid amount must be strictly positive");
        require(msg.value >= startingPrice, "Bid cannot be lower than the starting price");
        require(msg.value > highestBid, "Bid must be strictly higher than current highest bid");

        if (highestBidder != address(0)) {
            // ONLY the outbid user gets their funds moved to refundable balance
            pendingReturns[highestBidder] += highestBid;
        }

        // Current leader funds are LOCKED in escrow. They receive 0 refund while leading.
        highestBidder = msg.sender;
        highestBid = msg.value;
        emit HighestBidIncreased(msg.sender, msg.value);
    }

    /// @notice Outbid users withdraw their previous bids.
    /// Explicit Rule: Current winning/highest bidder can NEVER withdraw their active bid.
    function withdraw() external returns (bool) {
        require(msg.sender != highestBidder, "Winning highest bidder cannot refund their active bid!");

        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No funds to withdraw");

        pendingReturns[msg.sender] = 0;

        if (!payable(msg.sender).send(amount)) {
            pendingReturns[msg.sender] = amount;
            return false;
        }
        return true;
    }

    /// @notice End the auction and send highest bid to seller (Only Seller allowed)
    function auctionEnd() external onlySeller {
        require(block.timestamp >= auctionEndTime, "Auction has not ended yet");
        require(!ended, "auctionEnd has already been called");

        ended = true;
        emit AuctionEnded(highestBidder, highestBid);

        if (highestBidder != address(0)) {
            beneficiary.transfer(highestBid);
        }
    }
}
