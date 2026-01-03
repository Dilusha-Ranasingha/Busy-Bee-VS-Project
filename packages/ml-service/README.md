cd packages/ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python.exe -m pip install --upgrade pip
uvicorn app.main:app --reload --port 8001