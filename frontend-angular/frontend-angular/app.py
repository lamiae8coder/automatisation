from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os
import subprocess
import ezdxf

UPLOAD_FOLDER = './uploads'
DXF_FOLDER = './converted'

app = Flask(__name__)
CORS(app)  # Pour autoriser les requêtes CORS depuis Angular

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DXF_FOLDER'] = DXF_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DXF_FOLDER, exist_ok=True)


# ✅ Fonction pour injecter les données du formulaire dans le DXF
def inject_form_data_to_dxf(dxf_path, data_dict):
    try:
        doc = ezdxf.readfile(dxf_path)
        msp = doc.modelspace()

        # Cherche tous les blocs avec des ATTRIBs
        for block in msp.query('INSERT'):
            for attrib in block.attribs:
                tag = attrib.dxf.tag
                if tag in data_dict:
                    attrib.dxf.text = str(data_dict[tag])

        # Sauvegarde le fichier modifié
        doc.saveas(dxf_path)
        print("✅ Données injectées dans le DXF")
    except Exception as e:
        print(f"❌ Erreur injection DXF : {e}")


# ✅ Route principale de téléchargement et de traitement
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        print("❌ Aucune partie de fichier trouvée dans la requête")
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    affaire_data = request.form.get('affaireData')

    if file.filename == '':
        print("❌ Aucun fichier sélectionné")
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.lower().endswith('.dwg'):
        filename = secure_filename(file.filename)
        dwg_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(dwg_path)
        print(f"✅ Fichier DWG enregistré : {dwg_path}")

        dxf_filename = filename.rsplit('.', 1)[0] + '.dxf'
        dxf_path = os.path.join(app.config['DXF_FOLDER'], dxf_filename)

        try:
            # 🔁 Conversion DWG -> DXF via ODAFileConverter
            result = subprocess.run([
                r"C:\Program Files\ODA\ODAFileConverter 26.5.0\ODAFileConverter.exe",
                os.path.abspath(app.config['UPLOAD_FOLDER']),
                os.path.abspath(app.config['DXF_FOLDER']),
                'ACAD2013', '1', '0'
            ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

            print("✅ Conversion réussie")

            # Injection des données si fournies
            if affaire_data:
                try:
                    import json
                    affaire_dict = json.loads(affaire_data)
                    inject_form_data_to_dxf(dxf_path, affaire_dict)
                except Exception as e:
                    print("⚠️ Erreur d'injection des données :", e)

            return jsonify({'message': 'File uploaded and converted', 'dxf_file': dxf_filename}), 200

        except subprocess.CalledProcessError as e:
            print("❌ Erreur de conversion :", e.stderr.decode())
            return jsonify({'error': 'Conversion failed', 'details': e.stderr.decode()}), 500

    print("❌ Type de fichier invalide")
    return jsonify({'error': 'Invalid file type'}), 400


if __name__ == '__main__':
    app.run(debug=True)
