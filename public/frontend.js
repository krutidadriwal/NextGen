let idNumber = null; // Declare a variable in a broader scope

// Function to calculate SHA-256 hash of a file
async function calculateFileHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function generateFileId(ipfsHash) {
    // Encode the IPFS hash as a UTF-8 byte array
    const encoder = new TextEncoder();
    const data = encoder.encode(ipfsHash);

    // Generate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert the hash buffer to a hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    idNumber=hashHex;
    return hashHex; // This is your file ID
}

async function storeIpfsHash(ipfsHash) {
    try {
        const response = await fetch('http://localhost:5000/generate_file_id', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Here, the JSON body matches the structure expected by the server
            body: JSON.stringify({ ipfs_hash: ipfsHash })  // "ipfs_hash" should match what the server expects
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        // Parse the JSON response
        const data = await response.json();

        // Check if the server returned an error
        if (data.error) {
            console.error('Error from server:', data.error);
        } else {
            // Log the file ID
            console.log('Generated file ID:', data.file_id);
            idNumber = data.file_id;
            // Do something with the file ID, like displaying it on the page
            //document.getElementById('fileIdOutput').innerText = `Generated file ID: ${data.file_id}`;
        }
    } catch (error) {
        console.error('There was an error generating the file ID:', error);
    }
}


async function getContractAddress() {
    try {
        const response = await fetch('http://localhost:3000/shared-config/contract-address.json');
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Failed to fetch contract address');
        }
        const data = await response.json();
        console.log('Fetched data:', data); // Log the entire response
        
        // Change this to the appropriate property name you want to use
        const contractAddress = data.fileStorageAddress; // or data.documentVerificationAddress
        if (!contractAddress) {
            throw new Error('Contract address is missing in the JSON response');
        }
        return contractAddress;
    } catch (error) {
        console.error('Error fetching contract address:', error);
        throw error;
    }
}

async function initContract() {
  const contractAddress = await getContractAddress();
  console.log("Fetched contract address:", contractAddress);

    if (!contractAddress) {
        throw new Error("Contract address is undefined or invalid");
    }
  return new web3.eth.Contract(contractABI,contractAddress);
}

// Initialize IPFS client with local IPFS node and Web3.js for Ethereum interaction
const ipfs = window.IpfsHttpClient.create({ url: 'http://localhost:5001' });  // Local IPFS nodeconst ipfs = create({ url: 'http://nextgen:5001' });
 
const contractABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "string",
          "name": "idNumber",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "ipfsHash",
          "type": "string"
        }
      ],
      "name": "FileUploaded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "idNumber",
          "type": "string"
        }
      ],
      "name": "retrieveFile",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "idNumber",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_ipfsHash",
          "type": "string"
        }
      ],
      "name": "uploadFile",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }

];

const web3 = new Web3('http://127.0.0.1:8545');  // MetaMask or local node
//const contract = new web3.eth.Contract(contractABI, initContract());
let contract;
// Ensure MetaMask connection
async function connectMetaMask() {
    if (window.ethereum) {
        try {
            //await window.ethereum.enable();
            console.log("MetaMask connected");
            contract= await initContract();
if (!contract) {
                throw new Error("Contract initialization failed");
            }

            console.log("Contract initialized:", contract);
        } catch (error) {
            console.error("User denied MetaMask access", error);
        }
    } else {
        alert("Please install MetaMask to use this feature.");
    }
}

window.onload = connectMetaMask;

// Ensure resultDiv and fileDisplay are available
//const resultDiv = document.getElementById('result');
const fileDisplay = document.getElementById('fileDisplay');

// Handle file upload
document.getElementById('uploadForm').onsubmit = async (event) => {
    event.preventDefault();
        const fileInput = document.getElementById("fileInput").files[0];
  //  if (!idNumber || !fileInput) {
   //     alert("Please provide ID number and select a file.");
    //    return;
   // }
    try {
        // Step 1: Calculate file hash (e.g., using SHA-256)
        const fileHash = await calculateFileHash(fileInput);
        console.log("File hash generated:", fileHash);

        // Step 2: Send the file hash to the mock verification service
        const response = await fetch('http://localhost:3000/verifyDocument', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileHash })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(result);

        if (result.verified) {
            alert("Document verification successful: " + result.message);

            const reader = new FileReader();
            reader.onloadend = async () => {
                const fileBuffer = new Uint8Array(reader.result);
                try {
                    // Upload file to IPFS (local node)
                    const ipfsResult = await ipfs.add(fileBuffer);
                    const ipfsHash = ipfsResult.path;
                    console.log('IPFS Hash:', ipfsHash);
   		    //storeIpfsHash(ipfsHash);
		    const fileId = await generateFileId(ipfsHash);
    console.log("Generated File ID:", fileId);
                    
                    // Get connected account from MetaMask
                    const accounts = await web3.eth.getAccounts();
                    // Store the IPFS hash on the blockchain
                    await contract.methods.uploadFile(fileId, ipfsHash).send({ from: accounts[0], gas: 3000000 });

                    // Display the result
                    //resultDiv.innerHTML = `File uploaded to IPFS! <br> Hash: <a href="http://localhost:8080/ipfs/${ipfsHash}" target="_blank">${ipfsHash}</a> <br> Successfully stored on the blockchain.`;
                } catch (error) {
                    console.error('Error uploading file:', error);
                   // resultDiv.innerText = `Error uploading file: ${error.message}`;
                }
            };
            reader.readAsArrayBuffer(fileInput);  // Read the file for IPFS upload
        } else {
            alert("Document verification failed: " + result.message);
        }
    } catch (error) {
        console.error('Error verifying document:', error);
        alert('An error occurred during document verification. Check console for details.');
    }
};

// Handle file retrieval
//docker exec -it cdb07158d27c115c4cee0b74c3977cc119bd6491757ec63f4b84aa452c2cd4c3 sh 
