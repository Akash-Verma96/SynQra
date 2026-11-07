import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenText,
  CheckCircle2,
  Clock3,
  FileImage,
  FileSearch,
  FileText,
  Globe,
  LoaderCircle,
  LogOut,
  MessageSquareText,
  Plus,
  Search,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Video,
  X,
} from 'lucide-react'

import { Button } from './components/ui/button.jsx'
import { Input } from './components/ui/input.jsx'

const API_BASE = 'http://localhost:3001/api/v1'
const SOURCE_BASE = 'http://localhost:3001/uploads'

const SOURCE_OPTIONS = [
  { id: 'pdf', label: 'PDF', icon: FileText, accent: 'violet', description: 'Upload in one click' },
  { id: 'docx', label: 'DOCX', icon: FileText, accent: 'blue', description: 'Word documents' },
  { id: 'image', label: 'Image', icon: FileImage, accent: 'amber', description: 'PNG / JPG / GIF' },
  { id: 'website', label: 'Website URL', icon: Globe, accent: 'cyan', description: 'Crawl and index pages' },
  { id: 'youtube', label: 'YouTube URL', icon: Video, accent: 'rose', description: 'Transcript and index' },
  { id: 'text', label: 'Text', icon: MessageSquareText, accent: 'emerald', description: 'Paste a note or snippet' },
]

function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Completed', tone: 'status-completed', icon: CheckCircle2 },
    indexing: { label: 'Indexing', tone: 'status-indexing', icon: Clock3 },
    failed: { label: 'Failed', tone: 'status-failed', icon: AlertTriangle },
  }

  const current = map[status] || map.completed
  const Icon = current.icon

  return (
    <span className={`status-badge ${current.tone}`}>
      <Icon className="status-dot" />
      {current.label}
    </span>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="google-mark" focusable="false">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c10.493 0 19.438-7.444 19.438-20 0-1.341-.137-2.646-.389-3.917Z" opacity="0.99" />
      <path fill="#FF3D00" d="M6.306 14.691 15.24 19.2A11.91 11.91 0 0 1 24 16c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 15.729 4 8.619 8.936 6.306 14.691Z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.417-5.194l-6.198-5.285C29.126 35.466 26.721 36.4 24 36.4c-5.201 0-9.625-3.335-11.288-7.859L6.46 24.94A19.94 19.94 0 0 0 24 44Z" />
      <path fill="#1976D2" d="M46.49 24.551c.2-1.067.31-2.17.31-3.551 0-1.381-.11-2.484-.31-3.551H24v8h12.436c-.734 2.026-1.776 3.75-3.063 5.057l6.198 5.285C43.356 34.424 46.49 29.746 46.49 24.551Z" />
    </svg>
  )
}

function AuthLoadingScreen() {
  return (
    <div className="auth-screen">
      <div className="auth-loading-card">
        <LoaderCircle className="auth-loader" />
        <span>Checking your secure session…</span>
      </div>
    </div>
  )
}

function AuthScreen({ onGoogleLogin, isAuthenticating, authError }) {
  return (
    <div className="auth-screen">
      <div className="auth-shell">
        <div className="auth-copy-panel">
          <div className="auth-badge">
            <ShieldCheck className="h-4 w-4" />
            Secure workspace access
          </div>

          <h1>Turn scattered files into instant answers.</h1>

          <p className="auth-subtitle">
            Research, ingest, and query your documents, websites, and media from one elegant workspace built for speed.
          </p>

          <div className="auth-feature-list">
            <div className="feature-pill">
              <CheckCircle2 className="h-4 w-4" />
              <span>Instant semantic search</span>
            </div>
            <div className="feature-pill">
              <CheckCircle2 className="h-4 w-4" />
              <span>Multi-source indexing</span>
            </div>
            <div className="feature-pill">
              <CheckCircle2 className="h-4 w-4" />
              <span>Private team-ready workspace</span>
            </div>
          </div>

          <div className="auth-stat-grid">
            <div className="auth-stat-card">
              <span className="stat-label">Sources</span>
              <strong>10x faster</strong>
              <small>Query across files, URLs, and transcripts</small>
            </div>
            <div className="auth-stat-card">
              <span className="stat-label">Accuracy</span>
              <strong>Context-aware</strong>
              <small>Grounded answers from your indexed data</small>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-glow" aria-hidden="true" />

          <div className="auth-panel-card">
            <p className="eyebrow auth-eyebrow">Welcome back</p>
            <h2>Sign in to SynQra</h2>

            <button type="button" className="google-signin-btn" onClick={onGoogleLogin} disabled={isAuthenticating}>
              <GoogleMark />
              {isAuthenticating ? 'Connecting to Google…' : 'Continue with Google'}
            </button>

            {authError ? <div className="auth-error-banner">{authError}</div> : null}

            <div className="auth-divider">
              <span>Secure OAuth</span>
            </div>

            <div className="auth-trust-list">
              <div>
                <Sparkles className="h-4 w-4" />
                <span>Protected by session cookies</span>
              </div>
              <div>
                <ShieldCheck className="h-4 w-4" />
                <span>Works with your Google account</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getSourceColor(sourceType, mimeType) {
  if (sourceType === 'website') return 'cyan'
  if (sourceType === 'youtube') return 'rose'
  if (sourceType === 'text') return 'emerald'
  if (sourceType === 'file') {
    if (mimeType?.startsWith('image/')) return 'amber'
    if (mimeType?.includes('pdf')) return 'violet'
    return 'blue'
  }
  return 'violet'
}

function getFileKind(mimeType = '', fileName = '') {
  const loweredName = fileName.toLowerCase()
  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(loweredName)) return 'image'
  if (mimeType.includes('pdf') || /\.pdf$/i.test(loweredName)) return 'pdf'
  if (mimeType.includes('word') || /\.docx?$/i.test(loweredName)) return 'docx'
  if (mimeType.includes('text') || /\.(txt|md)$/i.test(loweredName)) return 'text'
  return 'file'
}

function buildYoutubeEmbedUrl(url) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace('www.', '')
    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed${parsed.pathname}`
    }
    const videoId = parsed.searchParams.get('v')
    if (videoId) return `https://www.youtube.com/embed/${videoId}`
    return `https://www.youtube.com/embed/${parsed.pathname.split('/').filter(Boolean).at(-1)}`
  } catch {
    return null
  }
}

function App() {
  const [user, setUser] = useState(null)
  const [authState, setAuthState] = useState('checking')
  const [authReady, setAuthReady] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState('')
  const [sources, setSources] = useState([])
  const [selectedSourceId, setSelectedSourceId] = useState(null)
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [messages, setMessages] = useState([])
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isQuerying, setIsQuerying] = useState(false)
  const [queryStatus, setQueryStatus] = useState('Waiting for a question')
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [selectedUploadType, setSelectedUploadType] = useState(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [textSnippet, setTextSnippet] = useState('')
  const [textName, setTextName] = useState('')
  const [showViewer, setShowViewer] = useState(true)
  const fileInputRef = useRef(null)
  const threadRef = useRef(null)

  const fetchJson = async (endpoint, options = {}) => {
    const response = await fetch(endpoint, { credentials: 'include', ...options })
    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await response.json() : {}
    return { response, data }
  }

  const refreshSession = async () => {
    try {
      const { response, data } = await fetchJson(`${API_BASE}/me`)
      if (response.ok && data?.success && data.user) {
        setUser(data.user)
        setAuthState('authenticated')
        return true
      }
      setUser(null)
      setAuthState('unauthenticated')
      return false
    } catch (error) {
      console.error('Auth session check failed:', error)
      setUser(null)
      setAuthState('unauthenticated')
      return false
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authStatus = params.get('auth')

    if (authStatus === 'success' || authStatus === 'failed') {
      window.history.replaceState({}, '', window.location.pathname)

      if (authStatus === 'success') {
        setAuthError('')
        setAuthState('checking')
        setAuthReady(false)
        refreshSession().finally(() => setAuthReady(true))
        return
      }

      setAuthState('unauthenticated')
      setAuthReady(true)
      setAuthError('Google sign-in was interrupted. Please try again.')
      return
    }

    let isMounted = true

    const loadSession = async () => {
      await refreshSession()
      if (isMounted) {
        setAuthReady(true)
      }
    }

    loadSession()

    return () => {
      isMounted = false
    }
  }, [])

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? sources[0] ?? null,
    [selectedSourceId, sources],
  )

  const getProfileImage = () => {
    if (user?.avatarUrl) return user.avatarUrl
    if (user?.picture) return user.picture
    if (user?.imageUrl) return user.imageUrl
    if (user?.email) {
      const initials = (user.name || user.email).trim().charAt(0).toUpperCase() || 'S'
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=3b82f6&color=ffffff&size=128&rounded=true&bold=true&format=png`
    }
    return null
  }

  const handleGoogleLogin = () => {
    setAuthError('')
    setIsAuthenticating(true)
    window.location.assign(`${API_BASE}/google`)
  }

  const handleLogout = async () => {
    try {
      await fetchJson(`${API_BASE}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setUser(null)
      setAuthState('unauthenticated')
      window.location.assign(window.location.origin)
    }
  }

  useEffect(() => {
    if (!selectedSource && sources[0]) {
      setSelectedSourceId(sources[0].id)
    }
  }, [selectedSource, sources])

  useEffect(() => {
    if (!selectedSource) return
    setAnswer('')
    if (selectedSource.status === 'completed') {
      setQueryStatus('Ready to answer')
    } else {
      setQueryStatus('Waiting for a completed source')
    }
  }, [selectedSource])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages, isQuerying])

  const completeSource = (sourceId, overrides = {}) => {
    setSources((current) =>
      current.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              ...overrides,
              status: overrides.status ?? source.status,
            }
          : source,
      ),
    )
  }

  const pollIndexJob = async (jobId, sourceId) => {
    if (!jobId) return

    try {
      const { response, data } = await fetchJson(`${API_BASE}/index/${jobId}`)

      if (!response.ok && data?.error) {
        throw new Error(data.error)
      }

      if (data.status === 'completed') {
        const storedFile = data.result?.fileUrl || data.result?.storedAs
        const resolvedFileUrl = storedFile
          ? storedFile.startsWith('http')
            ? storedFile
            : `${SOURCE_BASE}/${storedFile}`
          : undefined

        completeSource(sourceId, {
          status: 'completed',
          updatedAt: 'Ready',
          preview: 'Indexed and ready for queries',
          fileUrl: resolvedFileUrl,
        })
        return
      }

      if (data.status === 'failed') {
        completeSource(sourceId, {
          status: 'failed',
          updatedAt: 'Failed',
          preview: 'Could not finish indexing this source',
        })
        return
      }

      setTimeout(() => pollIndexJob(jobId, sourceId), 1800)
    } catch (error) {
      console.error('Index poll failed:', error)
      completeSource(sourceId, {
        status: 'failed',
        updatedAt: 'Failed',
        preview: 'The indexing service is unavailable',
      })
    }
  }

  const pollWebsiteJob = async (jobId, sourceId) => {
    try {
      const { response, data } = await fetchJson(`${API_BASE}/crawl/${jobId}`)

      if (!response.ok && data?.error) {
        throw new Error(data.error)
      }

      if (data.status === 'completed') {
        const nestedIndexJobId = data.result?.id || data.result?.jobId || data.result?.job?.id

        if (nestedIndexJobId) {
          completeSource(sourceId, {
            status: 'indexing',
            updatedAt: 'Indexing',
            preview: 'Crawling complete. Now indexing the site content.',
          })
          setTimeout(() => pollIndexJob(nestedIndexJobId, sourceId), 600)
          return
        }

        completeSource(sourceId, {
          status: 'completed',
          updatedAt: 'Ready',
          preview: 'Website indexed and ready',
        })
        return
      }

      if (data.status === 'failed') {
        completeSource(sourceId, {
          status: 'failed',
          updatedAt: 'Failed',
          preview: 'The website crawl failed',
        })
        return
      }

      setTimeout(() => pollWebsiteJob(jobId, sourceId), 1800)
    } catch (error) {
      console.error('Website poll failed:', error)
      completeSource(sourceId, {
        status: 'failed',
        updatedAt: 'Failed',
        preview: 'The crawl job could not be tracked',
      })
    }
  }

  const pollYoutubeJob = async (jobId, sourceId) => {
    try {
      const { response, data } = await fetchJson(`${API_BASE}/youtube/${jobId}`)

      if (!response.ok && data?.error) {
        throw new Error(data.error)
      }

      if (data.status === 'completed') {
        completeSource(sourceId, {
          status: 'completed',
          updatedAt: 'Ready',
          preview: 'Transcription complete and indexed',
        })
        return
      }

      if (data.status === 'failed') {
        completeSource(sourceId, {
          status: 'failed',
          updatedAt: 'Failed',
          preview: 'The transcript could not be generated',
        })
        return
      }

      setTimeout(() => pollYoutubeJob(jobId, sourceId), 1800)
    } catch (error) {
      console.error('YouTube poll failed:', error)
      completeSource(sourceId, {
        status: 'failed',
        updatedAt: 'Failed',
        preview: 'The transcript job could not be tracked',
      })
    }
  }

  const uploadFiles = async (files) => {
    if (!files.length) return

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    setIsUploading(true)
    setShowSourceModal(false)

    try {
      const { response, data } = await fetchJson(`${API_BASE}/index`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(data?.error || 'Upload failed')
      }

      const fileSources = (data.jobs || []).map(({ jobId, file }) => {
        const fileKind = getFileKind(file.mimeType, file.originalName)
        return {
          id: `source-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: file.originalName,
          status: 'indexing',
          updatedAt: 'Processing',
          preview: 'Queued for indexing',
          accent: getSourceColor('file', file.mimeType),
          fileUrl: fileKind === 'image' || fileKind === 'pdf' ? `${SOURCE_BASE}/${file.storedAs}` : null,
          sourceType: 'file',
          mimeType: file.mimeType,
          fileKind,
          storedAs: file.storedAs,
          jobId,
          url: null,
        }
      })

      setSources((current) => [...fileSources, ...current])
      setSelectedSourceId(fileSources[0]?.id ?? null)
      setShowViewer(true)

      fileSources.forEach((source) => {
        pollIndexJob(source.jobId, source.id)
      })
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length > 0) {
      uploadFiles(selectedFiles)
    }
  }

  const handleAddUrlSource = async (type) => {
    if (type === 'website') {
      const value = websiteUrl.trim()
      if (!value) return

      setIsUploading(true)
      setShowSourceModal(false)
      try {
        const { response, data } = await fetchJson(`${API_BASE}/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websiteUrl: value, sourceName: 'Website source' }),
        })

        if (!response.ok) throw new Error(data?.error || 'Website source failed')

        const source = {
          id: `source-${Date.now()}`,
          name: value,
          status: 'indexing',
          updatedAt: 'Crawling',
          preview: 'Website crawl in progress',
          accent: 'cyan',
          sourceType: 'website',
          mimeType: 'text/html',
          fileKind: 'website',
          url: value,
          jobId: data.jobId,
        }

        setSources((current) => [source, ...current])
        setSelectedSourceId(source.id)
        setShowViewer(true)
        pollWebsiteJob(source.jobId, source.id)
      } catch (error) {
        console.error('Website source upload failed:', error)
      } finally {
        setIsUploading(false)
        setWebsiteUrl('')
      }
      return
    }

    if (type === 'youtube') {
      const value = youtubeUrl.trim()
      if (!value) return

      setIsUploading(true)
      setShowSourceModal(false)
      try {
        const { response, data } = await fetchJson(`${API_BASE}/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtubeUrl: value, sourceName: 'YouTube video' }),
        })

        if (!response.ok) throw new Error(data?.error || 'YouTube source failed')

        const source = {
          id: `source-${Date.now()}`,
          name: value,
          status: 'indexing',
          updatedAt: 'Transcribing',
          preview: 'Retrieving captions and indexing transcript',
          accent: 'rose',
          sourceType: 'youtube',
          mimeType: 'video/mp4',
          fileKind: 'youtube',
          url: value,
          jobId: data.jobId,
        }

        setSources((current) => [source, ...current])
        setSelectedSourceId(source.id)
        setShowViewer(true)
        pollYoutubeJob(source.jobId, source.id)
      } catch (error) {
        console.error('YouTube source upload failed:', error)
      } finally {
        setIsUploading(false)
        setYoutubeUrl('')
      }
      return
    }

    if (type === 'text') {
      const value = textSnippet.trim()
      if (!value) return

      setIsUploading(true)
      setShowSourceModal(false)
      try {
        const { response, data } = await fetchJson(`${API_BASE}/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: value, sourceName: textName.trim() || 'Text snippet' }),
        })

        if (!response.ok) throw new Error(data?.error || 'Text upload failed')

        const source = {
          id: `source-${Date.now()}`,
          name: textName.trim() || 'Text snippet',
          status: 'completed',
          updatedAt: 'Ready',
          preview: 'Text indexed and ready to query',
          accent: 'emerald',
          sourceType: 'text',
          mimeType: 'text/plain',
          fileKind: 'text',
          url: null,
          textPreview: value,
        }

        setSources((current) => [source, ...current])
        setSelectedSourceId(source.id)
        setShowViewer(true)
      } catch (error) {
        console.error('Text upload failed:', error)
      } finally {
        setIsUploading(false)
        setTextSnippet('')
        setTextName('')
      }
    }
  }

  const handleSubmitQuery = async () => {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) return

    if (!selectedSource || selectedSource.status !== 'completed') {
      setAnswer('Please select a completed source before asking a question.')
      setQueryStatus('Source is not ready')
      return
    }

    if (isQuerying) return

    const fullConversation = [
      ...messages,
      { id: `user-${Date.now()}`, role: 'user', content: trimmedQuery },
    ]

    const history = fullConversation.map((message) => ({
      role: message.role,
      content: typeof message.content === 'string' ? message.content : '',
    }))

    setQuery('')
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: trimmedQuery }])

    setIsQuerying(true)
    setQueryStatus('Scanning the selected source...')
    setAnswer('')

    try {
      const { response, data } = await fetchJson(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmedQuery,
          conversationHistory: history,
        }),
      })

      if (!response.ok) {
        throw new Error(data?.error || 'Query failed')
      }

      const jobId = data.jobId

      const poll = async () => {
        const { response: pollResponse, data: pollData } = await fetchJson(`${API_BASE}/query/${jobId}`)

        if (!pollResponse.ok) {
          throw new Error(pollData?.error || 'Unable to poll query status')
        }

        if (pollData.status === 'completed') {
          const resultValue = pollData.result
          const answerText =
            typeof resultValue === 'string'
              ? resultValue
              : resultValue?.answer || resultValue?.response || 'No answer generated yet.'

          const messageId = `assistant-${Date.now()}`
          setMessages((current) => [...current, { id: messageId, role: 'assistant', content: '', isStreaming: true }])
          setStreamingMessageId(messageId)
          setAnswer(answerText)
          setQueryStatus('Answer ready')

          let index = 0
          const interval = setInterval(() => {
            index += 1
            setMessages((current) =>
              current.map((message) =>
                message.id === messageId
                  ? { ...message, content: answerText.slice(0, index), isStreaming: index < answerText.length }
                  : message,
              ),
            )

            if (index >= answerText.length) {
              clearInterval(interval)
              setIsQuerying(false)
              setStreamingMessageId(null)
            }
          }, 18)

          return
        }

        if (pollData.status === 'failed') {
          const messageId = `assistant-${Date.now()}`
          const errorText = pollData.error || 'The query failed. Please try again.'
          setMessages((current) => [...current, { id: messageId, role: 'assistant', content: errorText, isStreaming: false }])
          setAnswer(errorText)
          setQueryStatus('Query failed')
          setIsQuerying(false)
          return
        }

        setQueryStatus('Extracting the most relevant insights...')
        setTimeout(poll, 1200)
      }

      poll()
    } catch (error) {
      console.error('Query error:', error)
      const messageId = `assistant-${Date.now()}`
      const errorText = 'Could not answer this query right now. Please try again.'
      setMessages((current) => [...current, { id: messageId, role: 'assistant', content: errorText, isStreaming: false }])
      setAnswer(errorText)
      setQueryStatus('Query unavailable')
      setIsQuerying(false)
    }
  }

  const hasActiveStream = Boolean(streamingMessageId)

  function formatInlineText(text = '') {
    const tokens = []
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|_[^_]+_|__[^_]+__)/g
    let lastIndex = 0

    for (const match of text.matchAll(regex)) {
      const index = match.index
      const value = match[0]

      if (index > lastIndex) {
        tokens.push({ type: 'text', value: text.slice(lastIndex, index) })
      }

      const plain = value.replace(/^\*\*|\*\*$|^\*|\*$|^_|_$|^`|`$/g, '')
      tokens.push({
        type: 'format',
        value: plain,
        style: value.startsWith('**') ? 'bold' : value.startsWith('*') ? 'italic' : 'code',
      })
      lastIndex = index + value.length
    }

    if (lastIndex < text.length) {
      tokens.push({ type: 'text', value: text.slice(lastIndex) })
    }

    return tokens.map((token, index) => {
      if (token.type === 'text') return <span key={`text-${index}`}>{token.value}</span>
      if (token.style === 'bold') return <strong key={`bold-${index}`}>{token.value}</strong>
      if (token.style === 'italic') return <em key={`italic-${index}`}>{token.value}</em>
      return (
        <code key={`code-${index}`} className="inline-code">
          {token.value}
        </code>
      )
    })
  }

  function renderFormattedAnswer(markdown = '') {
    const blocks = markdown.trim().split(/\n\s*\n+/).filter(Boolean)

    return blocks.map((block, blockIndex) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      if (!lines.length) return null

      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return (
          <ul key={`list-${blockIndex}`} className="answer-list">
            {lines.map((line, index) => (
              <li key={`item-${index}`}>{formatInlineText(line.replace(/^[-*]\s+/, ''))}</li>
            ))}
          </ul>
        )
      }

      if (lines.every((line) => /^\d+\.\s+/.test(line))) {
        return (
          <ol key={`num-list-${blockIndex}`} className="answer-list numbered-list">
            {lines.map((line, index) => (
              <li key={`numbered-item-${index}`}>{formatInlineText(line.replace(/^\d+\.\s+/, ''))}</li>
            ))}
          </ol>
        )
      }

      const firstLine = lines[0]
      const headingMatch = firstLine.match(/^(#{1,3})\s+(.*)$/)

      if (headingMatch) {
        const level = headingMatch[1].length
        const HeadingTag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5'
        const content = headingMatch[2]

        return (
          <HeadingTag key={`heading-${blockIndex}`} className="answer-heading">
            {formatInlineText(content)}
          </HeadingTag>
        )
      }

      if (/^definition\s*:/i.test(firstLine) || /^key points\s*:/i.test(firstLine)) {
        return (
          <div key={`definition-${blockIndex}`} className="answer-definition">
            <div className="definition-label">{firstLine.split(':')[0]}</div>
            <div className="definition-content">
              {formatInlineText(firstLine.replace(/^[^:]+:\s*/, '') || lines.slice(1).join(' '))}
            </div>
          </div>
        )
      }

      return (
        <p key={`text-${blockIndex}`} className="answer-paragraph">
          {formatInlineText(lines.join(' '))}
        </p>
      )
    })
  }

  if (!authReady) {
    return <AuthLoadingScreen />
  }

  if (authState !== 'authenticated') {
    return <AuthScreen onGoogleLogin={handleGoogleLogin} isAuthenticating={isAuthenticating} authError={authError} />
  }

  return (
    <div className="app-shell">
      <div className="ambient-dots" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, index) => (
          <span
            key={index}
            style={{
              left: `${(index * 13) % 100}%`,
              top: `${(index * 19) % 90}%`,
              animationDelay: `${index * 0.7}s`,
            }}
          />
        ))}
      </div>

      {showSourceModal && (
        <div className="source-modal-backdrop" onClick={() => setShowSourceModal(false)}>
          <div className="source-modal" onClick={(event) => event.stopPropagation()}>
            <div className="source-modal-header">
              <div>
                <p className="eyebrow">Add source</p>
                <h3>Choose a source type</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setShowSourceModal(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="source-option-grid">
              {SOURCE_OPTIONS.map(({ id, label, icon: Icon, accent, description }) => (
                <button
                  key={id}
                  type="button"
                  className="source-option-card"
                  onClick={() => {
                    if (id === 'pdf' || id === 'docx' || id === 'image') {
                      setSelectedUploadType(id)
                      fileInputRef.current.accept =
                        id === 'image'
                          ? 'image/*'
                          : id === 'pdf'
                            ? 'application/pdf'
                            : '.pdf,.doc,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                      fileInputRef.current.multiple = true
                      fileInputRef.current.click()
                      return
                    }

                    setSelectedUploadType(id)
                    if (id === 'website' || id === 'youtube' || id === 'text') {
                      setShowSourceModal(true)
                    }
                  }}
                >
                  <div className={`source-option-icon ${accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="source-option-copy">
                    <strong>{label}</strong>
                    <span>{description}</span>
                  </div>
                </button>
              ))}
            </div>

            {(selectedUploadType === 'website' || selectedUploadType === 'youtube' || selectedUploadType === 'text') && (
              <div className="source-form-panel">
                {selectedUploadType === 'website' && (
                  <>
                    <label className="source-form-label">Website URL</label>
                    <Input
                      value={websiteUrl}
                      onChange={(event) => setWebsiteUrl(event.target.value)}
                      placeholder="https://example.com"
                    />
                    <Button className="modal-submit-btn" onClick={() => handleAddUrlSource('website')}>
                      <UploadCloud className="h-4 w-4" />
                      Queue website
                    </Button>
                  </>
                )}

                {selectedUploadType === 'youtube' && (
                  <>
                    <label className="source-form-label">YouTube URL</label>
                    <Input
                      value={youtubeUrl}
                      onChange={(event) => setYoutubeUrl(event.target.value)}
                      placeholder="https://youtu.be/..."
                    />
                    <Button className="modal-submit-btn" onClick={() => handleAddUrlSource('youtube')}>
                      <UploadCloud className="h-4 w-4" />
                      Queue video
                    </Button>
                  </>
                )}

                {selectedUploadType === 'text' && (
                  <>
                    <label className="source-form-label">Source name</label>
                    <Input
                      value={textName}
                      onChange={(event) => setTextName(event.target.value)}
                      placeholder="Notes, product brief, call transcript"
                    />
                    <label className="source-form-label">Text content</label>
                    <textarea
                      value={textSnippet}
                      onChange={(event) => setTextSnippet(event.target.value)}
                      placeholder="Paste your content here..."
                      className="text-area-input"
                    />
                    <Button className="modal-submit-btn" onClick={() => handleAddUrlSource('text')}>
                      <UploadCloud className="h-4 w-4" />
                      Index text
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`notebook-layout ${showViewer ? 'with-viewer' : 'without-viewer'}`}>
        <aside className="sidebar-panel">
          <div className="sidebar-header">
            <div className="brand-box">
              <BookOpenText className="h-5 w-5" />
            </div>
            <div className="brand-copy">
              <p className="eyebrow">Workspace</p>
              <h1>SourceQ</h1>
            </div>
            <button type="button" className="ghost-icon" aria-label="Add new source" onClick={() => setShowSourceModal(true)}>
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button className="primary-upload" onClick={() => setShowSourceModal(true)}>
            <UploadCloud className="h-4 w-4" />
            {isUploading ? 'Uploading...' : '+ Add Source'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,.doc,.docx,image/*"
            className="hidden-input"
            multiple
            onChange={handleFileSelection}
          />

          <div className="source-list" aria-label="Source list">
            {sources.length === 0 ? (
              <div className="empty-source-state">
                <Sparkles className="h-4 w-4" />
                No sources yet. Add one to begin.
              </div>
            ) : (
              sources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setSelectedSourceId(source.id)}
                  className={`source-item ${selectedSourceId === source.id ? 'selected' : ''}`}
                >
                  <div className={`source-preview-icon ${source.accent || 'violet'}`}>
                    {source.sourceType === 'website' ? <Globe className="h-4 w-4" /> : source.sourceType === 'youtube' ? <Video className="h-4 w-4" /> : source.sourceType === 'text' ? <MessageSquareText className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="source-main">
                    <div className="source-row">
                      <span className="source-name">{source.name}</span>
                      <StatusBadge status={source.status} />
                    </div>
                    <p className="source-preview">{source.preview}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className={`main-panel ${showViewer ? 'with-viewer' : 'expanded'}`}>
          <header className="topbar">
            <div className="topbar-left">
              <div className="status-pill-wrap">
                <span className="status-pill">Research Workspace</span>
              </div>
            </div>
            <div className="topbar-right">
              {!showViewer && (
                <button type="button" className="viewer-toggle" onClick={() => setShowViewer(true)}>
                  <Search className="h-3.5 w-3.5" />
                  Open viewer
                </button>
              )}

              <div className="profile-badge-shell">
                <div className="profile-badge">
                  {getProfileImage() ? (
                    <img src={getProfileImage()} alt={user?.name || 'Profile'} className="profile-avatar" />
                  ) : (
                    <span>{(user?.name || 'S').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="profile-copy">
                  <span className="profile-name">{user?.name || 'SynQra user'}</span>
                  <span className="profile-email">{user?.email || 'Google account'}</span>
                </div>
              </div>

              <button type="button" className="logout-button" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>

              <span className={`state-pill ${selectedSource?.status === 'completed' ? 'ready' : ''}`}>
                {selectedSource?.status === 'completed'
                  ? 'Ready'
                  : selectedSource?.status === 'indexing'
                    ? 'Processing'
                    : selectedSource?.status === 'failed'
                      ? 'Needs attention'
                      : 'Idle'}
              </span>
            </div>
          </header>

          <div className="chat-shell">
            <section className="chat-panel">
              <div className="thread" ref={threadRef}>
                {messages.length === 0 && !isQuerying ? (
                  <div className="message-row assistant-message">
                    <div className="message-bubble assistant-bubble">
                      <span className="message-meta assistant-meta">AI Assistant</span>
                      <div className="empty-chat-state">
                        <Sparkles className="h-5 w-5" />
                        Ask a question and the answer will appear here.
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isAssistantMessage = message.role === 'assistant'

                    return (
                      <div
                        key={message.id}
                        className={`message-row ${isAssistantMessage ? 'assistant-message' : 'user-message'}`}
                      >
                        <div className={`message-bubble ${isAssistantMessage ? 'assistant-bubble' : 'user-bubble'}`}>
                          <span className={`message-meta ${isAssistantMessage ? 'assistant-meta' : ''}`}>
                            {isAssistantMessage ? 'AI Assistant' : 'You'}
                          </span>

                          {isAssistantMessage ? (
                            message.content ? (
                              <>
                                <div className="answer-box">{renderFormattedAnswer(message.content)}</div>
                                {selectedSource && (
                                  <div className="citation-box">
                                    <div className="citation-header">
                                      <FileSearch className="h-4 w-4" />
                                      <span>Source references</span>
                                    </div>
                                    <div className="citation-list">
                                      <button
                                        type="button"
                                        className="citation-chip"
                                        onClick={() => setSelectedSourceId(selectedSource.id)}
                                      >
                                        <span>{selectedSource.name}</span>
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="thinking-box">
                                <div className="thinking-loader" aria-live="polite">
                                  <span />
                                  <span />
                                  <span />
                                </div>
                                <span className="thinking-text">{queryStatus}</span>
                              </div>
                            )
                          ) : (
                            <p>{message.content}</p>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}

                {isQuerying && !hasActiveStream && messages.length > 0 && (
                  <div className="message-row assistant-message">
                    <div className="message-bubble assistant-bubble">
                      <span className="message-meta assistant-meta">AI Assistant</span>
                      <div className="thinking-box">
                        <div className="thinking-loader" aria-live="polite">
                          <span />
                          <span />
                          <span />
                        </div>
                        <span className="thinking-text">{queryStatus}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="prompt-box">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ask a question about your source…"
                  className="ask-input"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSubmitQuery()
                  }}
                />
                <Button
                  className="send-button"
                  onClick={handleSubmitQuery}
                  disabled={isQuerying || !query.trim() || !selectedSource || selectedSource.status !== 'completed'}
                >
                  <SendHorizonal className="h-4 w-4" />
                  {isQuerying ? 'Working...' : 'Send'}
                </Button>
              </div>
            </section>
          </div>
        </main>

        {showViewer && (
          <aside className="viewer-panel">
            <div className="viewer-header">
              <div>
                <p className="eyebrow">Document viewer</p>
                <h2>{selectedSource?.name || 'No source selected'}</h2>
              </div>
              <div className="viewer-header-actions">
                {selectedSource && <StatusBadge status={selectedSource.status} />}
                <button type="button" className="panel-close-button" aria-label="Close viewer" onClick={() => setShowViewer(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {selectedSource ? (
              <div className="viewer-embed-wrap">
                {selectedSource.sourceType === 'website' && selectedSource.url ? (
                  <iframe title={selectedSource.name} src={selectedSource.url} className="viewer-iframe" allow="fullscreen" />
                ) : selectedSource.sourceType === 'youtube' && selectedSource.url ? (
                  <div className="youtube-player-shell">
                    <iframe
                      title={selectedSource.name}
                      src={buildYoutubeEmbedUrl(selectedSource.url)}
                      className="viewer-iframe youtube-iframe"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : selectedSource.sourceType === 'text' ? (
                  <div className="viewer-text-plain">
                    <pre>{selectedSource.textPreview || 'No text preview available yet.'}</pre>
                  </div>
                ) : selectedSource.fileKind === 'image' && selectedSource.fileUrl ? (
                  <img src={selectedSource.fileUrl} alt={selectedSource.name} className="viewer-image" />
                ) : selectedSource.fileKind === 'pdf' && selectedSource.fileUrl ? (
                  <iframe title={selectedSource.name} src={selectedSource.fileUrl} className="viewer-iframe" allow="fullscreen" />
                ) : selectedSource.fileKind === 'docx' ? (
                  <div className="viewer-file-placeholder">
                    <FileText className="h-8 w-8" />
                    <h3>DOCX preview not available in-browser</h3>
                    <p>The document is indexed and ready to query.</p>
                  </div>
                ) : (
                  <div className="viewer-file-placeholder">
                    <Search className="h-8 w-8" />
                    <h3>Content ready</h3>
                    <p>This source has been indexed and is ready for semantic queries.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="viewer-empty-state">
                <div className="empty-viewer-icon">
                  <Search className="h-6 w-6" />
                </div>
                <h3>Select a source</h3>
                <p>Choose a source from the left to open the original content here.</p>
              </div>
            )}

            {selectedSource && (
              <div className="viewer-meta">
                <div className="meta-row">
                  <span className="meta-label">Status</span>
                  <span className="meta-value">{selectedSource.updatedAt}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Summary</span>
                  <span className="meta-value">{selectedSource.preview}</span>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export default App
