import os
import re

directories = ["src/user/pages", "src/user/components", "src/admin/pages"]

replacements = [
    (r'from [\'"]\.\./components/user/(.*?)[\'"]', r'from "../components/\1"'),
    (r'from [\'"]\.\./components/ui/(.*?)[\'"]', r'from "../../components/ui/\1"'),
    (r'from [\'"]\.\./ui/(.*?)[\'"]', r'from "../../components/ui/\1"'),
    (r'from [\'"]\.\./store/(.*?)[\'"]', r'from "../../store/\1"'),
    (r'from [\'"]\.\./services/(.*?)[\'"]', r'from "../../services/\1"'),
    (r'from [\'"]@/components/ui/(.*?)[\'"]', r'from "../../components/ui/\1"'),
]

for directory in directories:
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".jsx"):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                new_content = content
                for pattern, repl in replacements:
                    new_content = re.sub(pattern, repl, new_content)

                if new_content != content:
                    print(f"Updated {filepath}")
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
