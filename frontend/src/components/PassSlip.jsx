import { fmtDate, fmtDateTime, STATUS_LABEL } from '../format.js';

// One gate pass drawn as a tear-off slip. Left: the request. Right stub: its status.
export default function PassSlip({ pass, children }) {
  return (
    <article className={`slip status-${pass.status}`}>
      <div className="slip-main">
        <div className="slip-top">
          <h3>{pass.category}</h3>
          <span className="muted">Pass #{pass.pass_id}</span>
        </div>
        <p className="slip-dates">{fmtDate(pass.out_date)} to {fmtDate(pass.in_date)}</p>
        {pass.reason_detail && <p className="slip-reason">{pass.reason_detail}</p>}
        {pass.remarks && <p className="slip-remarks">Warden: {pass.remarks}</p>}
        {pass.out_time && (
          <p className="muted small">
            Left {fmtDateTime(pass.out_time)}{pass.in_time ? `, back ${fmtDateTime(pass.in_time)}` : ''}
          </p>
        )}
        {children}
      </div>
      <div className="slip-stub">
        <span className="stamp">{STATUS_LABEL[pass.status]}</span>
        <span className="muted small">Applied {fmtDate(pass.applied_at)}</span>
      </div>
    </article>
  );
}
