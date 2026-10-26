export function fmtDate(s) {
  if (!s) return '';
  return new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
export function fmtDateTime(s) {
  if (!s) return '';
  return new Date(s.replace(' ', 'T')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
export const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
export const STATUS_LABEL = {
  PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected',
  OUT: 'Out of campus', RETURNED: 'Returned', CANCELLED: 'Cancelled',
};
