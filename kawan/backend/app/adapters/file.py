"""File evidence adapter (spec §10.3 extension). Accepts .txt/.md/.csv (decoded
as UTF-8) and .pdf/.docx (binary-parsed to text via pypdf / python-docx).
Legacy .doc is rejected with a friendly message -- the binary format requires
disproportionate effort and the user can save as .docx or take a screenshot.

Text is extracted here then passed to the same text judge (JUDGE_SYSTEM +
VERDICT_SCHEMA) used by the GitHub adapter. File bytes are NEVER persisted;
raw_ref keeps only the filename, mirroring screenshot privacy."""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.contracts import EvidenceBundle, Verdict
from app.prompts import GITHUB_JUDGE_MODELS, JUDGE_SYSTEM, VERDICT_SCHEMA

if TYPE_CHECKING:
    from app.chutes import ChutesClient
    from app.models import Commitment


def _extract_text(filename: str, raw: bytes) -> str:
    """Extract plain text from the file bytes, dispatching by extension."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in ("txt", "md", "csv"):
        return raw.decode("utf-8", errors="replace")

    if ext == "pdf":
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(raw))
        parts = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(parts)

    if ext == "docx":
        import io
        from docx import Document
        doc = Document(io.BytesIO(raw))
        return "\n".join(p.text for p in doc.paragraphs)

    # Unrecognised extension -- return empty string; the caller will return unclear.
    return ""


class FileAdapter:
    type = "file"
    trust = "medium"

    def __init__(self, chutes: "ChutesClient") -> None:
        self._chutes = chutes

    async def fetch(self, commitment: "Commitment", since) -> EvidenceBundle:
        # Uploads are judged directly via the route; fetch is a no-op here.
        return EvidenceBundle(adapter="file", raw_ref={"filename": None}, items=[],
                              summary="no file")

    async def judge(self, commitment: "Commitment", bundle: EvidenceBundle, llm) -> Verdict:
        if not bundle.items:
            return Verdict("unclear", 0.4, ["no file content received"],
                           "No file was supplied to judge.",
                           "Upload a document showing your work and I'll review it.")
        item = bundle.items[0]
        text = item.get("text", "").strip()
        if not text:
            return Verdict("unclear", 0.4, ["file contained no extractable text"],
                           "Could not extract text from the file.",
                           "Try a different format or paste the content as text.")
        messages = [
            {"role": "system", "content": JUDGE_SYSTEM},
            {"role": "user", "content":
                f"Commitment: I will {commitment.action} {commitment.deliverable} "
                f"by {commitment.deadline:%Y-%m-%d %H:%M}.\n"
                f"File name: {item.get('filename', 'unknown')}\n"
                f"File content:\n{text[:4000]}\n"
                "Judge whether this document shows real progress toward the deliverable."},
        ]
        r = await self._chutes.structured(
            user_id=commitment.user_id, model=GITHUB_JUDGE_MODELS, messages=messages,
            schema=VERDICT_SCHEMA, schema_name="verdict", max_tokens=1024,
        )
        return Verdict(r["verdict"], r["confidence"], r["observations"], r["reasoning"],
                       r.get("follow_up_request"))
