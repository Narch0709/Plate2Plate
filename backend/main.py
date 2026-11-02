from fastapi import FastAPI

app = FastAPI(title="Plate2Plate API")

@app.get("/")
def home():
    return {"message": "Plate2Plate API is running"}