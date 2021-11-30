import Web3 from "web3";
import contractArtifact from "../../build/contracts/DeferredTransfers.json";

const App = {
  web3: null,
  account: null,
  meta: null,
  isConnected: false,
  eventSet: null,

  start: async function() {
    const { web3 } = this;

    this.eventSet = new Set();
    console.log('start');

    try {
      // get contract instance
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = contractArtifact.networks[networkId];
      this.meta = new web3.eth.Contract(
        contractArtifact.abi,
        deployedNetwork.address,
      );

      console.log('this.meta->', this.meta);

      const accounts = await web3.eth.getAccounts();
      this.account = accounts[0];
    
      console.log('this.account->', this.account);
    
      if (this.account) {
        this.updateAccount(this.account);
        this.amountWithdraw();
        this.setStatus('Wallet connected.');
        this.isConnected = true;
        this.setEvents();
      } else {
        this.setStatus('Good! Wallet detected. Now you need to connect it.');
        this.isConnected = false;
      }
      
    } catch (error) {
      console.error("Could not connect to contract or chain.");
    }
  },
  
  updateAccount: function(_account) {
    if (_account) {
      document.getElementById('address').innerHTML = _account;
    } 
  },

  amountWithdraw: async function() {
    const { amountWithdraw } = this.meta.methods;
    const _amount = await amountWithdraw().call();

    if (_amount) {
      document.getElementById("withdrawal_amount").innerHTML = Web3.utils.fromWei(_amount, "ether");
    }
  },

  createRequest: async function() {

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    const fields = document.querySelectorAll("#form1 input");
    console.log('fields->', fields);

    let isValid = true;
    let _amount = 0;
    let _numMonthsToStart = 0;
    let _numPeriods = 0;
    let _numParticipants = 0;
    let _listParticipants = [];
    let _beneficiary = "";

    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].checkValidity()) {
        fields[i].classList.add("invalid");
        isValid = false;
      } else {
        fields[i].classList.remove("invalid");

        if (fields[i].name == 'amount') 
          _amount = fields[i].value;

        if (fields[i].name == 'months')
          _numMonthsToStart = fields[i].value;

        if (fields[i].name == 'transfers')
          _numPeriods = fields[i].value;

        if (fields[i].name.indexOf('part') >= 0) {
          if (fields[i].value) {
            if (fields[i].value == "0x0000000000000000000000000000000000000000" 
            || fields[i].value == this.account 
            || !Web3.utils.isAddress(fields[i].value)
            || _listParticipants.indexOf(fields[i].value) >= 0) {
              fields[i].classList.add("invalid");
              isValid = false;
            } else {
              _numParticipants++;
              _listParticipants.push(fields[i].value)
            }
          }
        }

        if (fields[i].name == 'beneficiary') {
          if (fields[i].value == "0x0000000000000000000000000000000000000000" 
          || fields[i].value == this.account
          || !Web3.utils.isAddress(fields[i].value)) {
            fields[i].classList.add("invalid");
            isValid = false;
          } else {
            _beneficiary = fields[i].value;
          }
        }
      }
    }

    if (isValid) {

      this.setStatus("Initiating transaction... (please wait)");
      let amountWei = Web3.utils.toWei(_amount, 'ether');

      const { createRequest } = this.meta.methods;

      await createRequest(
        _numMonthsToStart,
        _numPeriods,
        _numParticipants,
        _listParticipants,
        _beneficiary
      )
      .send({ from: this.account, value: amountWei }, 
        (error, transactionHash) => {
        if (error) {
            console.error("Error createRequest: ", error);
            showMessage("Error. Transaction not completed");
            alert("Error. Transaction not completed.");
        } else {
            console.info("Transaction hash: ", transactionHash);
            showMessage(`Request sent (${transactionHash}). Waiting for confirmation.`);
        }
      });
    } 
   
  },

  isRequestValid: function(ref) {
    
    let reqId = document.getElementById(ref);
  
    if (!reqId.checkValidity()) {
      reqId.classList.add("invalid");
      return null;
    } else {
      reqId.classList.remove("invalid");
      return reqId.value;
    }
  },

  requestDetails: async function() {
    console.log('requestDetails');

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    let reqId = document.getElementById("reqId1");

    if (!reqId.checkValidity()) {
      reqId.classList.add("invalid");
    } else {
      reqId.classList.remove("invalid");

      this.setStatus("Getting the information... (please wait)");

      const { requestsDetails, getParticipantsRequest, currentBlock } = this.meta.methods;

      let _resp = await requestsDetails(reqId.value).call();
      
      this.setStatus("Operation completed. No information found.");

      if (_resp.numPeriods != "0") {

        this.setStatus("Operation completed. Information found.");
        let ethAmount = Web3.utils.fromWei(_resp.amountToSend, "ether");

        let status = (_resp.isApproved) ? "Approved" : "Pending approval";
        status = (_resp.amountToSend == "0") ? "Cancelled" : status;

        let _resp2 = await getParticipantsRequest(reqId.value).call();
        let _resp3 = await currentBlock().call();
        let initBlock = `${_resp.numInitialBlock} (Current: ${_resp3})`;
        let participants = "";

        if (_resp2) {
          for (let i = 0; i < _resp2.length; i++) {
            participants = participants.concat(_resp2[i].participantAddress);
            participants = participants.concat(_resp2[i].participantStatus == "1" ? " (Pending) ":" (Accepted) ");
          }
        }
        document.getElementById("query-1").classList.remove("d-none");

        document.getElementById("query-11").innerHTML = ethAmount + " Eth";
        document.getElementById("query-12").innerHTML = initBlock;
        document.getElementById("query-14").innerHTML = _resp.numPeriods;
        document.getElementById("query-15").innerHTML = _resp.numParticipants;
        document.getElementById("query-16").innerHTML = participants;
        document.getElementById("query-17").innerHTML = _resp.beneficiary
        document.getElementById("query-18").innerHTML = status;
      }
    }
  },

  proposalDetails: async function() {
    console.log('proposalDetails');

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    let propId = document.getElementById("propId");
  
    if (!propId.checkValidity()) {
      propId.classList.add("invalid");
      
    } else {
      propId.classList.remove("invalid");

      this.setStatus("Getting the information... (please wait)");

      const { cancelProposals, getParticipantsCancelProposal } = this.meta.methods;

      let _resp = await cancelProposals(propId.value).call();
      
      this.setStatus("Operation completed. No information found.");

      if (_resp.numParticipants != "0") {

        this.setStatus("Operation completed. Information found.");
        let _resp2 = await getParticipantsCancelProposal(propId.value).call();
        let participants = "";

        if (_resp2) {
          for (let i = 0; i < _resp2.length; i++) {
            participants = participants.concat(_resp2[i].participantAddress);
            participants = participants.concat(_resp2[i].participantStatus == "1" ? " (Pending) ":" (Accepted) ");
          }
        }
        document.getElementById("query-2").classList.remove("d-none");

        document.getElementById("query-21").innerHTML = _resp.requestId;
        document.getElementById("query-22").innerHTML = _resp.numParticipants;
        document.getElementById("query-23").innerHTML = _resp.numParticipantsAccepted;
        document.getElementById("query-24").innerHTML = participants;
        document.getElementById("query-25").innerHTML = (_resp.isAccepted) ? "Accepted" : "Pending acceptance";
      }
    }
  },

  approveParticipation: async function() {
    console.log('approveParticipation');

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    const request = this.isRequestValid("reqId2");

    if (request) {

      const { approveParticipation } = this.meta.methods;
      await approveParticipation(request).send({ from: this.account }, 
      (error, transactionHash) => {
      if (error) {
          console.error("Error approveParticipation: ", error);
          showMessage("Error. Transaction not completed");
          alert("Error. Transaction not completed.");
      } else {
          console.info("Transaction hash: ", transactionHash);
          showMessage(`Request sent (${transactionHash}). Waiting for confirmation.`);
      }
    });

    }

  },

  cancelRequest: async function() {
    console.log('cancelRequest');

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    const request = this.isRequestValid("reqId3");

    if (request) {
      const { cancelRequest } = this.meta.methods;
      await cancelRequest(request).send({ from: this.account }, 
      (error, transactionHash) => {
        if (error) {
            console.error("Error cancelRequest: ", error);
            showMessage("Error. Transaction not completed");
            alert("Error. Transaction not completed.");
        } else {
            console.info("Transaction hash: ", transactionHash);
            showMessage(`Request sent (${transactionHash}). Waiting for confirmation.`);
        }
      });
    }
  },

  withdraw: async function() {
    console.log('withdraw');

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    this.setStatus("Initiating transaction... (please wait)");

    const { withdraw } = this.meta.methods;
    await withdraw().send({ from: this.account }, 
      (error, transactionHash) => {
      if (error) {
          console.error("Error withdraw: ", error);
          showMessage("Error. Transaction not completed");
          alert("Error. Transaction not completed.");
      } else {
          console.info("Transaction hash: ", transactionHash);
          showMessage(`Request sent (${transactionHash}). Waiting for confirmation.`);
      }
    });

    this.amountWithdraw();

  },

  createCancelProposalRequestApproved: async function() {
    console.log('createCancelProposalRequestApproved');

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    const request = this.isRequestValid("reqId4");

    if (request) {
      const { createCancelProposalRequestApproved } = this.meta.methods;
      await createCancelProposalRequestApproved(request).send({ from: this.account }, 
      (error, transactionHash) => {
        if (error) {
            console.error("Error createCancelProposalRequestApproved: ", error);
            showMessage("Error. Transaction not completed");
            alert("Error. Transaction not completed.");
        } else {
            console.info("Transaction hash: ", transactionHash);
            showMessage(`Request sent (${transactionHash}). Waiting for confirmation.`);
        }
      });
    }
  },

  approveCancelProposal: async function() {
    console.log('approveCancelProposal');

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    let propId = document.getElementById("proposal");
  
    if (!propId.checkValidity()) {
      propId.classList.add("invalid");
      
    } else {
      propId.classList.remove("invalid");
      
      const { approveCancelProposal } = this.meta.methods;

      await approveCancelProposal(propId.value).send({ from: this.account }, 
      (error, transactionHash) => {
        if (error) {
            console.error("Error approveCancelProposal: ", error);
            showMessage("Error. Transaction not completed");
            alert("Error. Transaction not completed.");
        } else {
            console.info("Transaction hash: ", transactionHash);
            showMessage(`Request sent (${transactionHash}). Waiting for confirmation.`);
        }
      });
    }
  },

  processAutomation: async function() {
    console.log('processAutomation');

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    this.setStatus("Initiating transaction... (please wait)");

    const { processAutomation } = this.meta.methods;

    await processAutomation().send({ from: this.account }, 
      (error, transactionHash) => {
      if (error) {
          console.error("Error processAutomation: ", error);
          showMessage("Error. Transaction not completed");
          alert("Error. Transaction not completed.");
      } else {
          console.info("Transaction hash: ", transactionHash);
          showMessage(`Request sent (${transactionHash}). Waiting for confirmation.`);
      }
    });
  },

  setStatus: function(message) {
    const status = document.getElementById("status");
    status.innerHTML = message;
  },

  //
  // Events
  //
  setEvents: async function() {
    
    //* 
    //* Event requestCreated
    //*
    const eventRequestCreated = this.meta.events.requestCreated({ filter: {_sender: this.address}}, function(error, event){ 

      if (!error) {
        console.info("requestCreated hash: ", event.transactionHash);
        if (!this.eventSet.has(event.transactionHash)) {
  
          this.eventSet.add(event.transactionHash);
          showMessage("Request " + event.returnValues.requestId + " created");
          alert("Request " + event.returnValues.requestId + " created.\n\n"+ "Tx hash:\n" + event.transactionHash);
        }
      }      

    }.bind(this));

    //* 
    //* Event participantApproved
    //*
    const eventParticipantApproved = this.meta.events.participantApproved({ filter: {_sender: this.address}}, function(error, event){ 

      if (!error) {
        console.info("participantApproved hash: ", event.transactionHash);
        if (!this.eventSet.has(event.transactionHash)) {
  
          this.eventSet.add(event.transactionHash);
          showMessage("Confirmation participant approval received. Request ID: " + event.returnValues.requestId);
          alert("Participant " + event.returnValues.participant + " has approved Request ID " + event.returnValues.requestId + ".\n\n"+ "Tx hash:\n" + event.transactionHash);
        }
      }      

    }.bind(this));

    //* 
    //* Event requestApproved
    //*
    const eventRequestApproved = this.meta.events.requestApproved({ filter: {_sender: this.address}}, function(error, event){ 
      
      if (!error) {
        console.info("requestApproved hash: ", event.transactionHash);
        if (!this.eventSet.has(event.transactionHash)) {
  
          this.eventSet.add(event.transactionHash);
          showMessage("Request ID: " + event.returnValues.requestId + "has been approved.");
          alert("Request ID " + event.returnValues.requestId +" has been approved.\n\n" + "Tx hash:\n" + event.transactionHash);
        }
      }      

    }.bind(this));

    //* 
    //* Event pendingWithdrawal
    //*
    const eventPendingWithdrawal = this.meta.events.pendingWithdrawal({ filter: {_sender: this.address}}, function(error, event){ 
      
      if (!error) {
        console.info("pendingWithdrawal hash: ", event.transactionHash);
        if (!this.eventSet.has(event.transactionHash)) {
  
          this.eventSet.add(event.transactionHash);
          let _amount = Web3.utils.fromWei(event.returnValues.amount, "ether")
          showMessage("The requester has a withdrawal pending for " + _amount +" Eth.");
          alert("The requester has a withdrawal pending for " + _amount +" Eth.\n\n" + "Tx hash:\n" + event.transactionHash);
        }
      }      

    }.bind(this));

    //* 
    //* Event withdrawalSent
    //*
    const eventWithdrawalSent = this.meta.events.withdrawalSent({ filter: {_sender: this.address}}, function(error, event){ 
      
      if (!error) {
        console.info("withdrawalSent hash: ", event.transactionHash);
        if (!this.eventSet.has(event.transactionHash)) {
  
          this.eventSet.add(event.transactionHash);
          let _amount = Web3.utils.fromWei(event.returnValues.amount, "ether")
          showMessage("Withdrawal completed (" + _amount + " Eth).");
          alert("Withdrawal completed (" + _amount +" Eth).\n\n" + "Tx hash:\n" + event.transactionHash);
        }
      }      

    }.bind(this));
  
    //* 
    //* Event proposalCreated
    //*
    const eventProposalCreated = this.meta.events.proposalCreated({ filter: {_sender: this.address}}, function(error, event){ 

      if (!error) {
        console.info("proposalCreated hash: ", event.transactionHash);
        if (!this.eventSet.has(event.transactionHash)) {
  
          this.eventSet.add(event.transactionHash);
          showMessage("Proposal " + event.returnValues.proposalId + " created");
          alert("Proposal " + event.returnValues.proposalId + " created.\n\n"+ "Tx hash:\n" + event.transactionHash);
        }
      }      

    }.bind(this));

    //* 
    //* Event participantProposalAccepted
    //*
    const eventParticipantProposalAccepted = this.meta.events.participantProposalAccepted({ filter: {_sender: this.address}}, function(error, event){ 
      
      if (!error) {
        console.info("participantProposalAccepted hash: ", event.transactionHash);
        if (!this.eventSet.has(event.transactionHash)) {
  
          this.eventSet.add(event.transactionHash);
          showMessage("Confirmation participant approval received. Proposal ID: " + event.returnValues.proposalId);
          alert("Participant " + event.returnValues.participant + " has accepted Proposal ID " + event.returnValues.proposalId + ".\n\n"+ "Tx hash:\n" + event.transactionHash);
        }
      }      

    }.bind(this));
  
    //* 
    //* Event proposalAccepted
    //*
    const eventProposalAccepted = this.meta.events.proposalAccepted({ filter: {_sender: this.address}}, function(error, event){ 
      
      if (!error) {
        console.info("proposalAccepted hash: ", event.transactionHash);
        if (!this.eventSet.has(event.transactionHash)) {
  
          this.eventSet.add(event.transactionHash);
          showMessage("Proposal ID: " + event.returnValues.proposalId + "has been approved.");
          alert("Proposal ID " + event.returnValues.proposalId +" has been approved.\n\n" + "Tx hash:\n" + event.transactionHash);
        }
      }      

    }.bind(this));

  },
};

//*
//* Función para mostrar mensaje de estado (similar a setStatus)
//*
function showMessage(_message) {

  document.getElementById("status").innerHTML = _message;
};

window.App = App;

window.addEventListener("load", function() {

  console.log("Load");

  if (typeof window.ethereum !== 'undefined') {
    console.log("Good! Wallet detected.");
    //showMessage('Good! Wallet detected. Now you need to connect it.');
    
    const btnConnect = document.getElementById('btn-connect');
    
    btnConnect.onclick = async () => {
      console.log('btnConnect.onclick');
      const res = await window.ethereum.request({ method: 'eth_requestAccounts' });
     
      if (res) {
        document.getElementById('address').innerHTML = res[0];
        App.start();
      }
    }
    // use MetaMask's provider
    App.web3 = new Web3(window.ethereum);
    App.start();
    
  } else {
    console.error('There is not any Wallet available!');
    showMessage('Error. There is not any Wallet available!');
    alert("You need to install MetaMask or another Wallet!");
  }

});
