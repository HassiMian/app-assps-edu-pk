
import { BookOpen, Pencil, Trash2, Check, X, Search } from 'lucide-react'
import Portal from '../../components/Portal'

export default function SavedPapersVisualV14({
  savedPapers, filtered, search, setSearch, categoryStats, fmtDate,
  renaming, renameVal, setRenameVal, setRenaming, startRename, submitRename,
  confirmDelete, setConfirmDelete, deleteSavedPaper, onLoadPaper,
}) {
  return <section className="os-saved-papers" aria-label="Saved Papers" data-os-saved-papers="v14">
    {confirmDelete && <Portal>
      <div className="os-paper-modal-backdrop">
        <div className="os-paper-modal" role="alertdialog" aria-modal="true" aria-labelledby="os-delete-title" aria-describedby="os-delete-description">
          <div className="os-paper-modal-icon"><Trash2 size={21}/></div>
          <h2 id="os-delete-title">Delete saved paper?</h2>
          <p id="os-delete-description">{confirmDelete.name} will be permanently deleted. This cannot be undone.</p>
          <div className="os-paper-modal-buttons">
            <button type="button" className="os-paper-button os-paper-button-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button type="button" className="os-paper-button os-paper-button-danger" onClick={() => { deleteSavedPaper(confirmDelete.id); setConfirmDelete(null) }}>Delete paper</button>
          </div>
        </div>
      </div>
    </Portal>}
    <header className="os-saved-header">
      <div className="os-saved-heading">
        <div className="os-saved-header-icon"><BookOpen size={20}/></div>
        <div>
          <h1>Saved Papers</h1>
          <p>{savedPapers.length} saved papers · Load, review or edit a working copy</p>
        </div>
      </div>
      <label className="os-saved-search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Search saved papers</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search papers..." aria-label="Search saved papers"/>
      </label>
    </header>
    {filtered.length===0
      ? <div className="os-saved-empty">
          <BookOpen size={24} aria-hidden="true" />
          <h2>{savedPapers.length===0?'No saved papers yet':'No matching papers'}</h2>
          <p>{savedPapers.length===0?'Save a paper from the editor to see it here.':'Try a different class, subject or paper name.'}</p>
        </div>
      : <div className="os-saved-grid">
        {filtered.map(paper=>{
          const stats=categoryStats(paper)
          const statItems=[['MCQ',stats.mcqCount],['Short',stats.shortCount],['Long',stats.longCount],['Marks',stats.totalMarks]]
          return <article className="os-saved-card" key={paper.id} data-os-paper-card>
            <div className="os-saved-card-body">
              {renaming===paper.id
                ? <div className="os-paper-rename">
                    <input autoFocus value={renameVal} aria-label="Rename paper" onChange={e=>setRenameVal(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter')submitRename(); if(e.key==='Escape')setRenaming(null)}}/>
                    <button title="Save name" aria-label="Save paper name" type="button" onClick={submitRename}><Check size={17}/></button>
                    <button title="Cancel rename" aria-label="Cancel rename" type="button" onClick={()=>setRenaming(null)}><X size={17}/></button>
                  </div>
                : <h2 className="os-saved-title" onDoubleClick={()=>startRename(paper)} title="Double-click to rename">{paper.name}</h2>}
              <div className="os-saved-meta">
                {paper.config?.classLevel && <span className="os-paper-chip">Class {paper.config.classLevel}</span>}
                {paper.config?.subject && <span className="os-paper-chip">{paper.config.subject}</span>}
                {paper.config?.examType && <span className="os-paper-chip os-paper-chip-muted">{paper.config.examType}</span>}
              </div>
              <div className="os-saved-stats">
                {statItems.map(([label,value])=><div className="os-paper-stat" key={label}>
                  <strong className={label==='Marks'?'os-stat-emphasis':''}>{value}</strong>
                  <span>{label}</span>
                </div>)}
              </div>
              <div className="os-paper-date">{fmtDate(paper.createdAt)}</div>
              <div className="os-saved-actions">
                <button className="os-paper-button os-paper-button-gold" type="button" onClick={()=>onLoadPaper(paper)}>Load &amp; Preview</button>
                <button className="os-paper-button os-paper-button-primary" type="button" onClick={()=>onLoadPaper(paper,'build')}>Open / Edit</button>
              </div>
              <div className="os-saved-secondary-actions">
                <button className="os-paper-small-action" type="button" onClick={()=>startRename(paper)}><Pencil size={14}/> Rename</button>
                <button className="os-paper-small-action os-paper-delete-action" type="button" onClick={()=>setConfirmDelete(paper)}><Trash2 size={14}/> Delete</button>
              </div>
            </div>
          </article>
        })}
      </div>}
  </section>
}
