import os
from typing import Dict, Any

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    firebase_admin = None
    credentials = None
    firestore = None

db = None
if firebase_admin is not None and firestore is not None:
    # Initialize Firebase using Application Default Credentials (ADC)
    # or a service account key path if provided.
    try:
        if not firebase_admin._apps:
            cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT")
            project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
            if cred_path:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            elif project_id:
                firebase_admin.initialize_app(options={"projectId": project_id})
            else:
                # Keep backend bootable in local mode without Firebase config.
                firebase_admin.initialize_app()
        db = firestore.client()
    except Exception:
        # Local fallback mode: Firestore unavailable, keep app import-safe.
        db = None

class FirebaseService:
    _local_store = []

    @staticmethod
    async def save_blueprint(blueprint_data: Dict[str, Any]) -> str:
        """
        Saves a generated blueprint to Firestore.
        """
        if db is None or firestore is None:
            local_id = f"local-{len(FirebaseService._local_store) + 1}"
            FirebaseService._local_store.append({"id": local_id, **blueprint_data})
            return local_id

        doc_ref = db.collection("blueprints").document()
        blueprint_data["timestamp"] = firestore.SERVER_TIMESTAMP
        doc_ref.set(blueprint_data)
        return doc_ref.id

    @staticmethod
    async def get_latest_blueprints(limit: int = 10):
        """
        Retrieves the most recent blueprints.
        """
        if db is None or firestore is None:
            return FirebaseService._local_store[-limit:][::-1]

        docs = db.collection("blueprints").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]

firebase_service = FirebaseService()
