
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import subprocess

UPLOAD_FOLDER = './uploads'
DXF_FOLDER = './converted'

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DXF_FOLDER'] = DXF_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DXF_FOLDER, exist_ok=True)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.lower().endswith('.dwg'):
        filename = secure_filename(file.filename)
        dwg_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(dwg_path)

        # Conversion avec OdaFileConverter (assume installé et accessible dans PATH)
        dxf_filename = filename.rsplit('.', 1)[0] + '.dxf'
        dxf_path = os.path.join(app.config['DXF_FOLDER'], dxf_filename)

        try:
            subprocess.run([
                'OdaFileConverter',  # Assure-toi que ce programme est installé
                app.config['UPLOAD_FOLDER'],
                app.config['DXF_FOLDER'],
                'ACAD2013', '1', '0'  # Version DXF, recurse, audit
            ], check=True)
        except Exception as e:
            return jsonify({'error': 'Conversion failed', 'details': str(e)}), 500

        return jsonify({'message': 'File uploaded and converted', 'dxf_file': dxf_filename}), 200

    return jsonify({'error': 'Invalid file type'}), 400

if __name__ == '__main__':
    app.run(debug=True)
