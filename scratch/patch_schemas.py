import re

with open("backend/app/schemas.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add photo_log_id to JobPhotoExtraction
content = content.replace(
    "    texto_crudo: Optional[str] = None",
    "    texto_crudo: Optional[str] = None\n    photo_log_id: Optional[int] = None"
)

# Add photo_log_id to JobFromPhotoConfirm
content = content.replace(
    "    texto_ocr: Optional[str] = None",
    "    texto_ocr: Optional[str] = None\n    photo_log_id: Optional[int] = None"
)

with open("backend/app/schemas.py", "w", encoding="utf-8") as f:
    f.write(content)
