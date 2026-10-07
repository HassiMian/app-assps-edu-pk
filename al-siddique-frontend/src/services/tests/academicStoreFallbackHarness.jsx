import React from 'react'
import ReactDOM from 'react-dom/client'
import { useAcademicStore } from '../useAcademicStore.js'

function Consumer({ id }) {
  const store = useAcademicStore()
  const [, force] = React.useState(0)
  const previous = React.useRef(store.classNames)
  const changes = React.useRef(0)
  if (previous.current !== store.classNames) {
    changes.current += 1
    previous.current = store.classNames
  }
  return <section>
    <div id={`${id}-loading`}>{String(store.loading)}</div>
    <div id={`${id}-configured`}>{String(store.configured)}</div>
    <div id={`${id}-classes`}>{store.classNames.join('|')}</div>
    <div id={`${id}-changes`}>{String(changes.current)}</div>
    <button id={`${id}-force`} onClick={() => force(v => v + 1)}>Force render</button>
  </section>
}

function App() {
  return <><Consumer id="a"/><Consumer id="b"/></>
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
