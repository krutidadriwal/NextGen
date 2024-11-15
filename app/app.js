//require('dotenv').config(); // Load environment variables from .env
const Web3 = require('web3');
const cors = require('cors');
const express = require('express'); 
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { JsonRpcProvider, Wallet, Contract, hashMessage, toUtf8Bytes } = require('ethers');
const crypto = require('crypto'); // Node's built-in crypto module for hashing and signing

console.log("Starting the app...");
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors()); // Allow all origins
app.use(express.static(path.join(__dirname,'public')));
app.use('/shared-config', express.static('/app/shared-config'));
// Ethereum setup
console.log("Initializing Ethereum setup...");
const web3 = new Web3('http://127.0.0.1:8545');  // Replace with your local blockchain RPC URL  const web3 = new Web3('http://127.0.0.1:8545'); 
const walletPrivateKey = "5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"; // Use environment variable for private key
if (!walletPrivateKey) {
    console.error("Private key is missing. Please set it in a .env file.");
    process.exit(1); // Exit if private key is not set
}

const account = web3.eth.accounts.privateKeyToAccount(walletPrivateKey);
web3.eth.accounts.wallet.add(account); // Add account to Web3 wallet

// Serve the org_profile.html file from the frontend/templates directory
app.get('/org_profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/templates/upload_documents.html'));
});

// Serve the upload_documents.html file from the frontend/templates directory
app.get('/upload_documents', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/templates/upload_documents.html'));
});

//const wallet = new Wallet(walletPrivateKey, provider);
console.log("Ethereum setup completed.");

// Smart contract ABI (replace this with your own)
const contractABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "documents",
        "outputs": [
            {
                "internalType": "string",
                "name": "hash",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "signature",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "verifier",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_user",
                "type": "address"
            }
        ],
        "name": "getDocument",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getMyDocument",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_hash",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_signature",
                "type": "string"
            }
        ],
        "name": "storeSignedHash",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

let contract; // Declare contract variable
// Function to get the contract address from the JSON file
async function getContractAddress() {
    try {
        const response = await fetch('http://nextgen:3000/shared-config/contract-address.json');
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Failed to fetch contract address');
        }
        const data = await response.json();
        console.log('Fetched data:', data); // Log the entire response
        
        // Change this to the appropriate property name you want to use
        const contractAddress = data.documentVerificationAddress; // or data.documentVerificationAddress
        if (!contractAddress) {
            throw new Error('Contract address is missing in the JSON response');
        }
        return contractAddress;
    } catch (error) {
        console.error('Error fetching contract address:', error);
        throw error;
    }
}

// Function to initialize the contract
async function initializeApp() {
    try {
        const contractAddress = await getContractAddress();
        console.log("Fetched contract address:", contractAddress);
        const contract = new web3.eth.Contract(contractABI, contractAddress); 

        console.log('Contract initialized successfully.');

        // Start the server after contract is initialized
        const port = 4000;
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Error initializing the contract:', error);
        process.exit(1);
    }
}

// Call the initializeApp function to set up the contract and start the server
initializeApp();

// Endpoint to upload PDF, sign hash, and store on blockchain
app.post('/upload-pdf', upload.single('pdfFile'), async (req, res) => {
    console.log("Received file upload request.");
    console.log("Uploaded file details:", req.file);
    const filePath = path.join(__dirname, req.file.path);

    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        console.log("PDF Metadata: ", data.info);
        const metadataString = JSON.stringify(data.info);
        const hash = crypto.createHash('sha256').update(metadataString).digest('hex'); // Hashing the metadata string
        console.log("Generated Hash: ", hash);

        const signature = await web3.eth.personal.sign(metadataString, account.address); // Sign the message
        console.log('Generated Signature: ', signature);

        const tx = await contract.methods.storeSignedHash(hash, signature).send({ from: account.address }); // Store on blockchain
        console.log('Hash and signature stored on blockchain successfully.');

        res.status(200).json({
            message: 'Hash and signature stored on blockchain.',
            textContent: data.text
        });
    } catch (error) {
        console.error('Error processing PDF or storing hash:', error);
        res.status(500).send('Error processing PDF or storing hash.');
    } finally {
        fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting the uploaded file:', err);
        });
    }
});