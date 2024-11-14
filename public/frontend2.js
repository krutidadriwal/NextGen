// Handle file retrieval
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

const fileDisplay = document.getElementById('fileDisplay');
document.getElementById('retrieveForm').onsubmit = async (event) => {
    event.preventDefault();
    const idNumber = document.getElementById("retrieveIdNumber").value;
    if (!idNumber) {
        alert("Please enter an ID number to retrieve the file.");
        return;
    }
    try {
        // Call the smart contract function to get the IPFS hash for the given ID number
        const ipfsHash = await contract.methods.retrieveFile(idNumber).call();

        if (ipfsHash) {
            // Display the result with a link to view the file on your local IPFS gateway
            //resultDiv.innerHTML = `IPFS Hash: <a href="http://localhost:8080/ipfs/${ipfsHash}" target="_blank">${ipfsHash}</a>`;

            // Sending a POST request to retrieve the file using the IPFS hash
            const response = await fetch(`http://localhost:5001/api/v0/cat?arg=${encodeURIComponent(ipfsHash)}`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            // Get the file content as a blob (for binary files like images, PDFs, etc.)
            const blob = await response.blob();
            const fileType = blob.type;
            fileDisplay.innerHTML = '';

            // If the file is an image
            if (fileType.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(blob);
                fileDisplay.appendChild(img);
            }
            // If the file is a PDF
            else if (fileType === 'application/pdf') {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.target = '_blank';
                link.textContent = 'Click here to view the PDF';
                fileDisplay.appendChild(link);
            }
            // For other file types (downloadable)
            else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = ipfsHash;  // Set the download filename
                link.textContent = 'Click here to download the file';
                fileDisplay.appendChild(link);
            }
        } else {
            //resultDiv.innerText = "No file found for the given ID.";
        }
    } catch (error) {
        console.error('Error retrieving file:', error);
        //resultDiv.innerText = `Error retrieving file: ${error.message}`;
    }
};

