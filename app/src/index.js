import Web3 from "web3";
import ethDelivererArtifact from "../../build/contracts/EthDeliverer.json";

const App = {
  web3: null,
  account: null,
  meta: null,
  isConnected: false,

  start: async function() {
    const { web3 } = this;

    console.log('start');

    try {
      // get contract instance
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = ethDelivererArtifact.networks[networkId];
      this.meta = new web3.eth.Contract(
        ethDelivererArtifact.abi,
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
    //e.preventDefault();
    //console.log('createRequest', e);

    if (!this.isConnected) {
      this.setStatus("Error. Wallet not connected!");
      return null;
    }

    const fields = document.querySelectorAll("#form1 input");
    console.log('fields->', fields);
    console.log('this.account->', this.account);
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

    console.log(this.address);
    console.log(_amount);
    console.log(_numMonthsToStart);
    console.log(_numPeriods);
    console.log(_numParticipants);
    console.log(_listParticipants);
    console.log(_beneficiary);


    if (isValid) {

      this.setStatus("Initiating transaction... (please wait)");
      let amountWei = Web3.utils.toWei(_amount, 'ether');
      console.log('amountWei->', amountWei);

      const { createDeliveryRequest } = this.meta.methods;

      await createDeliveryRequest(
        _numMonthsToStart,
        _numPeriods,
        _numParticipants,
        _listParticipants,
        _beneficiary
      )
      .send({ from: this.account, value: amountWei }, 
        (error, transactionHash) => {
        if (error) {
            console.error("Error createDeliveryRequest: ", error);
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
    //e.preventDefault();

    console.log('requestDetails');

    console.log(this.isRequestValid("reqId1"));

    let reqId = document.getElementById("reqId1");

    if (!reqId.checkValidity()) {
      reqId.classList.add("invalid");
    } else {
      reqId.classList.remove("invalid");

      this.setStatus("Getting the information... (please wait)");

      const { deliveriesDetails } = this.meta.methods;
      console.log('deliveriesDetails->', deliveriesDetails);

      let _resp = await deliveriesDetails(reqId.value).call();
      
      console.log('_resp->', _resp);
      this.setStatus("Operation completed. No information found.");

      if (_resp.numPeriods != "0") {

        this.setStatus("Operation completed. Information found.");
        let ethAmount = Web3.utils.fromWei(_resp.amountToSend, "ether");

        let status = (_resp.isApproved) ? "Approved" : "Pending approval";
        status = (_resp.amountToSend == "0") ? "Cancelled" : status;

        const { getParticipantsDelivery } = this.meta.methods;

        let _resp2 = await getParticipantsDelivery(reqId.value).call();
        console.log('_resp2->', _resp2);

        let participants = "";

        if (_resp2) {
          for (let i = 0; i < _resp2.length; i++) {
            participants = participants.concat(_resp2[i].participantAddress);
            participants = participants.concat(_resp2[i].participantStatus == "1" ? " (Pending) ":" (Accepted) ");
          }
        }
        document.getElementById("query-1").classList.remove("d-none");

        document.getElementById("query-11").innerHTML = ethAmount + " Eth";
        document.getElementById("query-12").innerHTML = _resp.numInitialBlock;
        document.getElementById("query-14").innerHTML = _resp.numPeriods;
        document.getElementById("query-15").innerHTML = _resp.numParticipants;
        document.getElementById("query-16").innerHTML = participants;
        document.getElementById("query-17").innerHTML = _resp.beneficiary
        document.getElementById("query-18").innerHTML = status;
      }
    }
  },

  approveParticipation: async function() {
    console.log('approveParticipation');

    const request = this.isRequestValid("reqId2");

    if (request) {
      console.log("Request valid->", request);

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

  cancelDeliveryRequest: async function() {
    console.log('cancelDeliveryRequest');

    const request = this.isRequestValid("reqId3");

    if (request) {
      console.log("Request valid");

      const { cancelDeliveryRequest } = this.meta.methods;
      await cancelDeliveryRequest(request).send({ from: this.account }, 
      (error, transactionHash) => {
        if (error) {
            console.error("Error cancelDeliveryRequest: ", error);
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

  createCancelProposalDeliveryApproved: async function() {
    console.log('createCancelProposalDeliveryApproved');

    const request = this.isRequestValid("reqId4");

    if (request) {
      console.log("Request valid");

      const { createCancelProposalDeliveryApproved } = this.meta.methods;
      await createCancelProposalDeliveryApproved(request).send({ from: this.account }, 
      (error, transactionHash) => {
        if (error) {
            console.error("Error createCancelProposalDeliveryApproved: ", error);
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

  deliveryAutomation: async function() {
    console.log('deliveryAutomation');

    this.setStatus("Initiating transaction... (please wait)");

    const { deliveryAutomation } = this.meta.methods;

    await deliveryAutomation().send({ from: this.account }, 
      (error, transactionHash) => {
      if (error) {
          console.error("Error deliveryAutomation: ", error);
          showMessage("Error. Transaction not completed");
          alert("Error. Transaction not completed.");
      } else {
          console.info("Transaction hash: ", transactionHash);
          showMessage(`Request sent (${transactionHash}). Waiting for confirmation.`);
      }
    });
  },

  sendCoin: async function() {
    const amount = parseInt(document.getElementById("amount").value);
    const receiver = document.getElementById("receiver").value;

    this.setStatus("Initiating transaction... (please wait)");

    const { sendCoin } = this.meta.methods;

    await sendCoin(receiver, amount).send({ from: this.account });

    this.setStatus("Transaction complete!");
  },

  setStatus: function(message) {
    const status = document.getElementById("status");
    status.innerHTML = message;
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
    console.log(btnConnect);
    
    btnConnect.onclick = async () => {
      console.log('btnConnect.onclick');
      const res = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Res->', res);
    
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
