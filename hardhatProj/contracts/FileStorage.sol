// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileStorage {
    // Mapping from ID number to IPFS hash
    mapping(string => string) private idToIPFSHash;

    // Event to log file uploads
    event FileUploaded(string idNumber, string ipfsHash);

    // Function to upload an IPFS hash for a given ID number
    function uploadFile(string memory idNumber, string memory _ipfsHash) public {
        // Store the IPFS hash in the mapping
        idToIPFSHash[idNumber] = _ipfsHash;

        // Emit event for logging
        emit FileUploaded(idNumber, _ipfsHash);
    }

    // Function to retrieve the IPFS hash for a given ID number
    function retrieveFile(string memory idNumber) public view returns (string memory) {
        // Return the IPFS hash for the given ID number
        return idToIPFSHash[idNumber];
    }
}
