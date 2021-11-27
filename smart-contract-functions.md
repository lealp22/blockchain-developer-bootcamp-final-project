# Basic Smart Contract Functions

1. A user creates a request with the necessary information along with the transfer of funds:

```
function createRequest(uint initDate, uint amountToSend, address participants[10]) public returns(uint requestId) {
    require(msg.value > 0 && initDate > 0 && amountToSend > 0);
    ...
};
```

2. A participant approve its participation in a automation process. Once all the participants have done this, the automation is activated:
```
mapping (uint => boolean) private validRequest;
mapping (uint => address[10]) private validParticipants;

function approveParticipation(uint requestId) public returns(bool) {
    require(validRequest[requestId]);
    require(...msg.sender is a valid participant...);
    ...
}
```

3. A creator ask to cancel a request:
```
function cancelRequest(uint requestId) public returns(bool) {
    require(validRequest[requestId]);
    require(...requestId status is pending...)
    ...
}

```

4. Once an automation is activated (its request has been confirmed by all participants) any change will require the creation of a proposal:
```
function createChangeProposal(uint requestId, uint initDate, uint amountToSend, address participants[10], bool delete) public returns(uint petitionId) { 
    require(validRequest[requestId]);
    require(...requestId status is active...)
    ...
}
```

5. A participant approves a change proposal. Once at least 51% have done so, the change is made:
```
function approveChangeProposal(uint petitionId) public returns(bool) {
    require(validProposal[proposalId]);
    require(...msg.sender is a valid participant...);
    ...

}

```

6. It will necessary a process that will periodically check if it is necessary to execute any automation:
```
function executeAutomation() returns (bool) {
    ...
}

```