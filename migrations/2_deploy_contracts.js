const EthDeliverer = artifacts.require('./EthDeliverer.sol');

module.exports = function(deployer) {
    deployer.deploy(EthDeliverer);
};