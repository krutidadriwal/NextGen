from flask_cors import CORS
import os
import hashlib
import base64
import sqlite3
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from flask import Flask, render_template, request, redirect, url_for, session, flash,  jsonify


app = Flask(__name__)
app.secret_key = 'supersecretkey'
CORS(app)

# Generate RSA keys (In production, use securely managed keys)
key = RSA.generate(2048)
private_key = key.export_key()
public_key = key.publickey().export_key()

def init_sqlite_db():
    conn = sqlite3.connect('user_data.db')
    print("Opened database successfully")

    # Drop the table if it exists (only for resetting the database)
    conn.execute('''DROP TABLE IF EXISTS USERS''')
    conn.execute('''DROP TABLE IF EXISTS FILES''')
    conn.execute('''DROP TABLE IF EXISTS ORGANIZATIONS''')
    conn.execute('''DROP TABLE IF EXISTS APPROVALS''')

    # Create the USERS table
    conn.execute('''CREATE TABLE IF NOT EXISTS USERS
           (ID INTEGER PRIMARY KEY AUTOINCREMENT,
           USERNAME TEXT NOT NULL,
           PASSWORD TEXT NOT NULL,
           METAMASK_ADDRESS TEXT NOT NULL);''')
    print("Users table created successfully")

    # Create the FILES table
    conn.execute('''CREATE TABLE IF NOT EXISTS FILES
           (ID INTEGER PRIMARY KEY AUTOINCREMENT,
           USERNAME TEXT NOT NULL,
           FILE_NAME TEXT NOT NULL,
           FILE_ID TEXT NOT NULL);''')
    print("Files table created successfully")

    # Create the ORGANIZATIONS table
    conn.execute('''CREATE TABLE IF NOT EXISTS ORGANIZATIONS
           (ID INTEGER PRIMARY KEY AUTOINCREMENT,
           NAME TEXT NOT NULL,
           EMAIL TEXT NOT NULL,
           PASSWORD TEXT NOT NULL);''')
    print("Organizations table created successfully")

    # Create the APPROVALS table
    conn.execute('''CREATE TABLE IF NOT EXISTS APPROVALS
           (ID INTEGER PRIMARY KEY AUTOINCREMENT,
           USERNAME TEXT NOT NULL,
           ORGANIZATION_NAME TEXT NOT NULL,
           IPFS_HASH TEXT NOT NULL);''')
    print("Approvals table created successfully")

    conn.close()

# Call the function to initialize the database
init_sqlite_db()

# Function to generate file ID using SHA-256 hash of the IPFS hash
def generate_file_id(ipfs_hash):
    """
    Generates a SHA-256 hash as the file_id from the provided IPFS hash.
    This function returns a hexadecimal string of the SHA-256 hash.
    """
    sha256 = hashlib.sha256()
    sha256.update(ipfs_hash.encode('utf-8'))
    file_id = sha256.hexdigest()
    return file_id

@app.route('/generate_file_id', methods=['POST'])
def generate_file_id_endpoint():
    """
    A Flask route that accepts an IPFS hash as input and returns the generated file_id.
    """
    try:
        data = request.json
        ipfs_hash = data.get('ipfs_hash')

        if not ipfs_hash:
            return jsonify({'error': 'IPFS hash is required'}), 400

        file_id = generate_file_id(ipfs_hash)
        return jsonify({'file_id': file_id}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500





def verify_file_id(ipfs_hash, provided_file_id):
    """
    Verifies that the provided file ID matches the SHA-256 hash of the given IPFS hash.
    Returns True if the provided file ID is valid, otherwise False.
    """
    # Generate a new SHA-256 hash of the IPFS hash
    expected_file_id = generate_file_id(ipfs_hash)

    # Compare the provided file ID with the expected one
    return expected_file_id == provided_file_id




UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/get_file_id', methods=['GET'])
def get_file_id():
    # Assume the IPFS hash is provided as a query parameter in the URL
    ipfs_hash = request.args.get('ipfs_hash')

    # Connect to the SQLite database
    conn = sqlite3.connect('user_data.db')
    cursor = conn.cursor()

    # Query the database to find the file ID based on the IPFS hash
    cursor.execute("SELECT FILE_ID FROM FILES WHERE IPFS_HASH=?", (ipfs_hash,))
    result = cursor.fetchone()
    conn.close()

    # If the result exists, return it as JSON
    if result:
        file_id = result[0]
        return jsonify({'file_id': file_id})
    else:
        return jsonify({'error': 'File ID not found'}), 404



@app.route('/upload_documents', methods=['GET', 'POST'])
def upload_documents():
    if 'username' not in session:
        return redirect(url_for('user_login'))

    username = session['username']

    if request.method == 'POST':
        # Use request.files to access uploaded files
        file = request.files.get('document')  # Use .get() to avoid KeyError

        if file and file.filename:
            # Generate a secure file ID using SHA-256 hash
            secure_file_id = generate_file_id(file.filename)  # Modify to use the filename or other input

            # Print the generated file ID for debugging
            print(f"Generated file ID: {secure_file_id}")

            # Store the file details in the database
            conn = sqlite3.connect('user_data.db')
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO FILES (USERNAME, FILE_NAME, FILE_ID) VALUES (?, ?, ?)",
                (username, file.filename, secure_file_id)
            )
            conn.commit()
            conn.close()

            flash(f'File ID generated and stored: {secure_file_id}', 'success')
            return redirect(url_for('upload_documents'))
        else:
            flash('No file selected or file name is missing.', 'danger')

    # Retrieve the list of files and their IDs
    conn = sqlite3.connect('user_data.db')
    cursor = conn.cursor()
    cursor.execute("SELECT FILE_ID, FILE_NAME FROM FILES WHERE USERNAME=?", (username,))
    files = cursor.fetchall()
    conn.close()

    return render_template('upload_documents.html', files=files)
@app.route('/retrieve_file', methods=['POST'])
def retrieve_file():
    if 'username' not in session:
        return redirect(url_for('user_login'))

    # Get the IPFS hash from the form
    ipfs_hash = request.form.get('ipfs_hash')

    # Placeholder for the actual retrieval logic
    # For now, let's just flash a message or return a simple JSON response
    flash(f'Retrieve request received for IPFS Hash: {ipfs_hash}', 'info')
    return redirect(url_for('user_approve_access'))


# Connect to SQLite database
def init_sqlite_db():
    conn = sqlite3.connect('user_data.db')
    print("Opened database successfully")

    # Drop the table if it exists (if resetting)
    conn.execute('''DROP TABLE IF EXISTS FILES''')

    # Create the table with USERNAME, FILE_ID, and FILE_NAME columns
    conn.execute('''CREATE TABLE IF NOT EXISTS FILES
           (ID INTEGER PRIMARY KEY AUTOINCREMENT,
           USERNAME TEXT NOT NULL,
           FILE_NAME TEXT NOT NULL,
           FILE_ID TEXT NOT NULL);''')
    print("Files table created successfully")
   


    # Create table for organizations if it doesn't exist
    conn.execute('''CREATE TABLE IF NOT EXISTS ORGANIZATIONS
           (ID INTEGER PRIMARY KEY AUTOINCREMENT,
           NAME TEXT NOT NULL,
           EMAIL TEXT NOT NULL,
           PASSWORD TEXT NOT NULL);''')
    print("Organizations table created successfully")

    
    # Create a table to store approved access between users and organizations
    conn.execute('''CREATE TABLE IF NOT EXISTS APPROVALS
           (ID INTEGER PRIMARY KEY AUTOINCREMENT,
           USERNAME TEXT NOT NULL,
           ORGANIZATION_NAME TEXT NOT NULL,
           IPFS_HASH TEXT NOT NULL);''')
    print("Approvals table created successfully")

    conn.execute('''CREATE TABLE IF NOT EXISTS FILES
           (ID INTEGER PRIMARY KEY AUTOINCREMENT,
           USERNAME TEXT NOT NULL,
           FILE_NAME TEXT NOT NULL);''')
    print("Files table created successfully")

    conn.close()

init_sqlite_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/organisation/')
def org_index():
    return render_template('org_index.html')

@app.route('/whyUs')
def whyUs():
    return render_template('whyUs.html')

# Routes for User Registration and Login

@app.route('/user/register/', methods=['GET', 'POST'])
def user_register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        metamask_address = request.form['metamask_address']

        # Insert the new user into the USERS table
        conn = sqlite3.connect('user_data.db')
        cursor = conn.cursor()
        cursor.execute("INSERT INTO USERS (USERNAME, PASSWORD, METAMASK_ADDRESS) VALUES (?, ?, ?)",
                       (username, password, metamask_address))
        conn.commit()
        conn.close()
        return redirect(url_for('user_login'))
    return render_template('user_register.html')

@app.route('/user/login/', methods=['GET', 'POST'])
def user_login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Verify user credentials
        conn = sqlite3.connect('user_data.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM USERS WHERE USERNAME=? AND PASSWORD=?", (username, password))
        user = cursor.fetchone()
        conn.close()

        if user:
            session['username'] = username
            session['metamask_address'] = user[3]
            return redirect(url_for('user_profile'))
        else:
            return "Invalid username or password"
    return render_template('user_login.html')

@app.route('/user/profile/')
def user_profile():
    if 'username' in session:
        username = session['username']
        metamask_address = session['metamask_address']
        return render_template('user_profile.html', username=username, metamask_address=metamask_address)
    else:
        return redirect(url_for('user_login'))

#user profile hyperlink pages


@app.route('/user_approve_access', methods=['GET', 'POST'])
def user_approve_access():
    if 'username' not in session:
        return redirect(url_for('user_login'))

    username = session['username']

    if request.method == 'POST':
        organization_name = request.form['organization_name']
        ipfs_hash = request.form['ipfs_hash']

        # Store the approval in the database
        conn = sqlite3.connect('user_data.db')
        cursor = conn.cursor()
        cursor.execute("INSERT INTO APPROVALS (USERNAME, ORGANIZATION_NAME, IPFS_HASH) VALUES (?, ?, ?)",
                       (username, organization_name, ipfs_hash))
        conn.commit()
        conn.close()

        flash(f'Access approved for organization: {organization_name}', 'success')
        return redirect(url_for('user_approve_access'))

    # Retrieve the list of approved organizations for this user
    conn = sqlite3.connect('user_data.db')
    cursor = conn.cursor()
    cursor.execute("SELECT ORGANIZATION_NAME, IPFS_HASH FROM APPROVALS WHERE USERNAME=?ORDER BY USERNAME ASC", (username,))
    approved_organizations = cursor.fetchall()
    conn.close()

    return render_template('user_approve_access.html', approved_organizations=approved_organizations)



@app.route('/verified_information', methods=['GET'])
def verified_information():
    if 'username' not in session:
        return redirect(url_for('user_login'))

    # Fetch and display metadata here
    return render_template('verified_information.html')



# Routes for Organization Registration and Login

@app.route('/organization/register/', methods=['GET', 'POST'])
def org_register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        password = request.form['password']

        # Insert the new organization into the ORGANIZATIONS table
        conn = sqlite3.connect('user_data.db')
        cursor = conn.cursor()
        cursor.execute("INSERT INTO ORGANIZATIONS (NAME, EMAIL, PASSWORD) VALUES (?, ?, ?)",
                       (name, email, password))
        conn.commit()
        conn.close()
        return redirect(url_for('org_login'))
    return render_template('org_register.html')

@app.route('/organization/login/', methods=['GET', 'POST'])
def org_login():
    if request.method == 'POST':
        organization_name = request.form['organization_name']
        password = request.form['password']

        # Verify organization credentials using organization name instead of email
        conn = sqlite3.connect('user_data.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ORGANIZATIONS WHERE NAME=? AND PASSWORD=?", (organization_name, password))
        organization = cursor.fetchone()
        conn.close()

        if organization:
            session['organization_name'] = organization_name
            session['organization_email'] = organization[2]  # Assuming the email is in the third column
            return redirect(url_for('org_profile'))
        else:
            flash('Invalid organization name or password', 'danger')
            return redirect(url_for('org_login'))

    return render_template('org_login.html')


@app.route('/organization/profile/')
def org_profile():
    if 'organization_name' not in session:
        return redirect(url_for('org_login'))

    organization_name = session['organization_name']

    # Retrieve all approved access records for this organization
    conn = sqlite3.connect('user_data.db')
    cursor = conn.cursor()
    cursor.execute("SELECT USERNAME, IPFS_HASH FROM APPROVALS WHERE ORGANIZATION_NAME=? ORDER BY USERNAME ASC", (organization_name,))
    approvals = [{'username': row[0], 'ipfs_hash': row[1]} for row in cursor.fetchall()]
    conn.close()

    return render_template('org_profile.html', organization_name=organization_name, approvals=approvals)

    

@app.route('/approve_access', methods=['POST'])
def approve_access():
    if 'username' not in session:
        return redirect(url_for('user_login'))

    username = session['username']
    organization_name = request.form['organization_name']
    ipfs_hash = request.form['ipfs_hash']

    # Store the approval in the database
    conn = sqlite3.connect('user_data.db')
    cursor = conn.cursor()
    cursor.execute("INSERT INTO APPROVALS (USERNAME, ORGANIZATION_NAME, IPFS_HASH) VALUES (?, ?, ?)",
                   (username, organization_name, ipfs_hash))
    conn.commit()
    conn.close()

    flash('Access approved for organization: ' + organization_name, 'success')
    return redirect(url_for('user_profile'))


# Route for logging out
@app.route('/logout/')
def logout():
    session.clear()
    return redirect(url_for('user_login'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)