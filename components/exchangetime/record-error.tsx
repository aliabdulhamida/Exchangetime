'use client';

export default function RecordError({ message }: { message: string }) {
  return <div role="alert" className="record-error">
    <p>{message}</p>
    <div>
      <button type="button" className="terminal-button" onClick={() => {
        if (window.confirm('Reload saved records? Unsaved edits in this tab will be discarded.')) window.location.reload();
      }}>Reload saved records</button>
      <button type="button" className="terminal-button" onClick={() => window.dispatchEvent(new Event('et-settings'))}>Backup & recovery</button>
    </div>
  </div>;
}
