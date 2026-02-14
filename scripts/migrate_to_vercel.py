
import os

FUNCTION_DIR = "netlify/functions"
API_DIR = "api"
WRAPPER_PATH = "./utils/wrapper"

if not os.path.exists(API_DIR):
    os.makedirs(API_DIR)

for filename in os.listdir(FUNCTION_DIR):
    if filename.endswith(".ts") and not filename.startswith("_") and "lib" not in filename:
        func_name = filename[:-3]  # Remove .ts
        
        content = f"""import {{ handler }} from '../netlify/functions/{func_name}';
import {{ vercelWrapper }} from '{WRAPPER_PATH}';

export default vercelWrapper(handler as any);
"""
        
        with open(f"{API_DIR}/{filename}", "w") as f:
            f.write(content)

print(f"Migrated {len(os.listdir(FUNCTION_DIR))} functions to Vercel API format.")
