# Design Pattern Decisions

In the Smart Contract _**DeferredTransfers.sol**_ have been implemented the following Design Patterns:
******
## 1. Inheritance and Interfaces (Importing and extending contracts and/or using contract interfaces). ##

In the Smart Contract are imported the OpenZeppelin contracts **Pausable.sol** and **AccessControl.sol**:

```
pragma solidity >=0.8.5 <0.9.0;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DeferredTransfers is Pausable, AccessControl {
...
```
******
## 2. Access Control Design Patterns (Restricting access to certain functions using things like Ownable, Role-based Control) ##

The Smart Contract implements a Role-based control using AccessControl.sol of OpenZeppelin

It used the roles **CREATOR_ROLE**,  **PARTICIPANT_ROLE** and **PAUSER_ROLE**:

```
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
bytes32 public constant PARTICIPANT_ROLE = keccak256("PARTICIPANT_ROLE");
```
**CREATOR_ROLE** and **PARTICIPANT_ROLE** are used to restrict the funcionality since some operations are allowed just to CREATORs or PARTICIPANs, but never both.

The role will be determined by who creates a request (CREATOR) or who is a participant to authorize requests and cancellation proposals (PARTICIPANT).

Both roles are assigned when a request is created:
```
function createRequest(..., address[] memory _listParticipants, ... {
    ...
    _setupRole(PARTICIPANT_ROLE, _listParticipants[i]);
    ...
    _setupRole(CREATOR_ROLE, msg.sender);
    ...
}
```
e.g. Requests only can be approved by theirs participants:
```
function approveParticipation(uint requestId) public whenNotPaused onlyRole(PARTICIPANT_ROLE) returns(bool isParticipantApproved) {
    ...
}

```
e.g. Only CREATORs can cancel a request:
```
function cancelRequest(uint requestId) public whenNotPaused onlyRole(CREATOR_ROLE) {
    ...
}

```
Another role is also used to control who can pause or unpause the contract. It is **PAUSER_ROLE** and always is assigned to the sender that creates the contract.
```
constructor() {
    ...
    _setupRole(PAUSER_ROLE, msg.sender);
    ...
}
```
```
function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
}
```
```
function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
}
```