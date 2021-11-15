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
    
    /**
     *  Deliveries will be sent weekly
     **/
    enum ParticipantStatus{
        NOT_USED,
        PENDING,
        APPROVED,
        ACTIVE
    }

    struct participantDetails {
        address participantAddress;
        ParticipantStatus participantStatus;
    }

    struct Delivery {
        address payable requester;
        address payable beneficiary;
        uint amountToSend;
        uint initDate;
        uint numPeriods;
        bool isApproved;
        uint numParticipants;
        //mapping (uint => mapping(address => ParticipantStatus)) participants;
        participantDetails[] participants;
    }

    uint numDeliveries;
    
    mapping (uint => Delivery) private deliveriesDetails;

    event deliveryCreated(address indexed requester, uint requestId);
    event participantApproved(address indexed requester, uint requestId, address participant);
    event deliveryApproved(address indexed requester, uint requestId, address participant);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
        numDeliveries = 0;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function createDeliveryRequest(uint _initDate, uint _numPeriods, uint _numParticipants, address[] memory _participants, address payable _beneficiary) 
        public 
        payable
        whenNotPaused
        returns(uint requestId) {

        require(msg.value > 0, "Value zeroe");
        require(_initDate > block.number && _numPeriods > 0, "Details missing");
        require(_numParticipants >= 2 && _numParticipants <= 10, "Invalid participants number");
       
        for (uint i = 0; i < _numParticipants; i++) {
            require(_participants[i] != address(0), "Empty address");
        }

        requestId = numDeliveries++;
        Delivery storage deli = deliveriesDetails[requestId];

        deli.requester = msg.sender;
        deli.amountToSend = msg.value;
        deli.initDate = _initDate;
        deli.numPeriods = _numPeriods;
        deli.isApproved = false;
        deli.numParticipants = _numParticipants;
        deli.beneficiary = _beneficiary;

        for (uint i = 0; i < _numParticipants; i++) {
            deli.participants[i].participantAddress = _participants[i];
            deli.participants[i].participantStatus = ParticipantStatus.PENDING;
        }

        emit deliveryCreated(deli.requester, requestId);
    }
    
    // A participant approve its participation in a automation process. Once all the participants have done this, the automation is activated:
    function approveParticipation(uint requestId) public returns(bool setParticipantApproved) {
        require(deliveriesDetails[requestId].amountToSend > 0, "Request ID not valid");

        uint counterApproved = 0;

        for (uint i = 0; i < deliveriesDetails[requestId].numParticipants; i++) {

            if (deliveriesDetails[requestId].participants[i].participantAddress == msg.sender &&
                deliveriesDetails[requestId].participants[i].participantStatus == ParticipantStatus.PENDING) {
                deliveriesDetails[requestId].participants[i].participantStatus = ParticipantStatus.APPROVED;
                setParticipantApproved = true;
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
}

/*
A creator ask to cancel a request:
function cancelRequest(uint requestId) public returns(bool) {
    require(validRequest[requestId]);
    require(...requestId status is pending...)
    ...
}

Once an automation is activated (its request has been confirmed by all participants) any change will require the creation of a proposal:
function createChangeProposal(uint requestId, uint initDate, uint amountToSend, address participants[10], bool delete) public returns(uint petitionId) { 
    require(validRequest[requestId]);
    require(...requestId status is active...)
    ...
}
A participant approves a change proposal. Once at least 51% have done so, the change is made:
function approveChangeProposal(uint petitionId) public returns(bool) {
    require(validProposal[proposalId]);
    require(...msg.sender is a valid participant...);
    ...

}

It will necessary a process that will periodically check if it is necessary to execute any automation:
function executeAutomation() returns (bool) {
    ...
}
*/