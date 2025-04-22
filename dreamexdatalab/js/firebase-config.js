// Firebase configuration and initialization
try {
    const firebaseConfig = {
        apiKey: "AIzaSyCUTmTn0rRBb0M-UkQJxnUMrWqXYU_BgIc",
        authDomain: "users-8be65.firebaseapp.com",
        databaseURL: "https://users-8be65-default-rtdb.firebaseio.com",
        projectId: "users-8be65",
        storageBucket: "users-8be65.firebasestorage.app",
        messagingSenderId: "829083030831",
        appId: "1:829083030831:web:36a370e62691e560bc3dda"
    };

    // Initialize Firebase only if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
        
        // Configure auth settings to allow custom domain
        // This helps Firebase Auth work with custom domains like dreamexdatalab.com
        if (window.location.hostname === 'dreamexdatalab.com' || 
            window.location.hostname.endsWith('.dreamexdatalab.com')) {
            firebase.auth().settings.appVerificationDisabledForTesting = false;
            console.log('Custom domain authentication settings applied');
        }
    }

    const db = firebase.database();
    const auth = firebase.auth();
    const storage = firebase.storage();

    // Set up authentication state observer
    let currentUser = null;

    // Observe authentication state changes
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            console.log('User signed in:', user.uid);
        } else {
            console.log('User signed out');
        }
    });

    // Expose Firebase services globally
    window.firebaseApp = {
        db,
        auth,
        storage,
        getCurrentUser: () => currentUser
    };

} catch (error) {
    console.error('Firebase initialization error:', error);
    // Alert the application about the initialization failure
    window.dispatchEvent(new CustomEvent('firebase-init-error', { detail: error }));
}

// Sign in anonymously if not already authenticated
const ensureAuthenticated = async () => {
    if (!auth.currentUser) {
        try {
            await auth.signInAnonymously();
            console.log("Signed in anonymously");
            return true;
        } catch (error) {
            console.error("Anonymous authentication failed:", error);
            return false;
        }
    }
    return true;
};

// Get current authenticated user
const getCurrentUser = () => {
    return auth.currentUser;
};

// Sign out current user
const signOut = () => {
    return auth.signOut();
};

// Upload file to Firebase Storage with proper metadata to allow downloads by authenticated users
const uploadFileToStorage = async (file, folder = 'uploads') => {
    await ensureAuthenticated();
    
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `${folder}/${fileName}`;
    
    // Create storage reference
    const fileRef = storage.ref().child(filePath);
    
    // Set metadata with proper permissions for authenticated users
    const metadata = {
        contentType: file.type,
        customMetadata: {
            'uploadedBy': auth.currentUser ? auth.currentUser.uid : 'anonymous',
            'uploadDate': new Date().toISOString(),
            'publicReadable': 'true'  // Flag to allow public download
        }
    };
    
    try {
        // Upload with metadata
        const uploadTask = fileRef.put(file, metadata);
        
        // Return a promise that resolves with the file data when upload completes
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                // Progress function
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload progress: ${progress}%`);
                },
                // Error function
                (error) => {
                    console.error('Upload error:', error);
                    reject(error);
                },
                // Success function
                async () => {
                    try {
                        // Get download URL with added public access
                        const downloadURL = await fileRef.getDownloadURL();
                        
                        // Return file data
                        resolve({
                            name: file.name,
                            path: filePath,
                            size: formatFileSize(file.size),
                            url: downloadURL,
                            timestamp: timestamp,
                            contentType: file.type
                        });
                    } catch (error) {
                        console.error('Error getting download URL:', error);
                        reject(error);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Error initializing upload:', error);
        throw error;
    }
};

// Format file size for display
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Function to download a file - ensures the user is authenticated first
const getFileDownloadURL = async (filePath) => {
    await ensureAuthenticated();
    
    try {
        const fileRef = storage.ref(filePath);
        const url = await fileRef.getDownloadURL();
        return url;
    } catch (error) {
        console.error('Error getting download URL:', error);
        throw error;
    }
};

// Function to check if user has access to a specific page
const userHasAccess = async (pagePermission) => {
    const user = auth.currentUser;
    if (!user) return false;
    
    // For simplicity, authenticated users have access to all pages
    // You can implement more complex permission checks here
    return true;
};

// Function to redirect to login page if not authenticated
const requireAuth = (redirectTo = 'login.html') => {
    if (!auth.currentUser) {
        window.location.href = redirectTo;
        return false;
    }
    return true;
};

// Update user information in database
const updateUserProfile = async (userData) => {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user!');
    
    try {
        // Update user display name if provided
        if (userData.displayName) {
            await user.updateProfile({
                displayName: userData.displayName
            });
        }
        
        // Update user email if provided
        if (userData.email && userData.email !== user.email) {
            await user.updateEmail(userData.email);
        }
        
        // Update additional user data in database
        return await db.ref('users/' + user.uid).update({
            ...userData,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
};

// Export functions and objects
window.firebaseHelper = {
    ensureAuthenticated,
    getCurrentUser,
    signOut,
    uploadFileToStorage,
    getFileDownloadURL,
    userHasAccess,
    requireAuth,
    updateUserProfile
};