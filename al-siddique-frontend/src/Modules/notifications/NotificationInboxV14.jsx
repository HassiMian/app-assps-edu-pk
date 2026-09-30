
import { useEffect, useState } from 'react'
import { Bell, History, Inbox, RefreshCw, CheckCheck, X, ArrowLeft } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { notificationDismissKey, readDismissedIds, persistDismissedIds, presentInbox } from '../../services/notificationInboxModel'

export default function NotificationInboxV14({ onBack }) {
  const { user } = useAuth()
  const key=notificationDismissKey(user)
  const [rows,setRows]=useState([])
  const [hidden,setHidden]=useState(()=>readDismissedIds(key))
  const [tab,setTab]=useState('recent')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [readError,setReadError]=useState('')

  useEffect(()=>{
    const refresh=e=>{if(!e?.detail?.key||e.detail.key===key)setHidden(readDismissedIds(key))}
    refresh()
    window.addEventListener('storage',refresh)
    window.addEventListener('assps-notifications-hidden-updated',refresh)
    return ()=>{window.removeEventListener('storage',refresh);window.removeEventListener('assps-notifications-hidden-updated',refresh)}
  },[key])

  async function loadInbox(){
    setLoading(true);setError('')
    try {
      const res=await api.get('/api/notify/inbox',{params:{view:'history',limit:200}})
      const list=Array.isArray(res.data?.data)?res.data.data:[]
      setRows(list.map(n=>({
        id:n.id,title:n.title||'Notification',body:n.body||n.message||'',
        sentAt:n.sent_at||n.created_at||null,readAt:n.read_at||null,unread:n.unread!==false&&!n.read_at,
        type:n.type||'general'
      })))
    }catch(e){setError('Inbox could not be loaded. Please try again.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{loadInbox()},[])
  async function markAllRead(){
    setReadError('')
    try {
      await api.put('/api/notify/read-all')
      setRows(current=>current.map(row=>({...row,unread:false,readAt:new Date().toISOString()})))
    }catch(e){setReadError('Could not update read state. Please retry.')}
  }
  function dismiss(id){
    setHidden(prev=>{const next=new Set(prev);next.add(String(id));return persistDismissedIds(key,next)})
  }
  const {recent,history}=presentInbox(rows,hidden)
  const current=tab==='recent'?recent:history
  const unreadCount=recent.filter(row=>row.unread).length
  return <section className="os-inbox" data-os-inbox="v14" aria-label="Notification inbox">
    <header className="os-inbox-header">
      <div className="os-inbox-title">
        <div className="os-inbox-title-icon"><Inbox size={21}/></div>
        <div><h1>Notification Inbox</h1><p>Latest school activity and previous notification history</p></div>
      </div>
      <div className="os-inbox-actions">
        <button type="button" onClick={onBack} className="os-inbox-action"><ArrowLeft size={15}/> Message Centre</button>
        <button type="button" onClick={loadInbox} className="os-inbox-action" disabled={loading}><RefreshCw size={15}/> Refresh</button>
        <button type="button" onClick={markAllRead} className="os-inbox-action" disabled={!unreadCount}><CheckCheck size={15}/> Mark all read</button>
      </div>
    </header>
    <div className="os-inbox-tabs" role="tablist" aria-label="Notification recency">
      <button type="button" role="tab" aria-selected={tab==='recent'} className={tab==='recent'?'is-selected':''} onClick={()=>setTab('recent')}><Bell size={15}/> Recent (30 days) {unreadCount>0&&<span className="os-inbox-count">{unreadCount}</span>}</button>
      <button type="button" role="tab" aria-selected={tab==='history'} className={tab==='history'?'is-selected':''} onClick={()=>setTab('history')}><History size={15}/> History</button>
    </div>
    {readError&&<p role="alert" className="os-inbox-error">{readError}</p>}
    <div className="os-inbox-list">
      {loading?<div className="os-inbox-empty">Loading notifications…</div>
      :error?<div className="os-inbox-empty" role="alert">{error}<button type="button" onClick={loadInbox}>Retry</button></div>
      :current.length===0
        ? <div className="os-inbox-empty"><Inbox size={25}/><h2>{tab==='recent'?'No recent notifications':'No older notifications found'}</h2><p>{tab==='recent'?'Only recorded events from the last 30 days appear here. Older records remain in History.':'Records are kept in the database; hidden items are excluded on this signed-in browser.'}</p></div>
        :current.map(n=><article className={'os-inbox-item'+(n.unread?' is-unread':'')} key={n.id}>
            <div className="os-inbox-event-icon"><Bell size={16}/></div>
            <div className="os-inbox-event-body">
              <h2>{n.title}{n.unread&&<i className="os-inbox-unread-indicator" aria-label="Unread"/>}</h2>
              <p>{n.body}</p>
              <time dateTime={n.sentAt||undefined}>{n.sentAt?new Date(n.sentAt).toLocaleString('en-PK'):'Date unavailable'}</time>
            </div>
            <button type="button" onClick={()=>dismiss(n.id)} className="os-inbox-hide" aria-label={'Hide '+n.title+' on this browser'} title="Hide on this browser"><X size={16}/></button>
          </article>)}
    </div>
  </section>
}
