import { useState, useEffect, useCallback } from 'react';

// Google API configuration
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events', // Add this scope for creating events with Meet links
  'https://www.googleapis.com/auth/calendar',        // Add this scope for full calendar access
  'profile',
  'email'
];

export function useGoogleAuth() {
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [gapiInitialized, setGapiInitialized] = useState(false);
  const [gisInitialized, setGisInitialized] = useState(false);

  // Initialize Google API client
  useEffect(() => {
    // Load the Google API client script
    const loadGapiScript = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => initGapi();
      script.onerror = () => console.error('Failed to load Google API script');
      document.body.appendChild(script);
    };

    // Load the Google Identity Services script
    const loadGisScript = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => setGisInitialized(true);
      script.onerror = () => console.error('Failed to load Google Identity Services script');
      document.body.appendChild(script);
    };

    const initGapi = async () => {
      try {
        await window.gapi.load('client', async () => {
          await window.gapi.client.init({
            discoveryDocs: [
              'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
            ]
          });
          setGapiInitialized(true);
        });
      } catch (error) {
        console.error('Error initializing Google API:', error);
      }
    };

    loadGapiScript();
    loadGisScript();
  }, []);

  // Check if user is already authenticated
  useEffect(() => {
    if (!gapiInitialized || !gisInitialized) return;

    const checkAuth = async () => {
      try {
        // Check if there's a valid token in localStorage
        const tokenData = localStorage.getItem('google_token_data');
        if (tokenData) {
          const parsedData = JSON.parse(tokenData);
          const expiresAt = parsedData.expires_at;
          
          // If token is still valid
          if (expiresAt > Date.now()) {
            setIsGoogleAuthenticated(true);
            setGoogleUser(parsedData.user);
            
            // Set the token for API calls
            window.gapi.client.setToken({
              access_token: parsedData.access_token
            });
            return;
          } else {
            // Token expired, remove it
            localStorage.removeItem('google_token_data');
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        localStorage.removeItem('google_token_data');
      }
    };

    checkAuth();
  }, [gapiInitialized, gisInitialized]);

  // Login with Google
  const loginWithGoogle = useCallback(async () => {
    if (!gapiInitialized || !gisInitialized) {
      console.error('Google API not initialized yet');
      return;
    }
    
    try {
      console.log("Attempting Google login with redirect URI:", window.location.origin);
      
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES.join(' '),
        redirect_uri: window.location.origin, // Explicitly set the redirect URI
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            // Set the token for API calls
            window.gapi.client.setToken(tokenResponse);
            
            // Get user info
            window.gapi.client.request({
              path: 'https://www.googleapis.com/oauth2/v1/userinfo',
              method: 'GET'
            }).then(response => {
              const userInfo = response.result;
              setGoogleUser(userInfo);
              
              // Store token data in localStorage
              const tokenData = {
                access_token: tokenResponse.access_token,
                expires_at: Date.now() + (tokenResponse.expires_in * 1000),
                user: userInfo
              };
              localStorage.setItem('google_token_data', JSON.stringify(tokenData));
              
              setIsGoogleAuthenticated(true);
            });
          }
        }
      });
      
      client.requestAccessToken();
    } catch (error) {
      console.error('Google login error:', error);
    }
  }, [gapiInitialized, gisInitialized]);

  // Logout from Google
  const logoutFromGoogle = useCallback(async () => {
    if (!gapiInitialized) return;
    
    try {
      const token = window.gapi.client.getToken();
      if (token) {
        // Revoke the token
        window.google.accounts.oauth2.revoke(token.access_token, () => {
          window.gapi.client.setToken(null);
        });
      }
      
      // Clear local storage
      localStorage.removeItem('google_token_data');
      
      setIsGoogleAuthenticated(false);
      setGoogleUser(null);
    } catch (error) {
      console.error('Google logout error:', error);
    }
  }, [gapiInitialized]);

  return {
    isGoogleAuthenticated,
    googleUser,
    loginWithGoogle,
    logoutFromGoogle
  };
}