import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Sign up with email and password
  const signup = async (email, password, name) => {
    try {
      setAuthError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user profile with display name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Save additional user info to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        createdAt: new Date().toISOString()
      });
      
      console.log("User successfully created with profile:", name);
      return userCredential.user;
    } catch (error) {
      console.error("Signup error:", error.code, error.message);
      setAuthError(error.message);
      throw error;
    }
  };

  // Login with email and password
  const login = async (email, password) => {
    try {
      setAuthError('');
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("User successfully logged in:", result.user.email);
      return result.user;
    } catch (error) {
      console.error("Login error:", error.code, error.message);
      setAuthError(error.message);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setAuthError('');
      await signOut(auth);
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      setAuthError(error.message);
      throw error;
    }
  };

  // Get user profile data
  const getUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.email || "No user");
      
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setCurrentUser({ 
            ...user, 
            profile,
            displayName: user.displayName || profile?.name || "User"
          });
        } catch (err) {
          console.error("Error updating user state:", err);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    authError,
    login,
    signup,
    logout,
    getUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};