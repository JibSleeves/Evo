import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:8080'

type ModelsResponse = { models?: { name: string }[]; data?: any }

function useModels() {
  const [models, setModels] = useState<string[]>([])
  useEffect(() => {
    axios.get(`${API}/api/models`).then(res => {
      const raw: ModelsResponse = res.data
      const names = (raw.models ?? raw.data?.models ?? []).map((m: any) => m.name)
      setModels(names)
    }).catch(() => setModels([]))
  }, [])
  return models
}

export default function App() {
  const models = useModels()
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')
  const [useRag, setUseRag] = useState(false)
  const [files, setFiles] = useState<FileList | null>(null)
  const [sttFile, setSttFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [ggufFile, setGgufFile] = useState<File | null>(null)
  const [ggufName, setGgufName] = useState('custom-gguf')
  const [imgPrompt, setImgPrompt] = useState('A futuristic city skyline at sunset')
  const [generatedPath, setGeneratedPath] = useState('')
  const [allowWeb, setAllowWeb] = useState(true)
  const [cudaEnabled, setCudaEnabled] = useState(true)

  const sendChat = async () => {
    const body = { message, models: selectedModels.length ? selectedModels : undefined, use_rag: useRag, image_urls: imageUrl ? [imageUrl] : undefined }
    const res = await axios.post(`${API}/api/chat`, body)
    setReply(res.data.reply)
  }

  const ingestRag = async () => {
    if (!files || files.length === 0) return
    const form = new FormData()
    form.append('file', files[0])
    await axios.post(`${API}/api/rag/ingest`, form, { headers: { 'Content-Type': 'multipart/form-data' }})
    alert('Ingested!')
  }

  const doStt = async () => {
    if (!sttFile) return
    const form = new FormData()
    form.append('file', sttFile)
    const res = await axios.post(`${API}/api/stt`, form, { headers: { 'Content-Type': 'multipart/form-data' }})
    setMessage((m) => (m ? m + '\n' : '') + res.data.text)
  }

  const uploadGguf = async () => {
    if (!ggufFile) return
    const form = new FormData()
    form.append('name', ggufName)
    form.append('file', ggufFile)
    await axios.post(`${API}/api/models/gguf`, form, { headers: { 'Content-Type': 'multipart/form-data' }})
    alert('GGUF model created in Ollama')
  }

  const generateImage = async () => {
    const res = await axios.post(`${API}/api/image/generate`, { prompt: imgPrompt })
    setGeneratedPath(res.data.image_path)
  }

  const saveSettings = async () => {
    await axios.post(`${API}/api/settings`, { allow_web_access: allowWeb, cuda_enabled: cudaEnabled })
    alert('Settings updated')
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Inter, system-ui, Arial' }}>
      <h2>Local Cognitive AGI</h2>

      <div style={{ marginBottom: 12 }}>
        <label>Models:</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {models.map((m) => (
            <label key={m} style={{ border: '1px solid #ddd', padding: '4px 8px', borderRadius: 6 }}>
              <input type="checkbox" checked={selectedModels.includes(m)} onChange={(e) => {
                setSelectedModels((prev) => e.target.checked ? [...prev, m] : prev.filter(x => x !== m))
              }} /> {m}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>RAG: </label>
        <input type="checkbox" checked={useRag} onChange={e => setUseRag(e.target.checked)} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} style={{ width: '100%', padding: 8 }} placeholder="Ask anything..." />
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={sendChat}>Send</button>
        <input type="text" placeholder="Image URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{ flex: 1 }} />
      </div>

      {reply && (
        <div style={{ whiteSpace: 'pre-wrap', padding: 12, border: '1px solid #eee', borderRadius: 8, marginBottom: 20 }}>
          {reply}
        </div>
      )}

      <h3>Upload Document/PDF to RAG</h3>
      <input type="file" onChange={e => setFiles(e.target.files)} />
      <button onClick={ingestRag} disabled={!files}>Ingest</button>

      <h3>Speech-to-Text</h3>
      <input type="file" accept="audio/*" onChange={e => setSttFile(e.target.files?.[0] || null)} />
      <button onClick={doStt} disabled={!sttFile}>Transcribe</button>

      <h3>GGUF Upload</h3>
      <input type="text" placeholder="Model name" value={ggufName} onChange={e => setGgufName(e.target.value)} />
      <input type="file" accept=",.gguf" onChange={e => setGgufFile(e.target.files?.[0] || null)} />
      <button onClick={uploadGguf} disabled={!ggufFile}>Create</button>

      <h3>Image Generation</h3>
      <input type="text" style={{ width: '100%' }} value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} />
      <button onClick={generateImage}>Generate</button>
      {generatedPath && <div>Saved to: {generatedPath}</div>}

      <h3>Settings</h3>
      <label><input type="checkbox" checked={allowWeb} onChange={(e) => setAllowWeb(e.target.checked)} /> Allow Web Access</label>
      <br/>
      <label><input type="checkbox" checked={cudaEnabled} onChange={(e) => setCudaEnabled(e.target.checked)} /> CUDA Enabled</label>
      <br/>
      <button onClick={saveSettings}>Save</button>
    </div>
  )
}