import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { create } from 'ipfs-http-client'; // Import IPFS HTTP client

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corsOptions = {
    origin: 'http://localhost:5000', // Allow requests from this origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
};

const app = express();
const port = 3000;
app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname,'public')));
app.use('/shared-config', express.static('/app/shared-config'));
app.use(cors(corsOptions));

// In-memory "database" for storing hashes (you could use a real database)
const storedHashes = {
    "f15db8a4e6b2173ccce9dabd05312e694f938a6f31492fc00d7e5b4cb8b50b59": "Document A",
    "11cb99b69d98ca3402d4ce2027f60375218f52175797aef85e618e830c8a281a": "Document B"
};
// Set up IPFS client
const ipfs = create({ url: 'http://host.docker.internal:5001' }); // Change this URL if using a different IPFS node (local, Infura, etc.)

// Configure multer to handle file uploads
const upload = multer({ dest: 'uploads/' });



// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the view.html file to allow viewing files via IPFS hash



// Serve the upload_documents.html file from the frontend/templates directory
app.get('/upload_documents', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/templates/upload_documents.html'));
});

// Serve the org_profile.html file from the frontend/templates directory
app.get('/org_profile', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/templates/org_profile.html'));
});

// Handle file upload and IPFS storage
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        // Read the uploaded file
        const fileData = fs.readFileSync(req.file.path);

        // Upload the file to IPFS
        const result = await ipfs.add(fileData);

        // Return the IPFS hash to the user
        res.send(`File uploaded to IPFS! Hash: ${result.path}`);

        // Optionally, remove the file from the server after uploading to IPFS
        fs.unlinkSync(req.file.path);
    } catch (error) {
        console.error('Error uploading file to IPFS:', error);
        res.status(500).send('Error uploading file to IPFS.');
    }
});

// app.use(cors());
app.use(express.json());

// Mock endpoint for verifying documents
app.post('/verifyDocument', (req, res) => {
    const { fileHash } = req.body; // Assuming you send a hash of the file
    console.log("Received request to verify document. File hash:", fileHash);

    // Check if the hash exists in our "database"
    if (storedHashes[fileHash]) {
        console.log("Verification successful for hash:", fileHash);
        res.status(200).json({ 
            verified: true, 
            message: `Document verified!` 
        });
    } else {
        console.log("Verification failed for hash:", fileHash);
        res.status(200).json({ 
            verified: false, 
            message: "Document does not match any record." 
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
