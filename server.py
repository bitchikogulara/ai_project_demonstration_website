import os
import sys
import subprocess

print("==========================================================================")
print("             Pacman Convergence Simulator - Local Runner                  ")
print("==========================================================================")

# Check dependencies
required_packages = ["flask", "flask-cors"]
missing_packages = []

for pkg in required_packages:
    try:
        if pkg == "flask-cors":
            __import__("flask_cors")
        else:
            __import__(pkg)
    except ImportError:
        missing_packages.append(pkg)

if missing_packages:
    print(f"\n[!] Missing required Python libraries: {', '.join(missing_packages)}")
    print("Attempting to auto-install dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing_packages])
        print("[+] Successfully installed dependencies!\n")
    except Exception as e:
        print(f"[-] Auto-installation failed: {str(e)}")
        print("\nPlease run the following command manually to install requirements:")
        print(f"    {sys.executable} -m pip install -r requirements.txt")
        print("==========================================================================\n")
        sys.exit(1)

from flask import send_from_directory
from api.index import app

# Resolve absolute path to the static folder from the project root
STATIC_DIR = os.path.abspath('static')

# Local development static asset routing
# Maps root '/' to serve index.html from static/
@app.route('/')
def local_index():
    return send_from_directory(STATIC_DIR, 'index.html')

# Maps '/<filename>' to serve from static/ directly
@app.route('/<path:path>')
def local_static_assets(path):
    # Security check to prevent directory traversal
    safe_path = os.path.normpath(path)
    if safe_path.startswith("..") or safe_path.startswith("/"):
        return "Invalid path", 400
    
    # Check if the requested file exists in the static folder
    static_file_path = os.path.join(STATIC_DIR, safe_path)
    if os.path.exists(static_file_path):
        return send_from_directory(STATIC_DIR, safe_path)
    
    # Otherwise return 404
    return "Not Found", 404


if __name__ == "__main__":
    port = 8000
    print(f"\n[+] Local Server running on: http://localhost:{port}")
    print("[+] Press Ctrl+C to stop the server.")
    print("==========================================================================\n")
    
    # Run Flask app locally on port 8000
    app.run(host="127.0.0.1", port=port, debug=False)
