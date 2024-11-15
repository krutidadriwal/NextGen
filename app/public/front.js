async function uploadPDFAndGetMetadata(file) {
    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
        const response = await fetch('http://localhost:4000/upload-pdf', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload PDF.');
        }

        const result = await response.json();
        console.log('Received metadata:', result);

        // Make sure that 'textContent' is actually part of the result
        if (result.textContent) {
            document.getElementById('textContent').textContent = result.textContent;
        } else {
            console.error('No textContent in the response:', result);
            alert('The server did not return text content.');
        }

    } catch (error) {
        console.error('Error uploading PDF:', error);
        alert('Error uploading PDF. Check the console for details.');
    }
}
// Event listener for form submission
        document.getElementById('uploadForm').addEventListener('submit', async (event) => {
            event.preventDefault();

            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];

            if (!file) {
                alert('Please select a file.');
                return;
            }

            // Upload the file and get metadata
            await uploadPDFAndGetMetadata(file);
        });
