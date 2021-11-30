const DeferredTransfers = artifacts.require('./DeferredTransfers.sol');

module.exports = function(deployer) {
    deployer.deploy(DeferredTransfers);
};