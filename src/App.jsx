import { useState } from 'react'
import PropTypes from 'prop-types'
import { Header } from './components/Header'
import { MainContent } from './components/MainContent'

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [transcription, setTranscription] = useState('')
  const [summary, setSummary] = useState('')

  const handleFileUpload = async (event) => {
    try {
      setIsLoading(true)
      setError(null)
      // TODO: Implement API integration
      await new Promise(resolve => setTimeout(resolve, 1500))
      setTranscription('Sample transcription text...')
    } catch (err) {
      setError('Failed to process file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSummarize = async () => {
    try {
      setIsLoading(true)
      // TODO: Implement summary generation
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSummary('Sample meeting summary...')
    } catch (err) {
      setError('Summary generation failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header onLogin={() => console.log('Login clicked')} />
      <MainContent
        onFileUpload={handleFileUpload}
        onSummarize={handleSummarize}
        transcription={transcription}
        summary={summary}
        isLoading={isLoading}
        error={error}
      />

      {/* Footer */}
      <footer className="bg-white">
        <div className="w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500">© 2025 Meeting Summarizer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App