import './App.css'
import DocEditor from './components/DocEditor'
import type { DocEditorHandle } from './components/DocEditor'
import { useRef } from 'react'

function App() {
  const ref = useRef<DocEditorHandle>(null)
  return (
    <div style={{ padding: 16 }}>
      <h1>DocGraph</h1>
      <p>Type in the editor. Paste images or SVG. Node metadata supported.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => {
          const json = ref.current?.getJSON()
          // eslint-disable-next-line no-console
          console.log('exported json', json)
        }}>Export JSON</button>
        <button onClick={() => {
          ref.current?.setContent({
            type: 'doc',
            content: [
              { type: 'heading', attrs: { meta: { levelMeta: 'h1' } }, attrs2: {}, attrs3: {}, attrs4: {}, attrs5: {}, attrs6: {}, content: [{ type: 'text', text: 'Imported' }] },
              { type: 'paragraph', attrs: { meta: { imported: true } }, content: [{ type: 'text', text: 'This content was imported via API.' }] },
            ],
          })
        }}>Import sample</button>
      </div>
      <DocEditor ref={ref} onUpdate={(json) => {
        // eslint-disable-next-line no-console
        console.log('doc json', json)
      }} />
    </div>
  )
}

export default App
