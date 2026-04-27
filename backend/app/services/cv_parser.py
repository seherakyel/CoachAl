import io
import pdfplumber


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                parts.append(t.strip())
    return "\n\n".join(parts).strip()
