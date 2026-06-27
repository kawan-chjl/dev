// SubmissionPanel — shared inline submission GUI for Screenshot / File / GitHub link.
// Used by CheckinIsland and FinishIsland.
// Three modes each with client-side guardrails matching the backend.
// Verdicts always come from a real endpoint — never faked.

import { GitBranch, ImageIcon, Paperclip, X } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  ALLOWED_FILE_TYPES,
  ALLOWED_IMAGE_TYPES,
  type EvidenceVerdict,
  MAX_EVIDENCE_BYTES,
  submitGithubLink,
  uploadEvidence,
  uploadFileEvidence
} from '../commitments/api'

export type SubmissionMode = 'screenshot' | 'file' | 'github'

interface SubmissionPanelProps {
  commitmentId: string
  onVerdict: (verdict: EvidenceVerdict) => void
  onCancel: () => void
}

/** Validate a GitHub URL looks like a github.com repo, PR or commit URL. */
function isValidGithubUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.hostname !== 'github.com') return false
    // path must have at least /owner/repo
    const parts = u.pathname.split('/').filter(Boolean)
    return parts.length >= 2
  } catch {
    return false
  }
}

function bytesToMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SubmissionPanel({ commitmentId, onVerdict, onCancel }: SubmissionPanelProps) {
  const [mode, setMode] = useState<SubmissionMode | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [githubUrl, setGithubUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleModeSelect(m: SubmissionMode) {
    setMode(m)
    setFile(null)
    setPreview(null)
    setGithubUrl('')
    setError(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setError(null)

    if (mode === 'screenshot') {
      if (!ALLOWED_IMAGE_TYPES.has(f.type)) {
        setError('Only PNG, JPEG, or WebP images are allowed.')
        return
      }
    } else if (mode === 'file') {
      if (!ALLOWED_FILE_TYPES.has(f.type)) {
        setError('Allowed: .txt, .md, .csv, .pdf, .docx — not legacy .doc files.')
        return
      }
    }

    if (f.size > MAX_EVIDENCE_BYTES) {
      setError(`File must be under 8 MB (yours is ${bytesToMB(f.size)}).`)
      return
    }

    setFile(f)
    if (mode === 'screenshot') {
      const url = URL.createObjectURL(f)
      setPreview(url)
    }
  }

  async function handleSubmit() {
    setError(null)

    if (mode === 'screenshot') {
      if (!file) {
        setError('Please select an image.')
        return
      }
      setSubmitting(true)
      try {
        const verdict = await uploadEvidence(commitmentId, file)
        onVerdict(verdict)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.')
      } finally {
        setSubmitting(false)
      }
    } else if (mode === 'file') {
      if (!file) {
        setError('Please select a file.')
        return
      }
      setSubmitting(true)
      try {
        const verdict = await uploadFileEvidence(commitmentId, file)
        onVerdict(verdict)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.')
      } finally {
        setSubmitting(false)
      }
    } else if (mode === 'github') {
      if (!githubUrl.trim()) {
        setError('Please enter a GitHub URL.')
        return
      }
      if (!isValidGithubUrl(githubUrl.trim())) {
        setError('Enter a valid github.com repo, PR, or commit URL.')
        return
      }
      setSubmitting(true)
      try {
        const verdict = await submitGithubLink(commitmentId, githubUrl.trim())
        onVerdict(verdict)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed.')
      } finally {
        setSubmitting(false)
      }
    }
  }

  return (
    <div className="submission-panel">
      {/* Mode selector */}
      {!mode && (
        <div className="submission-mode-row">
          <button type="button" className="submission-mode-btn" onClick={() => handleModeSelect('screenshot')}>
            <ImageIcon size={16} aria-hidden="true" />
            Screenshot
          </button>
          <button type="button" className="submission-mode-btn" onClick={() => handleModeSelect('file')}>
            <Paperclip size={16} aria-hidden="true" />
            File
          </button>
          <button type="button" className="submission-mode-btn" onClick={() => handleModeSelect('github')}>
            <GitBranch size={16} aria-hidden="true" />
            GitHub
          </button>
        </div>
      )}

      {/* Screenshot mode */}
      {mode === 'screenshot' && (
        <div className="submission-content">
          <div className="submission-header">
            <span className="submission-mode-label">
              <ImageIcon size={14} aria-hidden="true" /> Screenshot
            </span>
            <button type="button" className="submission-close-btn" aria-label="Cancel" onClick={onCancel}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Select screenshot"
            onChange={handleFileChange}
          />
          {!file ? (
            <button type="button" className="submission-pick-btn" onClick={() => fileInputRef.current?.click()}>
              Choose image (PNG, JPEG, WebP, max 8 MB)
            </button>
          ) : (
            <div className="submission-preview-area">
              {preview && <img src={preview} alt="Screenshot preview" className="submission-img-preview" />}
              <span className="submission-filename">{file.name}</span>
              <button
                type="button"
                className="submission-change-btn"
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                }}
              >
                Change
              </button>
            </div>
          )}
          {error && (
            <p className="submission-error" role="alert">
              {error}
            </p>
          )}
          <div className="submission-actions">
            <button type="button" className="submission-cancel-text" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="submission-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !file}
            >
              {submitting ? 'Judging...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* File mode */}
      {mode === 'file' && (
        <div className="submission-content">
          <div className="submission-header">
            <span className="submission-mode-label">
              <Paperclip size={14} aria-hidden="true" /> File
            </span>
            <button type="button" className="submission-close-btn" aria-label="Cancel" onClick={onCancel}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.pdf,.docx"
            className="sr-only"
            aria-label="Select file"
            onChange={handleFileChange}
          />
          {!file ? (
            <button type="button" className="submission-pick-btn" onClick={() => fileInputRef.current?.click()}>
              Choose file (.txt, .md, .csv, .pdf, .docx, max 8 MB)
            </button>
          ) : (
            <div className="submission-file-preview">
              <Paperclip size={14} aria-hidden="true" />
              <span className="submission-filename">{file.name}</span>
              <span className="submission-filesize">{bytesToMB(file.size)}</span>
              <button type="button" className="submission-change-btn" onClick={() => setFile(null)}>
                Change
              </button>
            </div>
          )}
          {error && (
            <p className="submission-error" role="alert">
              {error}
            </p>
          )}
          <div className="submission-actions">
            <button type="button" className="submission-cancel-text" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="submission-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !file}
            >
              {submitting ? 'Judging...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* GitHub link mode */}
      {mode === 'github' && (
        <div className="submission-content">
          <div className="submission-header">
            <span className="submission-mode-label">
              <GitBranch size={14} aria-hidden="true" /> GitHub link
            </span>
            <button type="button" className="submission-close-btn" aria-label="Cancel" onClick={onCancel}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <input
            type="url"
            className="submission-url-input"
            placeholder="https://github.com/owner/repo"
            aria-label="GitHub URL"
            value={githubUrl}
            onChange={(e) => {
              setGithubUrl(e.target.value)
              setError(null)
            }}
            disabled={submitting}
          />
          {error && (
            <p className="submission-error" role="alert">
              {error}
            </p>
          )}
          <div className="submission-actions">
            <button type="button" className="submission-cancel-text" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="submission-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !githubUrl.trim()}
            >
              {submitting ? 'Judging...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
