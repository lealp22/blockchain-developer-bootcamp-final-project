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

Some services could solve this, such as Keepers of ChainLink, but it is necessary to look into it more deeply.

# Basic Smart Contract Functions

You can find them here: [smart-contract-functions.md](./smart-contract-functions.md)
