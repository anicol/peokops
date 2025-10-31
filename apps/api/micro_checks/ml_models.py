"""
ML Model Management for Micro-Check Selection

This module handles loading, saving, and caching of ML models used for
adaptive check selection. Models are stored in S3 with local caching.
"""

import pickle
import os
import logging
from typing import Optional, Any
from datetime import datetime, timedelta

import boto3
from botocore.exceptions import ClientError
from django.core.cache import cache

from .ml_config import (
    S3_BUCKET,
    S3_PREFIX,
    LOCAL_CACHE_DIR,
    LOCAL_CACHE_TTL_SECONDS,
)

logger = logging.getLogger(__name__)


class MLModelManager:
    """Manages ML model storage, retrieval, and caching"""

    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.bucket = S3_BUCKET
        self.prefix = S3_PREFIX

        # Ensure local cache directory exists
        os.makedirs(LOCAL_CACHE_DIR, exist_ok=True)

    def load_model(self, brand_id: int, segment_id: Optional[str] = None) -> Optional[Any]:
        """
        Load ML model from cache or S3.

        Args:
            brand_id: Brand ID
            segment_id: Optional store segment (e.g., 'low_vol', 'med_vol', 'high_vol')

        Returns:
            sklearn model object, or None if not found
        """
        cache_key = self._get_cache_key(brand_id, segment_id)

        # Try Django cache first (in-memory)
        model = cache.get(cache_key)
        if model is not None:
            logger.info(f"Model cache hit for {cache_key}")
            return model

        # Try local file cache
        local_path = self._get_local_cache_path(brand_id, segment_id)
        if os.path.exists(local_path):
            # Check if cache is fresh
            mod_time = datetime.fromtimestamp(os.path.getmtime(local_path))
            if datetime.now() - mod_time < timedelta(seconds=LOCAL_CACHE_TTL_SECONDS):
                try:
                    with open(local_path, 'rb') as f:
                        model = pickle.load(f)
                    logger.info(f"Model loaded from local cache: {local_path}")
                    cache.set(cache_key, model, LOCAL_CACHE_TTL_SECONDS)
                    return model
                except Exception as e:
                    logger.warning(f"Failed to load from local cache: {e}")
                    os.remove(local_path)  # Remove corrupted cache

        # Load from S3
        try:
            s3_key = self._get_s3_key(brand_id, segment_id)
            logger.info(f"Loading model from S3: s3://{self.bucket}/{s3_key}")

            response = self.s3_client.get_object(Bucket=self.bucket, Key=s3_key)
            model_bytes = response['Body'].read()
            model = pickle.loads(model_bytes)

            # Cache locally and in Django cache
            with open(local_path, 'wb') as f:
                f.write(model_bytes)
            cache.set(cache_key, model, LOCAL_CACHE_TTL_SECONDS)

            logger.info(f"Model loaded successfully for brand={brand_id}, segment={segment_id}")
            return model

        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"No model found in S3 for brand={brand_id}, segment={segment_id}")
            else:
                logger.error(f"S3 error loading model: {e}")
            return None
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return None

    def save_model(
        self,
        model: Any,
        brand_id: int,
        segment_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> bool:
        """
        Save ML model to S3 with versioning and local cache.
        
        Saves both a versioned copy (with timestamp) and updates the 'latest' pointer.
        This enables rollback and audit capabilities.

        Args:
            model: sklearn model object
            brand_id: Brand ID
            segment_id: Optional store segment
            metadata: Optional metadata dict (training date, metrics, etc.)

        Returns:
            True if successful, False otherwise
        """
        try:
            import json
            import hashlib
            
            # Pickle model
            model_bytes = pickle.dumps(model)
            
            model_hash = hashlib.sha256(model_bytes).hexdigest()
            
            timestamp = datetime.now().strftime('%Y-%m-%dT%H-%M-%S')
            
            versioned_key = self._get_versioned_s3_key(brand_id, segment_id, timestamp)
            latest_key = self._get_s3_key(brand_id, segment_id)
            
            if metadata is None:
                metadata = {}
            metadata['model_hash'] = model_hash
            metadata['version_timestamp'] = timestamp
            metadata['s3_versioned_key'] = versioned_key
            
            metadata_bytes = json.dumps(metadata, indent=2).encode('utf-8')
            
            logger.info(f"Saving versioned model to S3: s3://{self.bucket}/{versioned_key}")
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=versioned_key,
                Body=model_bytes,
                ContentType='application/octet-stream',
            )
            
            versioned_metadata_key = versioned_key.replace('.pkl', '_metadata.json')
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=versioned_metadata_key,
                Body=metadata_bytes,
                ContentType='application/json',
            )
            
            logger.info(f"Updating latest model pointer: s3://{self.bucket}/{latest_key}")
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=latest_key,
                Body=model_bytes,
                ContentType='application/octet-stream',
            )
            
            latest_metadata_key = latest_key.replace('.pkl', '_metadata.json')
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=latest_metadata_key,
                Body=metadata_bytes,
                ContentType='application/json',
            )

            # Save to local cache
            local_path = self._get_local_cache_path(brand_id, segment_id)
            with open(local_path, 'wb') as f:
                f.write(model_bytes)

            # Update Django cache
            cache_key = self._get_cache_key(brand_id, segment_id)
            cache.set(cache_key, model, LOCAL_CACHE_TTL_SECONDS)

            logger.info(f"Model saved successfully: brand={brand_id}, segment={segment_id}, version={timestamp}, hash={model_hash[:8]}...")
            return True

        except Exception as e:
            logger.error(f"Error saving model: {e}")
            return False

    def get_model_metadata(self, brand_id: int, segment_id: Optional[str] = None) -> Optional[dict]:
        """
        Load metadata for a model (training date, metrics, feature names, etc.)

        Args:
            brand_id: Brand ID
            segment_id: Optional store segment

        Returns:
            Metadata dict or None if not found
        """
        try:
            s3_key = self._get_s3_key(brand_id, segment_id)
            metadata_key = s3_key.replace('.pkl', '_metadata.json')

            response = self.s3_client.get_object(Bucket=self.bucket, Key=metadata_key)
            metadata_bytes = response['Body'].read()

            import json
            metadata = json.loads(metadata_bytes.decode('utf-8'))
            return metadata

        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.warning(f"No metadata found for brand={brand_id}, segment={segment_id}")
            else:
                logger.error(f"S3 error loading metadata: {e}")
            return None
        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            return None

    def invalidate_cache(self, brand_id: int, segment_id: Optional[str] = None):
        """Invalidate cached model for a brand/segment"""
        cache_key = self._get_cache_key(brand_id, segment_id)
        cache.delete(cache_key)

        local_path = self._get_local_cache_path(brand_id, segment_id)
        if os.path.exists(local_path):
            os.remove(local_path)

        logger.info(f"Cache invalidated for brand={brand_id}, segment={segment_id}")

    def _get_cache_key(self, brand_id: int, segment_id: Optional[str]) -> str:
        """Generate Django cache key"""
        if segment_id:
            return f"ml_model:brand_{brand_id}:segment_{segment_id}"
        return f"ml_model:brand_{brand_id}"

    def _get_local_cache_path(self, brand_id: int, segment_id: Optional[str]) -> str:
        """Generate local filesystem cache path"""
        if segment_id:
            filename = f"brand_{brand_id}_segment_{segment_id}.pkl"
        else:
            filename = f"brand_{brand_id}.pkl"
        return os.path.join(LOCAL_CACHE_DIR, filename)

    def _get_s3_key(self, brand_id: int, segment_id: Optional[str]) -> str:
        """Generate S3 object key for latest model"""
        if segment_id:
            return f"{self.prefix}/brand_{brand_id}/{segment_id}/failure_predictor_latest.pkl"
        return f"{self.prefix}/brand_{brand_id}/failure_predictor_latest.pkl"
    
    def _get_versioned_s3_key(self, brand_id: int, segment_id: Optional[str], timestamp: str) -> str:
        """Generate versioned S3 object key with timestamp"""
        if segment_id:
            return f"{self.prefix}/brand_{brand_id}/{segment_id}/versions/failure_predictor_{timestamp}.pkl"
        return f"{self.prefix}/brand_{brand_id}/versions/failure_predictor_{timestamp}.pkl"
