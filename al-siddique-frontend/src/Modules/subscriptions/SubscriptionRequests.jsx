// src/Modules/subscriptions/SubscriptionRequests.jsx
// Administrative portal for approving school subscription requests

import { useState, useEffect } from 'react'
import api, { resolveAssetUrl } from '../../services/api'
import { C, card, btnPrimary, btnSecondary, input, select, labelStyle, sectionHeader } from '../moduleStyles'

export default function SubscriptionRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Filters state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')

  const fetchRequests = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (planFilter) params.plan = planFilter
      if (search) params.search = search

      const res = await api.get('/api/subscription-requests', { params })
      if (res.data && res.data.success) {
        setRequests(res.data.data)
      } else {
        setErrorMsg('Failed to load subscription requests.')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Error connecting to the API server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [statusFilter, planFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchRequests()
  }

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this subscription? This will auto-provision the school tenant, create principal credentials, and send the activation email.')) return
    setActionLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await api.post(`/api/subscription-requests/${id}/approve`)
      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message || 'Subscription approved successfully.')
        setSelectedRequest(null)
        fetchRequests()
      } else {
        setErrorMsg(res.data.message || 'Failed to approve subscription.')
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error occurred during approval.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) return
    setActionLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await api.post(`/api/subscription-requests/${selectedRequest.id}/reject`, {
        rejectionReason: rejectReason
      })
      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message || 'Subscription request rejected successfully.')
        setSelectedRequest(null)
        setRejectReason('')
        setShowRejectForm(false)
        fetchRequests()
      } else {
        setErrorMsg(res.data.message || 'Failed to reject request.')
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error occurred during rejection.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved':
        return { background: 'rgba(48,209,88,0.14)', color: C.green, fontWeight: 700 }
      case 'rejected':
        return { background: 'rgba(255,55,95,0.14)', color: C.red, fontWeight: 700 }
      default:
        return { background: 'rgba(255,214,10,0.14)', color: '#FFD60A', fontWeight: 700 }
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: '#071e34', color: C.silver, fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 22 }}>
        
        {/* Header section */}
        <div className="super-module-card" style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderRadius: 22 }}>
          <div>
            <h1 style={sectionHeader}>APEX Subscription Requests</h1>
            <p style={{ color: C.muted, marginTop: 8 }}>Verify payment screenshots, school details, and approve/reject SaaS subscriptions.</p>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div style={{ padding: '12px 16px', background: 'rgba(48,209,88,0.12)', border: `1px solid ${C.green}`, color: C.green, borderRadius: 12, fontWeight: 600 }}>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,55,95,0.12)', border: `1px solid ${C.red}`, color: C.red, borderRadius: 12, fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        {/* Filters */}
        <div className="super-module-card" style={{ ...card, borderRadius: 22 }}>
          <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Search</label>
              <input 
                style={input} 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Owner, School, Email, Tx ID" 
              />
            </div>
            <div>
              <label style={labelStyle}>Plan</label>
              <select style={select} value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
                <option value="">All Plans</option>
                <option value="Starter">Starter</option>
                <option value="Professional">Professional</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <button type="submit" style={{ ...btnPrimary, width: '100%', padding: '10px 16px' }}>Filter Requests</button>
            </div>
          </form>
        </div>

        {/* List of Requests */}
        <div className="super-module-card" style={{ ...card, overflowX: 'auto', borderRadius: 22 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>Loading subscription requests...</div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>No subscription requests found matching the parameters.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Request ID', 'School Name', 'Owner Name', 'Email', 'Plan', 'Payment', 'Date', 'Status', 'Action'].map((label) => (
                    <th key={label} style={{ padding: '14px 16px', textAlign: 'left', color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.06 }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((req, index) => (
                  <tr key={req.id} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
                    <td style={{ padding: '14px 16px', color: C.gold, fontWeight: 700 }}>{req.request_id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{req.school_name}</td>
                    <td style={{ padding: '14px 16px' }}>{req.owner_name}</td>
                    <td style={{ padding: '14px 16px' }}>{req.email}</td>
                    <td style={{ padding: '14px 16px' }}>{req.selected_plan}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{req.payment_method.toUpperCase()}</span>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{req.transaction_id}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12 }}>{new Date(req.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, ...getStatusStyle(req.status) }}>
                        {req.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button 
                        style={btnSecondary} 
                        onClick={() => {
                          setSelectedRequest(req)
                          setShowRejectForm(false)
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7,22,40,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 16
        }}>
          <div style={{
            ...card, width: '100%', maxWidth: 760, maxHeight: '90vh',
            overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20,
            borderRadius: 24, padding: 30, background: '#0B2C4D', border: `1px solid ${C.gold}55`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
              <div>
                <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{selectedRequest.request_id}</span>
                <h2 style={{ fontSize: 22, color: '#fff', margin: '4px 0 0 0' }}>Review Subscription</h2>
              </div>
              <button 
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}
                onClick={() => setSelectedRequest(null)}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
              {/* Left Column: Form Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ color: C.gold, fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>School details</h3>
                
                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>SCHOOL NAME</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{selectedRequest.school_name}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>OWNER / PRINCIPAL NAME</div>
                  <div style={{ color: '#fff' }}>{selectedRequest.owner_name}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>EMAIL ADDRESS</div>
                  <div style={{ color: '#fff' }}>{selectedRequest.email}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>CONTACT NUMBER</div>
                  <div style={{ color: '#fff' }}>{selectedRequest.contact_number || 'N/A'}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: C.muted }}>CITY & ADDRESS</div>
                  <div style={{ color: '#fff', fontSize: 13 }}>
                    <strong>{selectedRequest.city || 'N/A'}</strong> - {selectedRequest.school_address || 'N/A'}
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                  <h3 style={{ color: C.gold, fontSize: 14, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: 1 }}>Plan & Payment</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted }}>SELECTED PLAN</div>
                      <div style={{ fontWeight: 700, color: C.green }}>{selectedRequest.selected_plan}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted }}>BILLING CYCLE</div>
                      <div style={{ fontWeight: 700 }}>{selectedRequest.billing_cycle}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted }}>PAYMENT METHOD</div>
                      <div style={{ color: '#fff' }}>{selectedRequest.payment_method.toUpperCase()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted }}>TRANSACTION ID</div>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{selectedRequest.transaction_id}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Screenshot Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 style={{ color: C.gold, fontSize: 14, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Payment screenshot</h3>
                {selectedRequest.payment_screenshot_url ? (
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', background: 'rgba(0,0,0,0.2)', height: 280, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {selectedRequest.payment_screenshot_url.toLowerCase().endsWith('.pdf') ? (
                      <a 
                        href={resolveAssetUrl(selectedRequest.payment_screenshot_url)} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: C.gold, textDecoration: 'underline', fontWeight: 600 }}
                      >
                        View PDF Proof
                      </a>
                    ) : (
                      <img 
                        src={resolveAssetUrl(selectedRequest.payment_screenshot_url)} 
                        alt="Payment screenshot" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    )}
                  </div>
                ) : (
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 30, textAlign: 'center', color: C.muted, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    No payment proof uploaded.
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Form Drawer */}
            {showRejectForm && (
              <form onSubmit={handleRejectSubmit} style={{ background: 'rgba(255,55,95,0.06)', border: `1px solid ${C.red}33`, borderRadius: 14, padding: 16, display: 'grid', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Rejection Reason</label>
                  <textarea 
                    style={{ ...input, minHeight: 80, resize: 'vertical' }}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter the reason why this payment verification failed..."
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" style={btnSecondary} onClick={() => setShowRejectForm(false)}>Cancel</button>
                  <button type="submit" disabled={actionLoading} style={{ ...btnPrimary, background: C.red, color: '#fff' }}>
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            )}

            {/* Footer controls */}
            {!showRejectForm && selectedRequest.status === 'pending' && (
              <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
                <button 
                  style={{ ...btnSecondary, borderColor: C.red, color: C.red }}
                  onClick={() => setShowRejectForm(true)}
                  disabled={actionLoading}
                >
                  Reject Request
                </button>
                <button 
                  style={btnPrimary} 
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Approving...' : 'Approve & Provision Tenant'}
                </button>
              </div>
            )}
            
            {selectedRequest.status !== 'pending' && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: C.muted }}>
                  {selectedRequest.status === 'rejected' && (
                    <span><strong>Rejection Reason:</strong> {selectedRequest.rejection_reason || 'None specified.'}</span>
                  )}
                  {selectedRequest.status === 'approved' && (
                    <span style={{ color: C.green }}><strong>Tenant Activated successfully!</strong></span>
                  )}
                </div>
                <button style={btnSecondary} onClick={() => setSelectedRequest(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
