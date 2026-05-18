// src/pages/DisputeLetter.jsx — Editable dispute letter preview + PDF download

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, AlertTriangle, Edit3, CheckCircle2, FileText, MapPin } from 'lucide-react';
import api from '../api';

function buildLetterText(bill) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const provider     = bill?.provider     || 'WBSEDCL';
  const consumerNo   = bill?.consumer_id   || bill?.consumer_no   || 'N/A';
  const consumerName = bill?.consumer_name || 'N/A';
  const billMonth    = bill?.billing_period || bill?.bill_month    || 'N/A';
  const billedAmount = bill?.total_amount  ? `₹${bill.total_amount.toFixed(2)}` : 'N/A';
  const expectedAmt  = bill?.expected_amount ? `₹${bill.expected_amount.toFixed(2)}` : 'N/A';
  const units        = bill?.units_consumed ? `${bill.units_consumed} kWh` : 'N/A';
  const isEstimated  = bill?.is_estimated;

  const reason = isEstimated
    ? `The bill for the month of ${billMonth} appears to be based on an estimated meter reading rather than an actual reading. The estimated units (${units}) are significantly higher than our typical consumption pattern.`
    : `After cross-checking the billed amount of ${billedAmount} against the official ${provider} tariff slabs for ${units} units consumed, the expected amount should be approximately ${expectedAmt}. This indicates a discrepancy of ₹${
        bill?.total_amount && bill?.expected_amount
          ? Math.abs(bill.total_amount - bill.expected_amount).toFixed(2)
          : 'N/A'
      }.`;

  const recipient = provider === 'CESC'
    ? `The Commercial Manager
CESC Limited – [Your Regional / District Office]
[Your City / Town, Pin Code]`
    : provider === 'WBSEDCL'
    ? `The Assistant Engineer / Junior Engineer
WBSEDCL – [Your Local Sub-Division Office]
[Your City / Town, Pin Code]`
    : provider === 'IPCL'
    ? `The Commercial & Customer Services Head
India Power Corporation Limited (IPCL) – [Your Local Sub-Division Office]
[Your City / Town, Pin Code]`
    : `The Customer Relations Officer / Station Manager
${provider} – [Your Local Sub-Division Office]
[Your City / Town, Pin Code]`;

  return `${recipient}

Date: ${today}

Subject: Dispute of Electricity Bill – Consumer No. ${consumerNo} | Month: ${billMonth}

Respected Sir/Madam,

I am ${consumerName}, a consumer under your jurisdiction with Consumer Number ${consumerNo}. I am writing to formally dispute my electricity bill for the billing period of ${billMonth}.

${reason}

In view of the above, I request your office to:
1. Review the meter reading and verify the actual consumption against the billed units.
2. Recalculate the bill using the official ${provider} tariff schedule applicable for LT consumers.
3. Issue a corrected bill reflecting the accurate charges at the earliest.

I am prepared to cooperate fully for any meter inspection or reading verification. Please treat this as an urgent matter and inform me of the resolution at your earliest convenience.

Kindly acknowledge receipt of this letter.

Yours faithfully,

${consumerName}
Consumer No.: ${consumerNo}
Address: [Your Full Address]
Mobile: [Your Mobile Number]
Email: [Your Email]

Enclosures:
1. Copy of disputed bill (Month: ${billMonth})
2. Screenshot of BillAnalyzer discrepancy report`;
}

export default function DisputeLetter() {
  const { id } = useParams();
  const [bill,         setBill]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [letterText,   setLetterText]   = useState('');
  const [isEditing,    setIsEditing]    = useState(false);
  const [downloading,  setDownloading]  = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await api.get(`/api/v1/bills/${id}`);
        setBill(res.data);
        setLetterText(buildLetterText(res.data));
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load bill data.');
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [id]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/api/v1/bills/${id}/dispute`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `dispute_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not generate dispute letter PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
        <span>Loading bill data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertTriangle size={36} className="text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-6">{error}</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Back */}
      <Link
        to={`/bills/${id}`}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
      >
        <ArrowLeft size={16} /> Back to Analysis
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Dispute Letter</h1>
          <p className="text-slate-400 text-sm">
            Review and edit the letter before downloading the PDF
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsEditing((v) => !v)}
            className={`btn-secondary py-2 px-4 text-sm ${isEditing ? 'border-amber-500/50 text-amber-300' : ''}`}
          >
            {isEditing
              ? <><CheckCircle2 size={16} className="text-emerald-400" /> Done Editing</>
              : <><Edit3 size={16} /> Edit Letter</>
            }
          </button>
          <button
            id="download-dispute-pdf"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="btn-primary py-2 px-4 text-sm disabled:opacity-60"
          >
            {downloading
              ? <><Loader2 size={16} className="animate-spin" /> Generating…</>
              : <><Download size={16} /> Download PDF</>
            }
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-sm text-amber-300">
        <FileText size={18} className="shrink-0 mt-0.5" />
        <span>
          Fill in your <strong>address</strong> and <strong>contact details</strong> in the letter before downloading.
          The highlighted placeholders in brackets need to be replaced.
        </span>
      </div>

      {/* Letter preview / editor */}
      <div className="glass-panel-premium p-2 mb-6">
        {isEditing ? (
          <textarea
            id="dispute-letter-textarea"
            className="w-full min-h-[600px] bg-transparent text-slate-200 text-sm font-mono leading-relaxed p-6 outline-none resize-none"
            value={letterText}
            onChange={(e) => setLetterText(e.target.value)}
          />
        ) : (
          <pre
            id="dispute-letter-preview"
            className="whitespace-pre-wrap text-slate-200 text-sm font-mono leading-relaxed p-6 min-h-[400px]"
          >
            {letterText}
          </pre>
        )}
      </div>

      {/* Submit Physically banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-indigo-600/10 border border-indigo-500/25 rounded-2xl p-6 mb-8 hover-lift glow-primary-drop transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl shrink-0 mt-0.5">
            <MapPin size={22} />
          </div>
          <div>
            <h4 className="text-white font-bold text-base mb-1">Prefer to Submit Physically?</h4>
            <p className="text-slate-400 text-sm">
              You can physically deliver this dispute letter to your nearest {bill?.provider || 'WBSEDCL'} office for immediate acknowledgement.
            </p>
          </div>
        </div>
        <Link
          to="/locator"
          className="btn-primary py-2.5 px-6 text-sm shrink-0 flex items-center gap-2 whitespace-nowrap bg-indigo-600 hover:bg-indigo-500"
        >
          Locate Nearest Office
        </Link>
      </div>

      {/* Actions footer */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => setLetterText(buildLetterText(bill))}
          className="btn-secondary flex-1 py-3"
        >
          Reset to Original
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="btn-primary flex-1 py-3 disabled:opacity-60"
        >
          {downloading
            ? <><Loader2 size={18} className="animate-spin" /> Generating PDF…</>
            : <><Download size={18} /> Download Dispute Letter PDF</>
          }
        </button>
      </div>
    </div>
  );
}
