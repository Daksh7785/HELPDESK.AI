import os
from huggingface_hub import HfApi

def deploy_to_hf():
    print("Updating Hugging Face Space (Syncing AI Backend)...")
    api = HfApi()
    
    try:
        user_info = api.whoami()
        hf_username = user_info['name']
        print(f"Authenticated as: {hf_username}")
    except Exception as e:
        print(f"Auth error: {e}")
        return

    repo_id = f"{hf_username}/ai-helpdesk-api"

    # Minimal set for live performance
    files_to_sync = [
        "backend/main.py",
        "backend/services/gemini_service.py"
    ]
    
    for f in files_to_sync:
        if os.path.exists(f):
            try:
                remote_path = os.path.basename(f) if "main.py" in f else f"services/{os.path.basename(f)}"
                api.upload_file(
                    path_or_fileobj=f,
                    path_in_repo=remote_path,
                    repo_id=repo_id,
                    repo_type="space"
                )
                print(f"✓ {remote_path} synced.")
            except Exception as e:
                print(f"✗ Failed {f}: {e}")

if __name__ == "__main__":
    deploy_to_hf()
