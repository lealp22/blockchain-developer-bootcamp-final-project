// SPDX-License-Identifier: MIT
pragma solidity >=0.8.5 <0.9.0;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DeferredTransfers
 * @dev Given an amount of ethers deposited in this contract, it will be sent in parts to a given address automatically.
 * It will be necessary the participation of between two and ten additional addresses so that they will be in charge of authorize any change proposal
 * related to the initially established distribution.
 */
contract DeferredTransfers is Pausable, AccessControl {

    /* Roles definition */
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant PARTICIPANT_ROLE = keccak256("PARTICIPANT_ROLE");


    /* Changed to 2 for testing purpose */
    //uint public constant BLOCKS_PER_MONTH = 192000;
    uint public constant BLOCKS_PER_MONTH = 2;

    /**
     *  Partial transfers will be sent weekly
     **/
    enum ParticipantStatus{
        NOT_USED,
        PENDING,
        APPROVED,
        ACTIVE
    }

    struct ParticipantDetails {
        address participantAddress;
        ParticipantStatus participantStatus;
    }

    struct Request {
        address payable requester;
        address payable beneficiary;
        uint amountToSend;
        uint numInitialBlock;
        uint nextBlockControl;
        uint numPeriods;
        uint numRemainingPeriods;
        bool isApproved;
        uint numParticipants;
        ParticipantDetails[] participants;
    }

    struct CancelProposal {
        uint requestId;
        uint numParticipants;
        uint numParticipantsAccepted;
        ParticipantDetails[] participants;
        bool isAccepted;
    }

    struct PartialTransfer {
      uint partAmount;
      address payable partBeneficiary;
    }

    uint public countRequests;
    uint public countCancelProposals;
    uint public countPartialTransfers;

    PartialTransfer[] partialTransfers;

    mapping (uint => Request) public requestsDetails;
    mapping (uint => CancelProposal) public cancelProposals;
    mapping (address => uint) public pendingWithdrawals;

    event requestCreated(address indexed requester, uint requestId);
    event participantApproved(address indexed requester, uint requestId, address indexed participant);
    event requestApproved(address indexed requester, uint requestId, address indexed participant);
    event pendingWithdrawal(address indexed requester, uint requestId, uint amount);
    event withdrawalSent(address indexed requester, uint amount);
    event proposalCreated(address indexed proposer, uint proposalId, uint requestId);
    event participantProposalAccepted(address indexed participant, uint indexed requestId, uint proposalId);
    event proposalAccepted(uint indexed requestId, uint proposalId);
    event installmentSent(address indexed beneficiary, uint amount);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
        countRequests = 0;
        countCancelProposals = 0;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // How many months from now will start the
    function createRequest(uint _numMonthsToStart, uint _numPeriods, uint _numParticipants, address[] memory _listParticipants, address payable _beneficiary)
        public
        payable
        whenNotPaused
        returns(uint requestId) {

        require(msg.value > 0, "Ether amount must to be greater than zero.");
        require(_numMonthsToStart > 0 && _numPeriods > 0, "Details missing");
        require(_numParticipants >= 2 && _numParticipants <= 10, "Invalid participants number");

        for (uint i = 0; i < _numParticipants; i++) {
            require(_listParticipants[i] != address(0), "Empty address");
        }

        countRequests++;
        requestId = countRequests;
        Request storage newReq = requestsDetails[requestId];

        newReq.requester = payable(msg.sender);
        newReq.amountToSend = msg.value;
        newReq.numInitialBlock = block.number + (_numMonthsToStart * BLOCKS_PER_MONTH);
        newReq.nextBlockControl = newReq.numInitialBlock;
        newReq.numPeriods = _numPeriods;
        newReq.numRemainingPeriods = _numPeriods;
        newReq.isApproved = false;
        newReq.numParticipants = _numParticipants;
        newReq.beneficiary = _beneficiary;

        for (uint i = 0; i < _numParticipants; i++) {
            newReq.participants.push();
            newReq.participants[i].participantAddress = _listParticipants[i];
            newReq.participants[i].participantStatus = ParticipantStatus.PENDING;
            _setupRole(PARTICIPANT_ROLE, _listParticipants[i]);
        }

        _setupRole(CREATOR_ROLE, msg.sender);
        emit requestCreated(msg.sender, requestId);
    }

    function getParticipantsRequest(uint requestId) public view returns(ParticipantDetails[] memory listParticipants) {
        listParticipants = requestsDetails[requestId].participants;
    }

    function currentBlock() public view returns(uint) {
        return block.number;
    }

    // A participant approves its participation in a automation process. Once all the participants have done this, the automation is activated:
    function approveParticipation(uint requestId) public whenNotPaused onlyRole(PARTICIPANT_ROLE) returns(bool isParticipantApproved) {
        require(requestsDetails[requestId].amountToSend > 0, "Request ID not valid");
        require(!requestsDetails[requestId].isApproved, "Request is already approved");

        uint counterApproved = 0;

        for (uint i = 0; i < requestsDetails[requestId].numParticipants; i++) {

            if (requestsDetails[requestId].participants[i].participantAddress == msg.sender &&
                requestsDetails[requestId].participants[i].participantStatus == ParticipantStatus.PENDING) {
                requestsDetails[requestId].participants[i].participantStatus = ParticipantStatus.APPROVED;
                isParticipantApproved = true;
                emit participantApproved(requestsDetails[requestId].requester, requestId, msg.sender);
            }

            if (requestsDetails[requestId].participants[i].participantStatus == ParticipantStatus.APPROVED) {
                counterApproved++;
            }
        }

        if (counterApproved == requestsDetails[requestId].numParticipants) {
            requestsDetails[requestId].isApproved = true;
            emit requestApproved(requestsDetails[requestId].requester, requestId, msg.sender);
        }

        assert(counterApproved <= requestsDetails[requestId].numParticipants);
    }

    // Check that the request is not approved (is still a request)
    // Only the requester can cancel the request
    // Include the amount in the pendingWithdrawals map (Common Patterns - Withdrawal from Contracts)
    function cancelRequest(uint requestId) public whenNotPaused onlyRole(CREATOR_ROLE) {
        require(!requestsDetails[requestId].isApproved, "Request is already APPROVED. Create cancel proposal." );
        require(requestsDetails[requestId].requester == msg.sender, "Only can be canceled by the requester");

        _cancelRequest(requestId);
    }

    function _cancelRequest(uint requestId) internal {
        uint amount = requestsDetails[requestId].amountToSend;
        requestsDetails[requestId].amountToSend = 0;
        pendingWithdrawals[ requestsDetails[requestId].requester ] += amount;

        emit pendingWithdrawal(requestsDetails[requestId].requester, requestId, amount);
    }

    // Common Patterns - Withdrawal from Contracts
    function withdraw() public payable whenNotPaused {
        require(pendingWithdrawals[msg.sender] > 0, "No amount to be withdrawn");

        uint amount = pendingWithdrawals[msg.sender];
        // Remember to zero the pending refund before
        // sending to prevent re-entrancy attacks
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit withdrawalSent(msg.sender, amount);
    }

    function amountWithdraw() public view returns(uint amount) {
        amount = pendingWithdrawals[msg.sender];
    }

    //As the request has been already approved, it is necessary to create a proposal that have to be accepted by,
    //at least, 51% of participants
    function createCancelProposalRequestApproved(uint requestId) public whenNotPaused onlyRole(CREATOR_ROLE) returns(uint proposalId) {
        require(requestsDetails[requestId].isApproved, "Request is not approved." );
        require(requestsDetails[requestId].requester == msg.sender, "Only can be canceled by the requester");

        countCancelProposals++;
        proposalId = countCancelProposals;

        CancelProposal storage prop = cancelProposals[proposalId];
        prop.requestId = requestId;
        prop.numParticipants = requestsDetails[requestId].numParticipants;
        prop.numParticipantsAccepted = 0;
        prop.isAccepted = false;

        for (uint i = 0; i < requestsDetails[requestId].numParticipants; i++) {
            prop.participants.push();
            prop.participants[i].participantAddress = requestsDetails[requestId].participants[i].participantAddress;
            prop.participants[i].participantStatus = ParticipantStatus.PENDING;
        }

        emit proposalCreated(msg.sender, proposalId, requestId);
    }

    function getParticipantsCancelProposal(uint proposalId) public view returns(ParticipantDetails[] memory listParticipants) {
        listParticipants = cancelProposals[proposalId].participants;
    }

    // A participant accepts on a proposal to cancel a previously approved request. Once more than half of the participants have accepted it, it is canceled:
    function approveCancelProposal(uint proposalId) public whenNotPaused onlyRole(PARTICIPANT_ROLE) returns(bool isProposalApproved) {
        require(cancelProposals[proposalId].numParticipants > 0, "Proposal ID not valid");
        require(!cancelProposals[proposalId].isAccepted, "Proposal is already approved");

        uint counterAccepted = 0;

        for (uint i = 0; i < cancelProposals[proposalId].numParticipants; i++) {

            if (cancelProposals[proposalId].participants[i].participantAddress == msg.sender &&
                cancelProposals[proposalId].participants[i].participantStatus == ParticipantStatus.PENDING) {
                cancelProposals[proposalId].participants[i].participantStatus = ParticipantStatus.APPROVED;
                isProposalApproved = true;
                emit participantProposalAccepted(msg.sender, cancelProposals[proposalId].requestId, proposalId);
            }

            if (cancelProposals[proposalId].participants[i].participantStatus == ParticipantStatus.APPROVED) {
                counterAccepted++;
            }
        }

        cancelProposals[proposalId].numParticipantsAccepted = counterAccepted;

        uint percentage = ((counterAccepted + 1) * 100) / (cancelProposals[proposalId].numParticipants + 1);

        if (percentage > 51) {
            cancelProposals[proposalId].isAccepted = true;
            emit proposalAccepted(cancelProposals[proposalId].requestId, proposalId);
        }

        assert(counterAccepted <= cancelProposals[proposalId].numParticipants);

        _cancelRequest(cancelProposals[proposalId].requestId);
    }

    function processAutomation() public whenNotPaused {

        uint checkPoint = block.number;

        for (uint ind = 1; ind <= countRequests; ind++) {

            if (requestsDetails[ind].isApproved &&
                requestsDetails[ind].amountToSend > 0 &&
                requestsDetails[ind].nextBlockControl > checkPoint) {

                countPartialTransfers++;
                if (requestsDetails[ind].numRemainingPeriods == 1) {
                  partialTransfers[countPartialTransfers].partAmount = requestsDetails[ind].amountToSend;
                } else {
                  partialTransfers[countPartialTransfers].partAmount = requestsDetails[ind].amountToSend / requestsDetails[ind].numRemainingPeriods;
                }
                partialTransfers[countPartialTransfers].partBeneficiary = requestsDetails[ind].beneficiary;

                requestsDetails[ind].amountToSend = requestsDetails[ind].amountToSend - partialTransfers[countPartialTransfers].partAmount;
                requestsDetails[ind].numRemainingPeriods = requestsDetails[ind].numRemainingPeriods - 1;
                requestsDetails[ind].nextBlockControl = requestsDetails[ind].nextBlockControl + BLOCKS_PER_MONTH;
            }

        }

        _sendPartialTransfers();
    }

    function _sendPartialTransfers() internal {

      uint _tip;
      uint _totalTip;
      uint _amount;
      address payable _beneficiary;
      address payable _addressZero = payable(address(0));

      for (uint ind = 1; ind <= countPartialTransfers; ind++) {

        if (partialTransfers[ind].partAmount > 0) {
          _amount = partialTransfers[ind].partAmount;
          _beneficiary = partialTransfers[ind].partBeneficiary;

          _tip = (_amount / 100);
          _amount = _amount - _tip;
          _totalTip += _tip;

          partialTransfers[ind].partAmount = 0;
          partialTransfers[ind].partBeneficiary = _addressZero;

          _beneficiary.transfer(_amount);

          emit installmentSent(_beneficiary, _amount);
        }
      }
      countPartialTransfers = 0;

      payable(msg.sender).transfer(_totalTip);
    }
}
