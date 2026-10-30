from pymongo import MongoClient

from config import settings

_client: MongoClient | None = None


def connect_database() -> None:
    global _client
    if not settings.mongo_uri:
        return
    _client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        _client.admin.command("ping")
    except Exception:
        _client.close()
        _client = None


def close_database() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def ping_database() -> None:
    if _client is None:
        raise RuntimeError("Database is not connected")
    _client.admin.command("ping")


def patients_collection():
    if _client is None:
        raise RuntimeError("Database is not connected")
    return _client[settings.mongo_database]["patients"]
