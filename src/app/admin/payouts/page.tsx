'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/AdminNav';

export default function AdminPayouts() {
  const [data, setData] = useState<any>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  function load() {
    fetch('/api/admin/payouts').then((response) => {
      if (response.status === 401 || response.status === 403) { window.location.href = '/admin/login'; return null; }
      return response.json();
    }).then((d) => d && setData(d));
  }
  useEffect(() => {
    if (!localStorage.getItem('zemba_user')) { window.location.href = '/admin/login'; return; }
    load();
  }, []);

  async function markPaid(order_id: string, kind: string) {
    setBusy(order_id); setError('');
    const response = await fetch('/api/admin/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id, kind, reference: refs[order_id] || '' }) });
    setBusy('');
    if (!response.ok) setError((await response.json().catch(() => ({}))).error || 'Could not save');
    else setRefs({ ...refs, [order_id]: '' });
    load();
  }

  const money = (v: number) => `K${Number(v || 0).toFixed(2)}`;
  const totalPayouts = (data?.payouts || []).reduce((sum: number, o: any) => sum + Number(o.pay_amount ?? o.net_amount), 0);
  const totalRefunds = (data?.refunds || []).reduce((sum: number, o: any) => sum + Number(o.refund_amount ?? o.amount), 0);

  return (
    <div className="zemba-page">
      <AdminNav />
      <main style={{ maxWidth: 980, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
        <h1 style={{ fontSize: '1.7rem' }}>Money to move</h1>
        <p className="zemba-muted">Send each amount by mobile money, then type the transaction reference and press &quot;Mark as sent&quot;. The seller or buyer is told automatically and the payment is kept on record. We promise payouts and refunds within {data?.payoutHours ?? 24} hours, so anything marked Overdue needs you now.</p>
        {data?.provider && (
          <div className="zemba-card" style={{ padding: '0.8rem 1rem', margin: '0.8rem 0' }}>
            {data.provider.ready
              ? <>Payment provider connected: <strong>{data.provider.provider}</strong>. {data.provider.autoPayouts ? 'Automatic payouts are ON: due payments are sent every morning.' : 'Automatic payouts are OFF. Use Send through provider on each row.'}</>
              : <>No payment provider is connected yet, so every payout and refund is sent by hand and marked as sent.</>}
          </div>
        )}
        {error && <div className="zemba-auth-error">{error}</div>}
        {!data && <p className="zemba-muted">Loading…</p>}
        {data && (
          <>
            <div className="zemba-stats">
              <div className="zemba-card zemba-stat"><span className="zemba-muted">Seller payouts due</span><strong>{money(totalPayouts)}</strong><small className="zemba-muted">{data.payouts.length} orders</small></div>
              <div className="zemba-card zemba-stat"><span className="zemba-muted">Buyer refunds due</span><strong>{money(totalRefunds)}</strong><small className="zemba-muted">{data.refunds.length} orders</small></div>
            </div>

            <section className="zemba-card" style={{ padding: '1.2rem', marginTop: '1.2rem', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 0.8rem' }}>Pay sellers</h3>
              <table className="zemba-table">
                <thead><tr><th>Order</th><th>Seller</th><th>Send to</th><th>Amount</th><th>Reference</th><th></th></tr></thead>
                <tbody>
                  {data.payouts.length === 0 && <tr><td colSpan={6} className="zemba-muted">No seller payouts due.</td></tr>}
                  {data.payouts.map((o: any) => (
                    <tr key={o.id}>
                      <td>#{o.order_reference}<br /><small className="zemba-muted">{o.title}</small></td>
                      <td>{o.seller_name}</td>
                      <td>{o.momo_provider} {o.momo_number}</td>
                      <td>
                        <strong>{money(o.pay_amount ?? o.net_amount)}</strong>
                        <br /><small className="zemba-muted">sale {money(o.amount)}, fee {money(o.platform_fee)}</small>
                        {Number(o.deduction) > 0 && <><br /><small style={{ color: '#a35b00' }}>{money(o.deduction)} taken off for refund charges</small></>}
                      </td>
                      <td>{Number(o.pay_amount) === 0 ? <small className="zemba-muted">Nothing to send. Covered by refund charges.</small> : <input className="zemba-input" style={{ margin: 0, minWidth: 130 }} placeholder="MoMo ref" value={refs[o.id] || ''} onChange={(e) => setRefs({ ...refs, [o.id]: e.target.value })} />}</td>
                      <td>
                        <button className="zemba-btn zemba-btn-primary" disabled={busy === o.id} onClick={() => markPaid(o.id, 'payout')}>{Number(o.pay_amount) === 0 ? 'Confirm' : 'Mark as sent'}</button>
                        {data.provider?.ready && Number(o.pay_amount) > 0 && <> <button className="zemba-btn zemba-btn-secondary" disabled={busy === o.id} onClick={() => markPaid(o.id, 'send_payout')}>Send through provider</button></>}
                        {o.overdue && <><br /><small style={{ color: '#b42318', fontWeight: 700 }}>Overdue</small></>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="zemba-card" style={{ padding: '1.2rem', marginTop: '1.2rem', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 0.8rem' }}>Refund buyers</h3>
              <table className="zemba-table">
                <thead><tr><th>Order</th><th>Buyer</th><th>Send to</th><th>Amount</th><th>Reference</th><th></th></tr></thead>
                <tbody>
                  {data.refunds.length === 0 && <tr><td colSpan={6} className="zemba-muted">No refunds due.</td></tr>}
                  {data.refunds.map((o: any) => (
                    <tr key={o.id}>
                      <td>#{o.order_reference}<br /><small className="zemba-muted">{o.title}</small></td>
                      <td>{o.buyer_name}</td>
                      <td>{o.buyer_phone}</td>
                      <td><strong>{money(o.refund_amount ?? o.amount)}</strong>{o.cancelled && <><br /><small className="zemba-muted">buyer cancelled: item price less cancellation fee</small></>}</td>
                      <td><input className="zemba-input" style={{ margin: 0, minWidth: 130 }} placeholder="MoMo ref" value={refs[o.id] || ''} onChange={(e) => setRefs({ ...refs, [o.id]: e.target.value })} /></td>
                      <td>
                        <button className="zemba-btn zemba-btn-primary" disabled={busy === o.id} onClick={() => markPaid(o.id, 'refund')}>Mark as sent</button>
                        {data.provider?.ready && <> <button className="zemba-btn zemba-btn-secondary" disabled={busy === o.id} onClick={() => markPaid(o.id, 'send_refund')}>Send through provider</button></>}
                        {o.overdue && <><br /><small style={{ color: '#b42318', fontWeight: 700 }}>Overdue</small></>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {(data.problems || []).length > 0 && (
              <section className="zemba-card" style={{ padding: '1.2rem', marginTop: '1.2rem', overflowX: 'auto' }}>
                <h3 style={{ margin: '0 0 0.4rem' }}>Being sent, or failed</h3>
                <p className="zemba-muted" style={{ marginTop: 0 }}>Payments the provider is still working on, and ones that failed. For a failed one you can try again, or send it by hand and mark it as sent.</p>
                <table className="zemba-table">
                  <thead><tr><th>Order</th><th>To</th><th>Amount</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {data.problems.map((p: any) => (
                      <tr key={p.id + p.kind}>
                        <td>#{p.order_reference}<br /><small className="zemba-muted">{p.kind}</small></td>
                        <td>{p.person}<br /><small className="zemba-muted">{p.network ? `${p.network} ` : ''}{p.phone}</small></td>
                        <td>{money(p.amount)}</td>
                        <td>{p.status === 'FAILED' ? <span style={{ color: '#b42318', fontWeight: 700 }}>Failed</span> : 'Being sent'}{p.payment_error && <><br /><small className="zemba-muted">{p.payment_error}</small></>}</td>
                        <td>{p.status === 'FAILED' && <><button className="zemba-btn zemba-btn-secondary" disabled={busy === p.id} onClick={() => markPaid(p.id, p.kind === 'payout' ? 'retry_payout' : 'retry_refund')}>Try again</button> <button className="zemba-btn zemba-btn-primary" disabled={busy === p.id} onClick={() => markPaid(p.id, p.kind)}>Mark as sent</button></>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {(data.sellerCharges || []).length > 0 && (
              <section className="zemba-card" style={{ padding: '1.2rem', marginTop: '1.2rem', overflowX: 'auto' }}>
                <h3 style={{ margin: '0 0 0.4rem' }}>Refund charges owed by sellers</h3>
                <p className="zemba-muted" style={{ marginTop: 0 }}>When an order is refunded because of the seller, a refund charge is taken off their next payouts automatically. If a charge is not fair (for example the seller was not at fault), waive it here. The list shows every charge, including ones already taken off earlier payouts. The amount the seller still owes is the figure in bold.</p>
                {data.sellerCharges.map((seller: any) => (
                  <div key={seller.seller_id} style={{ marginBottom: '1rem' }}>
                    <strong>{seller.seller_name}</strong> still owes <strong>{money(seller.owed)}</strong>
                    <table className="zemba-table" style={{ marginTop: '0.4rem' }}>
                      <thead><tr><th>Refunded order</th><th>Item price</th><th>Charge</th><th></th></tr></thead>
                      <tbody>
                        {seller.orders.map((c: any) => (
                          <tr key={c.id}>
                            <td>#{c.order_reference}<br /><small className="zemba-muted">{new Date(c.updated_at).toLocaleDateString()}</small></td>
                            <td>{money(c.amount)}</td>
                            <td>{money(c.charge)}</td>
                            <td><button className="zemba-btn zemba-btn-secondary" disabled={busy === c.id} onClick={() => markPaid(c.id, 'waive')}>Waive</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>
            )}

            <section className="zemba-card" style={{ padding: '1.2rem', marginTop: '1.2rem', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 0.8rem' }}>Recently sent</h3>
              <table className="zemba-table">
                <thead><tr><th>Order</th><th>Type</th><th>Amount</th><th>Reference</th><th>Date</th></tr></thead>
                <tbody>
                  {data.recent.length === 0 && <tr><td colSpan={5} className="zemba-muted">Nothing sent yet.</td></tr>}
                  {data.recent.map((o: any) => {
                    const refund = o.refund_status === 'PAID';
                    return (
                      <tr key={o.order_reference + (refund ? 'r' : 'p')}>
                        <td>#{o.order_reference}</td>
                        <td>{refund ? 'Refund' : 'Seller payout'}</td>
                        <td>{money(refund ? (o.refund_amount ?? o.amount) : Number(o.net_amount) - Number(o.deduction || 0))}{!refund && Number(o.deduction) > 0 && <><br /><small className="zemba-muted">after {money(o.deduction)} refund charges</small></>}</td>
                        <td>{refund ? o.refund_reference : o.payout_reference}</td>
                        <td>{new Date(refund ? o.refund_paid_at : o.payout_paid_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
