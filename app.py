import random
from flask import Flask, render_template, redirect, url_for, request, flash, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from flask_uploads import UploadSet, configure_uploads, IMAGES, patch_request_class
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Замените на ваш секретный ключ
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Настройка загрузки файлов
app.config['UPLOADED_PHOTOS_DEST'] = 'static/uploads'
photos = UploadSet('photos', IMAGES)
configure_uploads(app, photos)
patch_request_class(app)  # Для обработки загрузки файлов

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.init_app(app)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    coins = db.Column(db.Integer, default=100)
    casino_spins = db.Column(db.Integer, default=0)
    dice_rolls = db.Column(db.Integer, default=0)
    tasks_solved = db.Column(db.Integer, default=0)
    clicks = db.Column(db.Integer, default=0)
    description = db.Column(db.String(200), default='')
    photo = db.Column(db.String(100), default='default.jpg')

    def is_active(self):
        return True

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/edit_profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    if request.method == 'POST':
        current_user.username = request.form['username']
        current_user.description = request.form['description']

        if 'photo' in request.files and request.files['photo'].filename != '':
            try:
                filename = photos.save(request.files['photo'])
                current_user.photo = filename
            except Exception as e:
                flash(f'Error uploading file: {e}')
                return redirect(url_for('edit_profile'))

        db.session.commit()
        flash('Profile updated successfully!')
        return redirect(url_for('profile'))

    return render_template('edit_profile.html', user=current_user)

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('main_menu'))
        else:
            flash('Invalid username or password')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        # Проверка на существование пользователя
        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return redirect(url_for('register'))

        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful! Please log in.')
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/main_menu')
@login_required
def main_menu():
    return render_template('main_menu.html')

@app.route('/games')
@login_required
def games():
    return render_template('games.html')

@app.route('/casino')
@login_required
def casino():
    print('casino')
    return render_template('casino.html')

@app.route('/spin', methods=['POST'])
@login_required
def spin():
    print(1)
    bet = request.form.get('bet', type=int)
    if bet is None or bet <= 0 or bet > current_user.coins:
        return jsonify({'error': 'Invalid bet'}), 400
    current_user.casino_spins += 1

    current_user.coins -= bet
    db.session.commit()

    return jsonify({'coins': current_user.coins})

@app.route('/check_win', methods=['POST'])
@login_required
def check_win():
    print(2)
    data = request.get_json()
    symbols = data['symbols']
    bet = data['bet']

    if symbols[0] == symbols[1] == symbols[2]:
        current_user.coins += bet * 2
        db.session.commit()
        return jsonify({'result': 'win', 'coins': current_user.coins})
    else:
        db.session.commit()
        return jsonify({'result': 'lose', 'coins': current_user.coins})

@app.route('/dice')
@login_required
def dice():
    return render_template('dice.html')

@app.route('/roll_dice', methods=['POST'])
@login_required
def roll_dice():
    bet = request.form.get('bet', type=int)
    target = request.form.get('target', type=int)
    dice_result = request.form.get('dice_result', type=int)

    if bet is None or bet <= 0 or bet > current_user.coins:
        return jsonify({'error': 'Invalid bet'}), 400

    if target < 1 or target > 6:
        return jsonify({'error': 'Invalid target number'}), 400

    current_user.coins -= bet
    current_user.dice_rolls += 1
    db.session.commit()

    # Логика для определения выигрыша
    win = dice_result == target
    if win:
        current_user.coins += bet * 2
        db.session.commit()
        return jsonify({'result': 'win', 'coins': current_user.coins})
    else:
        db.session.commit()
        return jsonify({'result': 'lose', 'coins': current_user.coins})

@app.route('/tasks')
@login_required
def tasks():
    return render_template('tasks.html')

@app.route('/clicker')
@login_required
def clicker():
    return render_template('clicker.html', current_user=current_user)

@app.route('/update_balance', methods=['POST'])
@login_required
def update_balance():
    balance = request.form.get('balance', type=int)
    current_user.coins = balance
    current_user.clicks += 1
    db.session.commit()
    return jsonify({'balance': current_user.coins})

@app.route('/profile')
@login_required
def profile():
    achievements = {
        'casino_spins': get_achievement_image(current_user.casino_spins),
        'dice_rolls': get_achievement_image(current_user.dice_rolls),
        'tasks_solved': get_achievement_image(current_user.tasks_solved),
        'clicks': get_achievement_image(current_user.clicks)
    }
    return render_template('profile.html', user=current_user, achievements=achievements)

def get_achievement_image(count):
    if count >= 5000:
        return 'dimond.jpg'
    elif count >= 2000:
        return 'izumrud.jpg'
    elif count >= 1000:
        return 'gold.jpg'
    elif count >= 500:
        return 'silver.jpg'
    elif count >= 100:
        return 'bronze.jpg'
    else:
        return 'no.jpg'


@app.route('/profile/<int:user_id>')
@login_required
def view_profile(user_id):
    user = User.query.get_or_404(user_id)
    achievements = {
        'casino_spins': get_achievement_image(user.casino_spins),
        'dice_rolls': get_achievement_image(user.dice_rolls),
        'tasks_solved': get_achievement_image(user.tasks_solved),
        'clicks': get_achievement_image(user.clicks)
    }
    return render_template('profile_another_user.html', user=user, achievements=achievements)

@app.route('/top')
@login_required
def top():
    users = User.query.order_by(User.coins.desc()).all()
    return render_template('top.html', users=users)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

if __name__ == '__main__':
    os.makedirs(app.config['UPLOADED_PHOTOS_DEST'], exist_ok=True)
    with app.app_context():
        db.create_all()
    app.run(debug=True)
