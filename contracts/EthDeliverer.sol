// SPDX-License-Identifier: MIT
pragma solidity >=0.8.5 <0.9.0;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title EthDeliverer
 * @dev Given an amount of ethers deposited in this contract, it will be sent in installments to a given address automatically.
 * It will be necessary the participation of between two and ten additional addresses so that they will be in charge of authorize any change proposal
 * related to the initially established distribution.
 */
contract EthDeliverer is Pausable, AccessControl {

    /* Roles definition */
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant PARTICIPANT_ROLE = keccak256("PARTICIPANT_ROLE");

    uint public constant BLOCKS_PER_MONTH = 192000;

    /**
     *  Deliveries will be sent weekly
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

    struct Delivery {
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
        //mapping (uint => mapping(address => ParticipantStatus)) participants;
    }

    struct CancelProposal {
        uint deliveryId;
        uint numParticipants;
        uint numParticipantsAccepted;
        ParticipantDetails[] participants;
        bool isAccepted;
    }

    struct Installments {
      uint insAmount;
      address payable insBeneficiary;
    }

    uint public numDeliveriesDetails;
    uint public numCancelProposals;
    uint public numInstallments;

    Installments[] installments;

    mapping (uint => Delivery) public deliveriesDetails;
    mapping (uint => CancelProposal) public cancelProposals;
    mapping (address => uint) public pendingWithdrawals;

    event deliveryCreated(address indexed requester, uint requestId);
    event participantApproved(address indexed requester, uint requestId, address indexed participant);
    event deliveryApproved(address indexed requester, uint requestId, address indexed participant);
    event pendingWithdrawal(address indexed requester, uint requestId, uint amount);
    event withdrawalSent(address indexed requester, uint amount);
    event participantProposalAccepted(address indexed participant, uint indexed deliveryId, uint proposalId);
    event proposalAccepted(uint indexed deliveryId, uint proposalId);
    event installmentSent(address indexed beneficiary, uint amount);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
        numDeliveriesDetails = 0;
        numCancelProposals = 0;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // How many months from now will start the
    function createDeliveryRequest(uint _numMonthsToStart, uint _numPeriods, uint _numParticipants, address[] memory _listParticipants, address payable _beneficiary)
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

        numDeliveriesDetails++;
        requestId = numDeliveriesDetails;
        Delivery storage deli = deliveriesDetails[requestId];

        deli.requester = payable(msg.sender);
        deli.amountToSend = msg.value;
        deli.numInitialBlock = block.number + (_numMonthsToStart * BLOCKS_PER_MONTH);
        deli.nextBlockControl = deli.numInitialBlock;
        deli.numPeriods = _numPeriods;
        deli.numRemainingPeriods = _numPeriods;
        deli.isApproved = false;
        deli.numParticipants = _numParticipants;
        deli.beneficiary = _beneficiary;

        for (uint i = 0; i < _numParticipants; i++) {
            deli.participants.push();
            deli.participants[i].participantAddress = _listParticipants[i];
            deli.participants[i].participantStatus = ParticipantStatus.PENDING;
            _setupRole(PARTICIPANT_ROLE, _listParticipants[i]);
        }

        _setupRole(CREATOR_ROLE, msg.sender);
        emit deliveryCreated(deli.requester, requestId);
    }

    function getParticipantsDelivery(uint requestId) public view returns(ParticipantDetails[] memory listParticipants) {
        listParticipants = deliveriesDetails[requestId].participants;
    }

    // A participant approves its participation in a automation process. Once all the participants have done this, the automation is activated:
    function approveParticipation(uint requestId) public whenNotPaused onlyRole(PARTICIPANT_ROLE) returns(bool isParticipantApproved) {
        require(deliveriesDetails[requestId].amountToSend > 0, "Request ID not valid");
        require(!deliveriesDetails[requestId].isApproved, "Delivery is already approved");

        uint counterApproved = 0;

        for (uint i = 0; i < deliveriesDetails[requestId].numParticipants; i++) {

            if (deliveriesDetails[requestId].participants[i].participantAddress == msg.sender &&
                deliveriesDetails[requestId].participants[i].participantStatus == ParticipantStatus.PENDING) {
                deliveriesDetails[requestId].participants[i].participantStatus = ParticipantStatus.APPROVED;
                isParticipantApproved = true;
                emit participantApproved(deliveriesDetails[requestId].requester, requestId, msg.sender);
            }

            if (deliveriesDetails[requestId].participants[i].participantStatus == ParticipantStatus.APPROVED) {
                counterApproved++;
            }
        }

        if (counterApproved == deliveriesDetails[requestId].numParticipants) {
            deliveriesDetails[requestId].isApproved = true;
            emit deliveryApproved(deliveriesDetails[requestId].requester, requestId, msg.sender);
        }

        assert(counterApproved <= deliveriesDetails[requestId].numParticipants);
    }

    // Check that the delivery is not approved (is still a request)
    // Only the requester can cancel the delivery
    // Include the amount in the pendingWithdrawals map (Common Patterns - Withdrawal from Contracts)
    function cancelDeliveryRequest(uint requestId) public whenNotPaused onlyRole(CREATOR_ROLE) {
        require(!deliveriesDetails[requestId].isApproved, "Delivery is already APPROVED. Create cancel proposal." );
        require(deliveriesDetails[requestId].requester == msg.sender, "Only can be canceled by the requester");

        cancelDelivery(requestId);
    }

    function cancelDelivery(uint requestId) internal {
        uint amount = deliveriesDetails[requestId].amountToSend;
        deliveriesDetails[requestId].amountToSend = 0;
        pendingWithdrawals[ deliveriesDetails[requestId].requester ] += amount;

        emit pendingWithdrawal(deliveriesDetails[requestId].requester, requestId, amount);
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

    //As the delivery has been already approved, it is necessary to create a proposal that have to be accepted by,
    //at least, 51% of participants
    function createCancelProposalDeliveryApproved(uint requestId) public whenNotPaused onlyRole(CREATOR_ROLE) returns(uint proposalId) {
        require(deliveriesDetails[requestId].isApproved, "Delivery is not approved." );
        require(deliveriesDetails[requestId].requester == msg.sender, "Only can be canceled by the requester");

        numCancelProposals++;
        proposalId = numCancelProposals;

        CancelProposal storage prop = cancelProposals[proposalId];
        prop.deliveryId = requestId;
        prop.numParticipants = deliveriesDetails[requestId].numParticipants;
        prop.numParticipantsAccepted = 0;
        prop.isAccepted = false;

        for (uint i = 0; i < deliveriesDetails[requestId].numParticipants; i++) {
            prop.participants.push();
            prop.participants[i].participantAddress = deliveriesDetails[requestId].participants[i].participantAddress;
            prop.participants[i].participantStatus = ParticipantStatus.PENDING;
        }
    }

    function getParticipantsCancelProposal(uint proposalId) public view returns(ParticipantDetails[] memory listParticipants) {
        listParticipants = cancelProposals[proposalId].participants;
    }

    // A participant accepts on a proposal to cancel a previously approved delivery. Once more than half of the participants have accepted it, it is canceled:
    function approveCancelProposal(uint proposalId) public whenNotPaused onlyRole(PARTICIPANT_ROLE) returns(bool isProposalApproved) {
        require(cancelProposals[proposalId].numParticipants > 0, "Proposal ID not valid");
        require(!cancelProposals[proposalId].isAccepted, "Proposal is already approved");

        uint counterAccepted = 0;

        for (uint i = 0; i < cancelProposals[proposalId].numParticipants; i++) {

            if (cancelProposals[proposalId].participants[i].participantAddress == msg.sender &&
                cancelProposals[proposalId].participants[i].participantStatus == ParticipantStatus.PENDING) {
                cancelProposals[proposalId].participants[i].participantStatus = ParticipantStatus.APPROVED;
                isProposalApproved = true;
                emit participantProposalAccepted(msg.sender, cancelProposals[proposalId].deliveryId, proposalId);
            }

            if (cancelProposals[proposalId].participants[i].participantStatus == ParticipantStatus.APPROVED) {
                counterAccepted++;
            }
        }

        cancelProposals[proposalId].numParticipantsAccepted = counterAccepted;

        uint percentage = ((counterAccepted + 1) * 100) / (cancelProposals[proposalId].numParticipants + 1);

        if (percentage > 51) {
            cancelProposals[proposalId].isAccepted = true;
            emit proposalAccepted(cancelProposals[proposalId].deliveryId, proposalId);
        }

        assert(counterAccepted <= cancelProposals[proposalId].numParticipants);

        cancelDelivery(cancelProposals[proposalId].deliveryId);
    }

    function deliveryAutomation() public whenNotPaused {

        uint checkPoint = block.number;

        for (uint ind = 1; ind <= numDeliveriesDetails; ind++) {

            if (deliveriesDetails[ind].amountToSend > 0 &&
                deliveriesDetails[ind].nextBlockControl > checkPoint) {

                numInstallments++;
                if (deliveriesDetails[ind].numRemainingPeriods == 1) {
                  installments[numInstallments].insAmount = deliveriesDetails[ind].amountToSend;
                } else {
                  installments[numInstallments].insAmount = deliveriesDetails[ind].amountToSend / deliveriesDetails[ind].numRemainingPeriods;
                }
                installments[numInstallments].insBeneficiary = deliveriesDetails[ind].beneficiary;

                deliveriesDetails[ind].amountToSend = deliveriesDetails[ind].amountToSend - installments[numInstallments].insAmount;
                deliveriesDetails[ind].numRemainingPeriods = deliveriesDetails[ind].numRemainingPeriods - 1;
                deliveriesDetails[ind].nextBlockControl = deliveriesDetails[ind].nextBlockControl + BLOCKS_PER_MONTH;
            }

        }

        transferInstallments();
    }

    function transferInstallments() internal {

      uint _tip;
      uint _totalTip;
      uint _amount;
      address payable _beneficiary;
      address payable _addressZero = payable(address(0));

      for (uint ind = 1; ind <= numInstallments; ind++) {

        if (installments[ind].insAmount > 0) {
          _amount = installments[ind].insAmount;
          _beneficiary = installments[ind].insBeneficiary;

          _tip = (_amount / 100);
          _amount = _amount - _tip;
          _totalTip += _tip;

          installments[ind].insAmount = 0;
          installments[ind].insBeneficiary = _addressZero;

          _beneficiary.transfer(_amount);

          emit installmentSent(_beneficiary, _amount);
        }
      }
      numInstallments = 0;

      payable(msg.sender).transfer(_totalTip);
    }
}
