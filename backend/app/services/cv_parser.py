import io
import re
import pdfplumber

_WS_RE = re.compile(r"[ \t]+")
_BLANK_RE = re.compile(r"\n{3,}")
_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def _clean(text: str) -> str:
    text = _CTRL_RE.sub("", text)
    text = _WS_RE.sub(" ", text)
    text = _BLANK_RE.sub("\n\n", text)
    return text.strip()


def _extract_one_page(page) -> str:
    try:
        t = page.extract_text(layout=True, x_tolerance=2, y_tolerance=3) or ""
    except Exception:
        t = ""
    if len(t.strip()) < 10:
        try:
            words = page.extract_words(x_tolerance=2, y_tolerance=3)
            t = " ".join(w.get("text", "") for w in words)
        except Exception:
            pass
    if len(t.strip()) < 10:
        try:
            t = page.extract_text() or ""
        except Exception:
            t = ""
    return t


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            t = _extract_one_page(page)
            if t and t.strip():
                parts.append(t)
    return _clean("\n\n".join(parts))
