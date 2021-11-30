const DeferredTransfers = artifacts.require("DeferredTransfers");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("DeferredTransfers", function (accounts) {

  it("should assert true", async function () {
    await DeferredTransfers.deployed();
    return assert.isTrue(true);
  });

  it("countRequests has a initial value of zero", async () => {
    const dfInstance = await DeferredTransfers.deployed();
    const storeValue = await dfInstance.countRequests.call();
    assert.equal(storeValue, 0, 'Initial state should be zero');
  });

  it("countCancelProposals has a initial value of zero", async () => {
    const dfInstance = await DeferredTransfers.deployed();
    const storeValue = await dfInstance.countCancelProposals.call();
    assert.equal(storeValue, 0, 'Initial state should be zero');
  });

  it("countPartialTransfers has a initial value of zero", async () => {
    const dfInstance = await DeferredTransfers.deployed();
    const storeValue = await dfInstance.countPartialTransfers.call();
    assert.equal(storeValue, 0, 'Initial state should be zero');
  });

  describe("Functionality", () => {

    it("create a request so countRequests should be increment to 1", async () => {
      const dfInstance = await DeferredTransfers.deployed();

      let _amount = 5000000000000000000;
      let _numMonthsToStart = 1;
      let _numPeriods = 5;
      let _numParticipants = 2;
      let _listParticipants = [];
      let _beneficiary = accounts[3];

      _listParticipants.push(accounts[1]);
      _listParticipants.push(accounts[2]);

      await dfInstance.createRequest(
        _numMonthsToStart,
        _numPeriods,
        _numParticipants,
        _listParticipants,
        _beneficiary,
        {
          from: accounts[0], 
          value: _amount
        } );

      const storeValue = await dfInstance.countRequests.call();

      assert.equal(storeValue, 1, 'countRequests should be 1');
    });

    it("create a request so countRequests should be increment to 2", async () => {
      const dfInstance = await DeferredTransfers.deployed();

      let _amount = 2000000000000000000;
      let _numMonthsToStart = 2;
      let _numPeriods = 2;
      let _numParticipants = 2;
      let _listParticipants = [];
      let _beneficiary = accounts[3];

      _listParticipants.push(accounts[1]);
      _listParticipants.push(accounts[2]);

      await dfInstance.createRequest(
        _numMonthsToStart,
        _numPeriods,
        _numParticipants,
        _listParticipants,
        _beneficiary,
        {
          from: accounts[0], 
          value: _amount
        } );

      const storeValue = await dfInstance.countRequests.call();

      assert.equal(storeValue, 2, 'countRequests should be 2');
    });

    it("Request 1 status is pending", async () => {
      const dfInstance = await DeferredTransfers.deployed();
      const storeValue = await dfInstance.requestsDetails.call(1);
      assert.equal(storeValue.isApproved, false, 'isApproved should be false');
    });

    it("Request 2 status is pending", async () => {
      const dfInstance = await DeferredTransfers.deployed();
      const storeValue = await dfInstance.requestsDetails.call(2);
      assert.equal(storeValue.isApproved, false, 'isApproved should be false');
    });
  });
})
