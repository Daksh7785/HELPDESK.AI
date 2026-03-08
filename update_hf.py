import os
from huggingface_hub import HfApi

def deploy_to_hf():
    print("Updating Hugging Face Space...")
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

    try:
        # Upload backend code without touching secrets or recreating space
        print("Uploading backend code to Hugging Face... (This might take a minute)")
        api.upload_folder(
            folder_path="backend",
            repo_id=repo_id,
            repo_type="space",
            commit_message="Feat: Add beautifully styled HTML landing page to Root Endpoint",
            ignore_patterns=["venv/*", ".venv/*", "env/*", "__pycache__/*", "*.pyc", ".env", ".git/*"]
        )
        print("Upload complete!")
        print(f"Your backend is now building at: https://huggingface.co/spaces/{repo_id}")
        
    except Exception as e:
        print(f"\nError deploying to Hugging Face: {e}")
        print("Please ensure you are logged in via 'huggingface-cli login' or have a valid token.")

if __name__ == "__main__":
    deploy_to_hf()
