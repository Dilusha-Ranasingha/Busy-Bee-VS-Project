from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['DATABASE_URL'] = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/busy_bee')
app.config['FLASK_ENV'] = os.getenv('FLASK_ENV', 'development')

# Import routes
from routes.forecast_routes import forecast_bp
from routes.plan_routes import plan_bp

# Register blueprints
app.register_blueprint(forecast_bp, url_prefix='/api/ml')
app.register_blueprint(plan_bp, url_prefix='/api/ml')

# Health check
@app.route('/health', methods=['GET'])
def health_check():
    return {'status': 'healthy', 'service': 'ml-forecasting'}, 200

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
