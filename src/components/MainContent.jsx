import PropTypes from 'prop-types';

export const MainContent = ({ onFileUpload, transcription, summary, isLoading, error }) => (
  <div className="py-12 mt-16 w-full">
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-8">Meeting Summary Platform</h2>
        
        <div className="max-w-3xl mx-auto bg-surface-default rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-4">
            <label className="block text-lg font-medium text-text-secondary">
              Upload Meeting Recording
              <input
                type="file"
                className="mt-2 block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-base file:text-surface-default hover:file:bg-primary-hover"
                accept=".mp3,.wav,.m4a"
                onChange={onFileUpload}
              />
            </label>

            {isLoading && (
              <div className="flex items-center justify-center text-text-secondary">
                <svg className="animate-spin h-8 w-8 text-primary-base" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2">Processing...</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                Error: {error}
              </div>
            )}

            {transcription && (
              <div className="text-left space-y-4">
                <div className="bg-surface-subtle p-4 rounded-md">
                  <h3 className="font-semibold text-text-primary mb-2">Transcription</h3>
                  <p className="text-text-secondary whitespace-pre-wrap">{transcription}</p>
                </div>

                <button
                  onClick={onSummarize}
                  className="w-full py-2 px-4 bg-primary-base text-surface-default rounded-md hover:bg-primary-hover disabled:opacity-50"
                  disabled={!transcription}
                >
                  Generate Summary
                </button>
              </div>
            )}

            {summary && (
              <div className="mt-8 bg-surface-subtle p-6 rounded-md text-left">
                <h3 className="font-semibold text-text-primary mb-4">Meeting Summary</h3>
                <div className="prose text-text-secondary max-w-none">
                  {summary}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

MainContent.propTypes = {
  onFileUpload: PropTypes.func.isRequired,
  onSummarize: PropTypes.func.isRequired,
  transcription: PropTypes.string,
  summary: PropTypes.string,
  isLoading: PropTypes.bool,
  error: PropTypes.string
};