/**
 * Firebase Error Recovery Utility
 * 
 * This script helps recover from common Firebase errors
 * and provides diagnostic information.
 */

// Error recovery function for Firebase initialization issues
function recoverFirebaseInit() {
    console.log("Attempting to recover Firebase initialization...");
    
    // Check if Firebase is already initialized
    if (window.firebase && firebase.apps.length > 0) {
        console.log("Firebase appears to be initialized already");
        
        // Try to initialize database and auth references
        try {
            window.database = firebase.database();
            window.auth = firebase.auth();
            console.log("Successfully created database and auth references");
            return true;
        } catch (e) {
            console.error("Failed to create database and auth references:", e);
        }
    }
    
    // Attempt to reinitialize Firebase
    try {
        const firebaseConfig = {
            apiKey: "AIzaSyCUTmTn0rRBb0M-UkQJxnUMrWqXYU_BgIc",
            authDomain: "users-8be65.firebaseapp.com",
            databaseURL: "https://users-8be65-default-rtdb.firebaseio.com",
            projectId: "users-8be65",
            storageBucket: "users-8be65.appspot.com",
            messagingSenderId: "829083030831",
            appId: "1:829083030831:web:36a370e62691e560bc3dda"
        };
        
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase reinitialized successfully");
            
            window.database = firebase.database();
            window.auth = firebase.auth();
            return true;
        }
    } catch (e) {
        console.error("Failed to reinitialize Firebase:", e);
    }
    
    return false;
}

// Function to diagnose common issues
function diagnosePageIssues() {
    const diagnostics = {
        firebaseLoaded: typeof firebase !== 'undefined',
        firebaseInitialized: typeof firebase !== 'undefined' && firebase.apps.length > 0,
        authAvailable: typeof firebase !== 'undefined' && typeof firebase.auth === 'function',
        databaseAvailable: typeof firebase !== 'undefined' && typeof firebase.database === 'function',
        userAuthenticated: false,
        networkOnline: navigator.onLine,
        firebaseReachable: false,
        localStorage: false,
        sessionStorage: false,
        errors: []
    };
    
    // Test localStorage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        diagnostics.localStorage = true;
    } catch (e) {
        diagnostics.errors.push('localStorage not available: ' + e.message);
    }
    
    // Test sessionStorage
    try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        diagnostics.sessionStorage = true;
    } catch (e) {
        diagnostics.errors.push('sessionStorage not available: ' + e.message);
    }
    
    // Check authentication
    if (diagnostics.authAvailable) {
        const user = firebase.auth().currentUser;
        diagnostics.userAuthenticated = !!user;
        if (user) {
            diagnostics.userEmail = user.email;
            diagnostics.userId = user.uid;
        }
    }
    
    // Test Firebase connectivity
    if (diagnostics.databaseAvailable) {
        return firebase.database().ref('.info/connected').once('value')
            .then(snapshot => {
                diagnostics.firebaseReachable = snapshot.val() === true;
                return diagnostics;
            })
            .catch(error => {
                diagnostics.errors.push('Firebase connectivity error: ' + error.message);
                return diagnostics;
            });
    }
    
    return Promise.resolve(diagnostics);
}

// Add a global diagnose function
window.diagnosePage = function() {
    console.log("Running page diagnostics...");
    
    return diagnosePageIssues()
        .then(results => {
            console.log("Diagnostic Results:", results);
            
            // Try recovery if needed
            if (!results.firebaseInitialized || !results.authAvailable || !results.databaseAvailable) {
                console.log("Attempting to recover Firebase...");
                const recovered = recoverFirebaseInit();
                console.log("Recovery attempt result:", recovered);
            }
            
            return results;
        })
        .catch(error => {
            console.error("Diagnostics failed:", error);
            return { error: error.message };
        });
};

// Auto-run diagnostics when page loads
window.addEventListener('load', function() {
    setTimeout(() => {
        window.diagnosePage().then(results => {
            if (results.errors && results.errors.length > 0) {
                console.warn("Diagnostic warnings:", results.errors);
            }
        });
    }, 3000);
});
