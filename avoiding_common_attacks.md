# Avoiding Common Attacks

Some securities measures have been included in the development of the project:

## 1. Pragma version ##

The latest available version of the Solidity compiler has been used: **0.8.10**. 

This avoid:
- [SWC-102 - Outdated Compiler Version](https://swcregistry.io/docs/SWC-102).
- [SWC-103 - Floating Pragma](https://swcregistry.io/docs/SWC-103).

This version has been also set in the Truffle configuration.

```
pragma solidity 0.8.10;
...
```

******

## 2. Functions Visibility ##

All the functions have a visibility type specified.

This avoid:

- [SWC-100 - Function Default Visibility](https://swcregistry.io/docs/SWC-100) as internal functions are not considered as public by default.

******

## 3. Protected Withdrawal ##

The Smart Contract implements the common pattern ["Withdrawal of Contracts"] (https://docs.soliditylang.org/en/v0.8.10/common-patterns.html) in addition that it can only be triggered by an address with a pending amount to be withdrawn and with a CREATOR role.

This avoid:

- [SWC-105 - Unprotected Ether Withdrawal](https://swcregistry.io/docs/SWC-105) implementing controls according to the specs of the smart contract system.

```
function withdraw() public payable whenNotPaused onlyRole(CREATOR_ROLE) {
    require(pendingWithdrawals[msg.sender] > 0, "No amount to be withdrawn");

    ...
}
```

******

## 4. Variable Visibility ##

All the state variables have a visibility type specified.

This avoid:

- [SWC-108 - State Variable Default Visibility](https://swcregistry.io/docs/SWC-108).