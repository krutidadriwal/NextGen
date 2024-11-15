// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentVerification {
    struct Document {
        string hash;
        string signature;
        address verifier; // Address of the dApp that verified this hash
    }

    mapping(address => Document) public documents;

    function storeSignedHash(string memory _hash, string memory _signature) public {
        documents[msg.sender] = Document({
            hash: _hash,
            signature: _signature,
            verifier: msg.sender
        });
    }

    // New function to get document details for the caller
    function getMyDocument() public view returns (string memory, string memory, address) {
        Document memory doc = documents[msg.sender];
        return (doc.hash, doc.signature, doc.verifier);
    }

    // Existing function to get document details using user address
    function getDocument(address _user) public view returns (string memory, string memory, address) {
        Document memory doc = documents[_user];
        return (doc.hash, doc.signature, doc.verifier);
    }
}