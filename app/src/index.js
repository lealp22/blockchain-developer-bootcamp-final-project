import Web3 from "web3";
import ethDelivererArtifact from "../../build/contracts/EthDeliverer.json";

const App = {
  web3: null,
  account: null,
  meta: null,

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

      // get accounts
      const accounts = await web3.eth.getAccounts();
      this.account = accounts[0];

      console.log('this.account->', this.account);

      this.refreshBalance();
    } catch (error) {
      console.error("Could not connect to contract or chain.");
    }
  },

  refreshBalance: async function() {
    const { getBalance } = this.meta.methods;
    const balance = await getBalance(this.account).call();

    const balanceElement = document.getElementsByClassName("balance")[0];
    balanceElement.innerHTML = balance;
  },

  createRequest: async function(e) {
    e.preventDefault();

    console.log('createRequest', e);

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

    console.log(_amount);
    console.log(_numMonthsToStart);
    console.log(_numPeriods);
    console.log(_numParticipants);
    console.log(_listParticipants);
    console.log(_beneficiary);

    if (isValid) {

      this.setStatus("Initiating transaction... (please wait)");

      const { createDeliveryRequest } = this.meta.methods;

      await createDeliveryRequest(
        _numMonthsToStart,
        _numPeriods,
        _numParticipants,
        _listParticipants,
        _beneficiary
      )
      .send({ from: this.account }, 
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

  requestDetails: async function() {
    //e.preventDefault();

    console.log('requestDetails');

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

        await deliveriesDetails(reqId.value).call(function(error, response){

        console.log('error->', error);
        console.log('response->', response);

        if (error) {
            showMessage(error);
            console.error(error);
        } else {
            //Debug
            showMessage(response);
            console.log("Response isAdmin: ", response);
        }

      }.bind(this));

        // document.getElementById("query1").innerHTML = _resp.
        // document.getElementById("query2").innerHTML = _resp.
        // document.getElementById("query3").innerHTML = _resp.
        // document.getElementById("query4").innerHTML = _resp.
        // document.getElementById("query5").innerHTML = _resp.
        // document.getElementById("query6").innerHTML = _resp.
      
    }
  },

  sendCoin: async function() {
    const amount = parseInt(document.getElementById("amount").value);
    const receiver = document.getElementById("receiver").value;

    this.setStatus("Initiating transaction... (please wait)");

    const { sendCoin } = this.meta.methods;
    await sendCoin(receiver, amount).send({ from: this.account });

    this.setStatus("Transaction complete!");
    this.refreshBalance();
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

  // const submit1 = document.getElementById("submit1");
  // submit1.addEventListener("click", App.createRequest);

  // const submit2 = document.getElementById("submit2");
  // submit2.addEventListener("click", App.requestDetails);

  if (typeof window.ethereum !== 'undefined') {
    console.log("Good! Wallet detected.");

    console.log('IsConnected->', ethereum.isConnected());
    if (ethereum.isConnected()) {
      showMessage('Good! Wallet detected.');
    } else {
      showMessage('Good! Wallet detected. Now you need to connect it.');
    }
    
    const btnConnect = document.getElementById('btn-connect');
    console.log(btnConnect);
    
    btnConnect.onclick = async () => {
      console.log('btnConnect.onclick');
      const res = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Res->', res);
    
      if (res) {
        document.getElementById('address').innerHTML = res[0];
        showMessage('Wallet connected.');
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
