import subprocess
import os

def sync_env_to_vercel():
    env_file = ".env"
    if not os.path.exists(env_file):
        print(".env file not found")
        return

    with open(env_file, "r") as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        
        if "=" in line:
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            print(f"Syncing {key} to Vercel...")
            
            # Remove existing to be sure
            subprocess.run(f"npx vercel env rm {key} -y", shell=True, capture_output=True)
            
            # Add new value using direct input to avoid shell echo issues
            try:
                subprocess.run(
                    ["npx", "vercel", "env", "add", key, "production"],
                    input=value.encode(),
                    check=True,
                    shell=True
                )
            except Exception as e:
                print(f"Failed to add {key}: {e}")

if __name__ == "__main__":
    sync_env_to_vercel()
