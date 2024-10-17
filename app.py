from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user
from db_config import get_db_connection
from ultralytics import YOLO
import numpy as np
import firebase_admin
from firebase_admin import credentials, storage
import numpy as np
import base64
import cv2
 
app = Flask(__name__)
app.secret_key = 'W3bD3v3l0pm3nt'

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Cargar diferentes modelos para detectar comportamientos
# Inicializar la aplicación de Firebase
cred = credentials.Certificate("credentialFB/credentialFirebase.json")  # Cambia esto por tu archivo de credenciales JSON
firebase_admin.initialize_app(cred, {
    'storageBucket': 'modelos-138a7.appspot.com'  # Cambia esto por el nombre de tu bucket en Firebase
})

bucket = storage.bucket()
#LOCAL
#model_bebiendo = YOLO('../modelos/bebiendo/yolov8n.pt')
#model_cara = YOLO('../modelos/cara/yolov8n.pt')
#model_comportamiento2 = YOLO('modelos/comiendo/yolov8n.pt')
#model_comportamiento = YOLO('../modelos/comportamiento/yolov8_cerdos.pt')
#model_enfermedad = YOLO('../modelos/enfermedad/yolov8n.pt')
#model_oreja = YOLO('../modelos/oreja/yolov8n.pt')
#model_postura = YOLO('../modelos/postura/yolov8n.pt')

class User(UserMixin):
    def __init__(self, id, username, password):
        self.id = id
        self.username = username
        self.password = password


#Probando STOREPROCEDURE
@login_manager.user_loader
def load_user(user_id):
    connection = get_db_connection()
    
    try:
        with connection.cursor() as cursor:
            # Llamar al procedimiento almacenado
            cursor.callproc('sp_getUserById', [user_id])            
            # Obtener los resultados
            result = cursor.fetchall()
            if result:
                account = result[0]  # Toma el primer resultado
                return User(account['id'], account['username'], account['password'])
    finally:
        connection.close()

    return None
#SELECT NORMAL
#@login_manager.user_loader
#def load_user(user_id):
#    connection = get_db_connection()
    
#    with connection.cursor() as cursor:
#        cursor.execute('SELECT id,names,last_names,password,username FROM users WHERE id = %s', (user_id,))
#        account = cursor.fetchone()
#    connection.close()
#    if account:
#        return User(account['id'], account['username'], account['password'])
#    return None


#decorador 
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
    
        username = request.form['username']
        password = request.form['password']
        names    = ""
         # Log the received data
        app.logger.debug(f"Received login request with username: {username}")
        # Authentication logic here
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT id,names,last_names,password,username "+
                    "FROM users WHERE username = %s AND password = %s", (username, password,))
            account = cursor.fetchone()
        connection.close()
        
        if account:
            user = User(account['id'], account['username'], account['password'])
            login_user(user)
            session['user_id'] = account['id']
            session['names'] = account['names']
            return redirect(url_for('home'))
        else:
            flash('Incorrect username or password')
    
    return render_template('login.html')

@app.route('/')
@login_required
def index():
    return redirect(url_for('home'))

@app.route('/home')
@login_required
def home():
    names = session.get('names')
    return render_template('home.html', title="Prevención de Enfermedades en Cerdos", header="Prevención de Enfermedades en Cerdos")

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# Ruta para listar usuarios
@app.route('/users')
def list_users():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute('SELECT id,names,last_names,password,username FROM users')
        users = cursor.fetchall()
    connection.close()
    return render_template('list_users.html', users=users, title="Usuarios", header="Usuarios")


# Ruta para crear un nuevo usuario
@app.route('/users/create', methods=['GET', 'POST'])
def create_user():
    if request.method == 'POST':
        username    = request.form['username']
        names       = request.form['names']
        last_names  = request.form['last_names']
        password    = request.form['password']

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute('INSERT INTO users (username, names, last_names, password)'
                            +'VALUES (%s, %s, %s, %s)',
                           (username, names, last_names, password))
            connection.commit()
        connection.close()
        flash('User created successfully!')
        return redirect(url_for('list_users'))

    return render_template('create_user.html', title="Nuevo usuario", header="Nuevo usuario")

# Ruta para actualizar un usuario
@app.route('/users/update/<int:id>', methods=['GET', 'POST'])
def update_user(id):
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute('SELECT id,names,last_names,password,username FROM users WHERE id = %s', (id,))
        user = cursor.fetchone()

    if request.method == 'POST':
        username    = request.form['username']
        names       = request.form['names']
        last_names  = request.form['last_names']
        password    = request.form['password']

        with connection.cursor() as cursor:
            cursor.execute('UPDATE users SET password = %s, username = %s, names = %s, last_names = %s WHERE id = %s',
                           (password, username, names, last_names, id))
            connection.commit()
        connection.close()
        flash('User updated successfully!')
        return redirect(url_for('list_users'))

    connection.close()
    return render_template('update_user.html', user=user, title="Actualizar usuario", header="Actualizar usuario")

# Ruta para eliminar un usuario
@app.route('/users/delete/<int:id>')
def delete_user(id):
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute('DELETE FROM users WHERE id = %s', (id,))
        connection.commit()
    connection.close()
    flash('User deleted successfully!')
    return redirect(url_for('list_users'))

# Ruta para listar usuarios
@app.route('/group')
def group():
    return render_template('group.html',  title="Corral 1", header="Corral 1")

def registrar_movimiento_detectado():
    connection = get_db_connection()
    query = "INSERT INTO movimientos_detectados (clase) VALUES (%s)"
    values = ('Movimiento')
    with connection.cursor() as cursor:
        cursor.execute(query,values)
        connection.commit()
    connection.close()

def decode_imageModel(image_data):
    # Decodifica los bytes de la imagen usando OpenCV
    nparr = np.frombuffer(image_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def decode_image(image_data):
    # Decodifica la imagen del formato base64
    image_data = base64.b64decode(image_data.split(',')[1])
    np_arr = np.frombuffer(image_data, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return image

def process_images(image1, image2):
    # Convertir imágenes a escala de grises y aplicar desenfoque
    gray1 = cv2.cvtColor(image1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(image2, cv2.COLOR_BGR2GRAY)
    gray1 = cv2.GaussianBlur(gray1, (21, 21), 0)
    gray2 = cv2.GaussianBlur(gray2, (21, 21), 0)
    
    # Calcular la diferencia entre las imágenes
    diff = cv2.absdiff(gray1, gray2)
    _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
    dilated = cv2.dilate(thresh, None, iterations=2)
    
    # Encontrar contornos
    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    detections = []

    for contour in contours:
        if cv2.contourArea(contour) < 500:
            continue
        
        x, y, w, h = cv2.boundingRect(contour)
        detection = {
            'class': 'Movimiento',
            'x1': x,
            'y1': y,
            'x2': x + w,
            'y2': y + h
        }
        detections.append(detection)
    
    return detections

@app.route('/process_images', methods=['POST'])
def process_images_route():
    data = request.json
    image1 = decode_image(data['image1'])
    image2 = decode_image(data['image2'])
    
    detections = process_images(image1, image2)

    if len(detections) > 0:
        registrar_movimiento_detectado()
    
    return jsonify({'detections': detections})

@app.route('/process_images_modelo', methods=['POST'])
def process_image_route_modelo():
     # Descargar el modelo de Firebase a un archivo temporal
    blob_name = 'fb/modelos/bebiendo/yolov8n.pt'  # Ruta del archivo en Firebase

    # Cargar el modelo para detectar si el cerdo está bebiendo desde el archivo temporal
    model_bebiendo = YOLO(blob_name)

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Lee la imagen y la procesa
    image = file.read()  # Lee la imagen
    image = decode_imageModel(image)  # Decodifica la imagen

    # Procesa la imagen con el modelo
    detecciones = processImgModel(image, model_bebiendo)

    # Contar cuántos cerdos están bebiendo
    cerdos_bebiendo = sum(1 for d in detecciones if d['class'] == 'bebiendo')

    result = {
        'total_cerdos': len(detecciones),
        'cerdos_bebiendo': cerdos_bebiendo,
        'detecciones': detecciones
    }
    return jsonify(result)

###############estaba antes################
    #data = request.json
    #image_data = data['image']
    
    # Decodificar la imagen
    #image = decode_image(image_data)

    # Procesar la imagen con varios modelos
    #deteccion_modelo1 = procesar_imagen_con_modelo(image, model_bebiendo)
    #deteccion_modelo2 = procesar_imagen_con_modelo(image, model_cara)
    #deteccion_modelo3 = procesar_imagen_con_modelo(image, model_comportamiento)
    #deteccion_modelo4 = procesar_imagen_con_modelo(image, model_enfermedad)
    #deteccion_modelo5 = procesar_imagen_con_modelo(image, model_oreja)
    #deteccion_modelo6 = procesar_imagen_con_modelo(image, model_postura)

    # Combinar todas las detecciones
    #all_detections = {
    #    'modelo1_Bebiendo': deteccion_modelo1,
    #    'modelo2_Cara': deteccion_modelo2,
    #    'modelo3_Comportamiento': deteccion_modelo3,
    #    'modelo4_Enfermedad': deteccion_modelo4,
    #    'modelo5_Oreja': deteccion_modelo5,
    #    'modelo6_Postura': deteccion_modelo6
    #}

    # Log para ver si las detecciones se están generando
    #print("Detecciones generadas:", all_detections)

    #return jsonify(all_detections)
def processImgModel(image, model_bebiendo):
    """Función para procesar una imagen con el modelo específico"""
    results = model_bebiendo.predict(image)
    detecciones = []

    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0]
            conf = box.conf[0]
            cls = box.cls[0]
            detecciones.append({
                'class': model_bebiendo.names[int(cls)],
                'x1': int(x1),
                'y1': int(y1),
                'x2': int(x2),
                'y2': int(y2),
                'confidence': float(conf)
            })
    return detecciones


def guardar_detecciones_bd(detecciones):
    """Función para guardar las detecciones en la base de datos"""
    connection = get_db_connection()
    query = """
        INSERT INTO detecciones (modelo, clase, x1, y1, x2, y2, confianza)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    
    # Recorremos las detecciones de cada modelo y las guardamos
    for modelo, detecciones_modelo in detecciones.items():
        for deteccion in detecciones_modelo:
            values = (
                modelo,
                deteccion['class'],
                deteccion['x1'],
                deteccion['y1'],
                deteccion['x2'],
                deteccion['y2'],
                deteccion['confidence']
            )
            with connection.cursor() as cursor:
                cursor.execute(query, values)
                connection.commit()
    connection.close()


@app.route('/report-movements')
def deteccionPorHora():
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT DATE_FORMAT(created_at, '%H:%i') AS minute,COUNT(*) AS movement_count "+
                        "FROM movimientos_detectados WHERE created_at >= NOW() - INTERVAL 10 MINUTE "+
                        "GROUP BY minute ORDER BY minute ASC")
        items = cursor.fetchall()
    connection.close()
    return jsonify(items=items)

if __name__ == '__main__':
    app.run(debug=True)

