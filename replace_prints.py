import re

files = [
    'backend/app/services/deepseek_engine.py',
    'backend/app/services/chatbot_engine.py',
    'backend/app/services/email_service.py'
]

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'import logging' not in content:
        content = "import logging\n\nlogger = logging.getLogger(__name__)\n\n" + content

    content = re.sub(r'print\(f"(.*?)"\)', r'logger.error(f"\1")', content)
    content = re.sub(r"print\(f'(.*?)'\)", r"logger.error(f'\1')", content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
