import os
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, Any

# Initialize Firebase using Application Default Credentials (ADC)
# or a service account key path if provided.
if not firebase_admin._apps:
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    if cred_path:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # Falls back to ADC in Cloud Run
        firebase_admin.initialize_app()

db = firestore.client()

class FirebaseService:
    @staticmethod
    async def save_blueprint(blueprint_data: Dict[str, Any]) -> str:
        """
        Saves a generated blueprint to Firestore.
        """
        doc_ref = db.collection("blueprints").document()
        blueprint_data["timestamp"] = firestore.SERVER_TIMESTAMP
        doc_ref.set(blueprint_data)
        return doc_ref.id

    @staticmethod
    async def get_latest_blueprints(limit: int = 10):
        """
        Retrieves the most recent blueprints.
        """
        docs = db.collection("blueprints").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]

firebase_service = FirebaseService()
