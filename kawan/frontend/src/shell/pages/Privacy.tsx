import { Card } from '../../ui/Card'
import { PageHeader } from '../PageHeader'

const pdpaPrinciples = [
  'General: collect and use only what Kawan needs to run commitments, check-ins, verdicts, settings, and account access.',
  'Notice and choice: explain what is collected, why it is used, and the choices users have before they rely on the app.',
  'Disclosure: keep personal data within the services needed to operate Kawan, including Chutes for AI inference.',
  'Security: protect account, commitment, and evidence-processing data with access controls and secure processing paths.',
  'Retention: keep commitment and timeline records only while they are useful to the user or required for operations.',
  'Data integrity: keep stored commitment records accurate, current, and tied to user-controlled actions.',
  'Access: give users a clear route to view, correct, export, or delete their app data.'
]

export function Privacy() {
  return (
    <div className="shell-page privacy-page">
      <PageHeader
        title="Privacy"
        subtitle="How Kawan handles personal data, Malaysian data governance, and private AI inference."
      />

      <Card className="privacy-card privacy-intro-card">
        <p>
          Kawan is built as an accountability app for users in Malaysia. This page describes how the app is designed
          around Personal Data Protection Act 2010 (PDPA) expectations, practical data governance, and the use of
          Chutes' Trusted Execution Environment (TEE) model infrastructure for private AI inference.
        </p>
        <p className="privacy-note">
          This is a product privacy summary for a hackathon project. It is not legal advice.
        </p>
      </Card>

      <div className="privacy-grid">
        <Card className="privacy-card">
          <h3>What Kawan Processes</h3>
          <p>
            Kawan stores the information needed to make commitments work: action, deliverable, deadline, cadence, rest
            days, evidence type, check-in history, verdicts, settings, and account/session data.
          </p>
          <p>
            Evidence is used to decide whether a commitment was verified, unclear, or missed. The app is designed to
            process evidence for a verdict rather than turning evidence into a broad user profile.
          </p>
        </Card>

        <Card className="privacy-card">
          <h3>Malaysia PDPA Alignment</h3>
          <p>
            Kawan's privacy model follows the seven PDPA principles used by Malaysia's Personal Data Protection
            Department as the baseline for responsible personal data handling.
          </p>
          <ul className="privacy-principles-list">
            {pdpaPrinciples.map((principle) => (
              <li key={principle}>{principle}</li>
            ))}
          </ul>
        </Card>

        <Card className="privacy-card">
          <h3>Data Governance</h3>
          <p>
            Kawan separates user-controlled commitment records from system-generated check-ins and verdicts. The
            timeline and history screens are designed to make changes visible instead of hiding automated decisions.
          </p>
          <p>
            Deletion controls in Settings remove commitments, check-ins, history, reflections, and related data from the
            app's server-side records while keeping the active account/session boundary explicit.
          </p>
        </Card>

        <Card className="privacy-card">
          <h3>Private AI Inference With Chutes</h3>
          <p>
            Kawan uses Chutes for AI-powered checks and responses. Where Chutes TEE models are used, inference runs in a
            trusted execution environment so user data can be processed in an isolated compute context.
          </p>
          <p>
            The goal is to send only the context needed for the check, receive the verdict or response Kawan needs, and
            avoid exposing raw user evidence beyond the secure inference flow.
          </p>
        </Card>
      </div>

      <Card className="privacy-card privacy-links-card">
        <h3>References</h3>
        <div className="privacy-reference-links">
          <a href="https://www.pdp.gov.my/ppdpv1/laws-of-malaysia-pdpa/" target="_blank" rel="noreferrer">
            Malaysia PDPA
          </a>
          <a href="https://www.pdp.gov.my/ppdpv1/principles/" target="_blank" rel="noreferrer">
            PDPA principles
          </a>
          <a href="https://docs.chutes.ai/" target="_blank" rel="noreferrer">
            Chutes docs
          </a>
        </div>
      </Card>
    </div>
  )
}
