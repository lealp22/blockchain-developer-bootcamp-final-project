# Blockchain Developer Bootcamp - Final Project Idea

## Summary

The idea is to create a Dapp that, given a previously deposited amount, will be able to transfer a portion of it periodically and automatically to a specific address. It could be used to, for instance, when somebody wants to leave a regular income as an inheritance, give an allowance or pension, or make a payment in installments for service as a guarantee of proper operation. 

As a security measure, at least two more addresses will have to participate. These will serve to authorize any modification to be made since it will be necessary to have the approval of at least 51% of the addresses.

## Workflow 

1. Creation of an automation request. It requires the transfer of funds to the Dapp along with the necessary details: the start date, the frequency of execution, the amount to be sent, and the authorized participants (a minimum of two and a maximum of ten). As a result, a request identifier is returned.

2. Authorized participants must approve their participation in the automation process. As long as the participants have not given their approval, the request will remain in pending status. If the creator decides to cancel the request in this status, the amount deposited will be refunded.

3. Once all the participants' approval has been received, the automation will be activated and start working.

4. From that moment on, any change in the automation (frequency, amounts delivered, or its cancellation) will require the approval of at least 51% of the participants (including the creator).

5. There will be an independent process that will periodically check if it is necessary to execute any of the automation and, therefore, carry out the transfer involved.

## The trigger problem

The main problem we face is the need for a trigger to execute the function in charge of validating if any automation should be carried out.

Some services could solve this, such as Keepers of ChainLink or Gelato Network, but it is necessary to look into it more deeply.

For this exercise, a _processAutomation_ function has been included so that it can be called by anyone and, in return, the caller will get 1% of all transfers that are completed.

## Directory structure ##

```bash
|_📁 app
  |_📁 dist
  |_📁 src
    📝 index.html
    📝 index.js
|_📁 build
  |_📁 contracts
|_📁 contracts
  📝 DeferredTransfers.sol
  📝 Migrations.sol
|_📁 migrations
  📝 1_initial_migration.js
  📝 2_deploy_contracts.js
|_📁 test
  📝 deferred_transfers.js
```

# Information related to the Smart Contract **DeferredTransfers.sol**:

The Smart Contract is available in the Rinkeby network with the address [0x25ebCd76A15F982de93780CDfbd764075FFCE317](https://rinkeby.etherscan.io/address/0x25ebCd76A15F982de93780CDfbd764075FFCE317)

You can try the dapp in:
[https://lealp22.github.io/](https://lealp22.github.io/)

Or watch this video, a brief walking through this project:
[usingdapp.mp4](https://www.dropbox.com/s/co6dltpxmteld5s/usingdapp.mp4?dl=0)

(You can also download from here: [usingdapp.mp4](./usingdapp.mp4))

Related to the final project:
- [Avoiding Common Attacks](./avoiding_common_attacks.md)
- [Design Pattern Decisions](./design_pattern_decisions.md)
- [deployed_address.txt](./deployed_address.txt)

## Steps to run the Dapp locally:

**Prerequisites:**
- Node (npm)
- Truffle
- Ganache (_Ganache-cli_ or _truffle develop_ will be ok to run a blockchain locally)
- Git

**Steps:**

```bash
$ git clone https://github.com/lealp22/blockchain-developer-bootcamp-final-project.git
$ CD blockchain-developer-bootcamp-final-project
```
You can execute **ganache-cli** from this directory in order to have a local blockchain running in _http://locahost:8545_

Once ganache-cli (or another local blockchain) is running, you must compile and migrate the smart contract (In the same directory, but in another terminal) with the command:

```bash
$ truffle migrate
```
When completed, you can execute the dapp with the next commands:
```bash
$ CD app
$ npm install
$ npm run dev
```
Take into account that you need to have **MetaMask** (or another wallet) connected to the local blockchain, running in port **8545** (http://127.0.0.1:8545)

## Test ##

There is a file _deferred_transfers.js_ with some tests related to the smart contract that must run without problem.

It can be executed with the next command (from the directory where is the file _truffle-config.js_):
```
$ truffle test
```

******
Public Ethereum Address: 0xE838B9f35692c09500Db96a32D7faAA64f5DDEe2