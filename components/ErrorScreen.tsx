
import React from 'react';
import ErrorIcon from './ErrorIcon';

interface ErrorScreenProps {
  error: Error | null;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ error }) => {
  const getErrorDetails = () => {
    // Default details for unknown errors
    let details = {
      title: 'An Unexpected Error Occurred',
      message: 'Something went wrong. Please try refreshing the page. If the problem continues, please check your network connection.',
      actions: ['Refresh the page.'],
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      details = {
        title: 'You Are Offline',
        message: 'It looks like you\'re not connected to the internet. Please check your network connection and try again.',
        actions: ['Check your Wi-Fi or cellular data connection.', 'Refresh the page once you are back online.'],
      };
      return details;
    }

    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes('api_key')) {
      details = {
        title: 'API Key Configuration Error',
        message: 'The application is missing a required API key. This is a configuration issue that needs to be resolved by the application administrator.',
        actions: [
          'Ensure the API_KEY is correctly set in the project\'s environment variables.',
          'The key must be provided before the application can function.',
        ],
      };
    } else if (errorMessage.includes('quota') || errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
      details = {
        title: 'API Quota Exceeded',
        message: 'You have reached the daily limit for API requests. The ability to generate new content is temporarily disabled.',
        actions: [
          'Please wait until tomorrow for your quota to reset.',
          'If you need higher limits, consider upgrading your API plan with the service provider.',
        ],
      };
    }

    return details;
  };

  const { title, message, actions } = getErrorDetails();

  return (
    <div role="alert" aria-live="assertive" className="w-full min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-2xl bg-gray-800 border border-red-500/50 rounded-lg p-8 text-center shadow-2xl shadow-red-500/10">
        <ErrorIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-red-300 mb-2">{title}</h1>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="text-left bg-gray-900/50 p-4 rounded-md">
          <h2 className="font-semibold text-lg text-gray-200 mb-2">What you can do:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            {actions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;
