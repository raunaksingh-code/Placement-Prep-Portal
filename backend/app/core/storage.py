import os
from abc import ABC, abstractmethod
import boto3
from botocore.exceptions import ClientError
from typing import Optional

from app.core.config import settings

class StorageProvider(ABC):
    @abstractmethod
    def save(self, file_bytes: bytes, storage_key: str, content_type: str) -> None:
        pass

    @abstractmethod
    def get(self, storage_key: str) -> Optional[bytes]:
        pass

    @abstractmethod
    def delete(self, storage_key: str) -> None:
        pass

    @abstractmethod
    def get_presigned_url(self, storage_key: str, filename: str, content_type: str, expires_in: int = 3600) -> Optional[str]:
        pass


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = "local_storage"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_path(self, storage_key: str) -> str:
        # Prevent path traversal
        safe_key = os.path.basename(storage_key)
        return os.path.join(self.base_dir, safe_key)

    def save(self, file_bytes: bytes, storage_key: str, content_type: str) -> None:
        with open(self._get_path(storage_key), "wb") as f:
            f.write(file_bytes)

    def get(self, storage_key: str) -> Optional[bytes]:
        path = self._get_path(storage_key)
        if not os.path.exists(path):
            return None
        with open(path, "rb") as f:
            return f.read()

    def delete(self, storage_key: str) -> None:
        path = self._get_path(storage_key)
        if os.path.exists(path):
            os.remove(path)

    def get_presigned_url(self, storage_key: str, filename: str, content_type: str, expires_in: int = 3600) -> Optional[str]:
        # Local storage doesn't easily support presigned URLs without setting up a dedicated endpoint.
        # Returning None forces the caller to stream the bytes directly.
        return None


class S3StorageProvider(StorageProvider):
    def __init__(self, bucket_name: str, region_name: str, access_key: str, secret_key: str):
        self.bucket_name = bucket_name
        self.s3_client = boto3.client(
            "s3",
            region_name=region_name,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    def save(self, file_bytes: bytes, storage_key: str, content_type: str) -> None:
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=storage_key,
            Body=file_bytes,
            ContentType=content_type
        )

    def get(self, storage_key: str) -> Optional[bytes]:
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=storage_key)
            return response["Body"].read()
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                return None
            raise e

    def delete(self, storage_key: str) -> None:
        self.s3_client.delete_object(Bucket=self.bucket_name, Key=storage_key)

    def get_presigned_url(self, storage_key: str, filename: str, content_type: str, expires_in: int = 3600) -> Optional[str]:
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": storage_key,
                    "ResponseContentDisposition": f'attachment; filename="{filename}"',
                    "ResponseContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
            return url
        except ClientError:
            return None

def get_storage_provider() -> StorageProvider:
    provider_type = getattr(settings, "STORAGE_PROVIDER", "local")
    if provider_type == "s3":
        return S3StorageProvider(
            bucket_name=getattr(settings, "S3_BUCKET_NAME", ""),
            region_name=getattr(settings, "S3_REGION_NAME", ""),
            access_key=getattr(settings, "AWS_ACCESS_KEY_ID", ""),
            secret_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", ""),
        )
    return LocalStorageProvider()

storage = get_storage_provider()
