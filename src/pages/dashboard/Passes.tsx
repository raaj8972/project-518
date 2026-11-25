import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRightIcon, ArrowTopRightIcon, ViewGridIcon } from '@radix-ui/react-icons';
import EntryPass, { type StudentEntryPass } from '../../components/dashboard/EntryPass';

export default function Passes() {
  const { entryPasses, setSelectedPass, dataLoading } = useOutletContext<{ entryPasses: StudentEntryPass[]; setSelectedPass: (pass: StudentEntryPass) => void; dataLoading: boolean }>();
  return <div className="sd-passes-page">
    <div className="sd-page-heading">
      <div>
        <p className="sd-eyebrow">LESS QUEUING. MORE FESTIVAL.</p>
        <h1>Your entry, sorted<span className="sd-heading-dot">.</span>
        </h1>
        <p>Keep your digital pass handy. Show your QR at the gate.</p>
      </div>
      <Link className="sd-button sd-button-secondary" to="/dashboard/messages">Need help? <ArrowTopRightIcon />
      </Link>
    </div>
    {dataLoading ? <div className="sd-event-grid" aria-label="Loading passes">
      <div className="sd-skeleton sd-skeleton-event" />
      <div className="sd-skeleton sd-skeleton-event" />
    </div> : entryPasses.length ? <div className="sd-pass-grid">
      {entryPasses.map(pass => <div key={pass.id || pass.pass_token}>
        <EntryPass pass={pass} />
        <button className="sd-expand-pass" onClick={() => setSelectedPass(pass)}>Open full-screen pass <ArrowTopRightIcon />
        </button>
      </div>)}
    </div> : <div className="sd-panel sd-empty">
      <span className="sd-empty-icon">
        <ViewGridIcon />
      </span>
      <h2>No active pass yet.</h2>
      <p>Your passes appear here once they are issued. If you’re expecting one, contact the festival team.</p>
      <Link to="/dashboard/messages" className="sd-button">Contact support <ArrowRightIcon />
      </Link>
    </div>}
  </div>;
}
