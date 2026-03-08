import os
import sys
import time
from pathlib import Path
from huggingface_hub import HfApi, create_repo
from dotenv import dotenv_values

def load_secrets():
    secrets = {}
    
    # Load from Frontend/.env
    frontend_env_path = Path(__file__).parent / "Frontend" / ".env"
    if frontend_env_path.exists():
        secrets.update(dotenv_values(frontend_env_path))
        
    # Load from backend/.env just in case there are specific ones
    backend_env_path = Path(__file__).parent / "backend" / ".env"
    if backend_env_path.exists():
        secrets.update(dotenv_values(backend_env_path))
        
    return secrets

def deploy_to_hf():
    print("Automating Hugging Face Deployment & Resolving 1GB Limit...")
    api = HfApi()
    
    try:
        user_info = api.whoami()
        hf_username = user_info['name']
        print(f"Authenticated as: {hf_username}")
    except Exception as e:
        print(f"Could not authenticate with Hugging Face: {e}")
        return

    space_name = "ai-helpdesk-api"
    repo_id = f"{hf_username}/{space_name}"

    # 1. Delete the existing space to clear the 1GB storage limit
    print(f"Cleaning up old Space: {repo_id}...")
    try:
        api.delete_repo(repo_id=repo_id, repo_type="space")
        print("Successfully deleted old Space history to clear the 1GB quota!")
        time.sleep(5) # Let HF backend catch up
    except Exception as e:
        print(f"Skipping deletion (or error during deletion): {e}")

    # 2. Recreate the fresh space
    try:
        print(f"Creating fresh Docker Space: {repo_id}...")
        create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            private=False
        )
        print("Fresh Space created successfully!")

        # 3. Add Secrets
        print("Adding secrets to the Space...")
        secrets = load_secrets()
        
        # Hardcode the backend URL secret if it's missing or points to localhost
        secrets["VITE_BACKEND_URL"] = f"https://{hf_username}-{space_name}.hf.space"
        
        added_count = 0
        for key, value in secrets.items():
            if value and str(value).strip():
                try:
                    api.add_space_secret(repo_id=repo_id, key=key, value=str(value))
                    added_count += 1
                except Exception as e:
                    print(f"Warning: Could not add secret {key}: {e}")
                    
        print(f"Successfully added {added_count} secrets!")

        # 4. Upload backend code
        print("Uploading backend code to Hugging Face... (This might take a minute)")
        api.upload_folder(
            folder_path="backend",
            repo_id=repo_id,
            repo_type="space",
            commit_message="Automated deployment of AI Backend (1GB Quota Reset)",
            ignore_patterns=["venv/*", ".venv/*", "env/*", "__pycache__/*", "*.pyc", ".env", ".git/*", "models/classifier-v2/*", "models/classifier-v3/*", "models/classifier-v2", "models/classifier-v3"]
        )
        print("Upload complete!")
        print(f"Your backend is now building at: https://huggingface.co/spaces/{repo_id}")
        
    except Exception as e:
        print(f"\nError deploying to Hugging Face: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    import traceback
    deploy_to_hf()
