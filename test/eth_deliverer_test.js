const EthDelivererTest = artifacts.require("EthDelivererTest");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("EthDelivererTest", function (/* accounts */) {
  it("should assert true", async function () {
    await EthDelivererTest.deployed();
    return assert.isTrue(true);
  });
});
