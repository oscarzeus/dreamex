/**
 * User Dropdown Handler
 * This script loads users from Firebase and populates dropdown lists
 * for "Line Manager" and "Reported By" fields.
 */

// Function to load users into dropdown elements
function loadUsersIntoDropdown(dropdownId, placeholder = "Select a user") {
    console.log(`Loading users into dropdown: ${dropdownId}`);
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.error(`Dropdown element with ID '${dropdownId}' not found`);
        return Promise.reject(new Error(`Dropdown element with ID '${dropdownId}' not found`));
    }
    
    // Clear existing options
    while (dropdown.firstChild) {
        dropdown.removeChild(dropdown.firstChild);
    }
    
    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    dropdown.appendChild(placeholderOption);
    
    // Reference to Firebase database
    const database = firebase.database();
    
    // Show loading option
    const loadingOption = document.createElement('option');
    loadingOption.textContent = 'Loading users...';
    loadingOption.disabled = true;
    dropdown.appendChild(loadingOption);
    
    // Fetch users from Firebase
    return database.ref('users').once('value')
        .then(snapshot => {
            // Remove loading option
            try {
                dropdown.removeChild(loadingOption);
            } catch (error) {
                console.warn("Could not remove loading option:", error);
            }
            
            // Check if we have users
            if (!snapshot.exists()) {
                console.log("No users found in Firebase");
                const noUsersOption = document.createElement('option');
                noUsersOption.textContent = 'No users found';
                noUsersOption.disabled = true;
                dropdown.appendChild(noUsersOption);
                return;
            }
            
            // Add each user to the dropdown
            const users = [];
            snapshot.forEach(childSnapshot => {
                const user = childSnapshot.val();
                user.id = childSnapshot.key;
                
                // Only include active users
                if (user.status !== 'inactive') {
                    users.push(user);
                }
            });
            
            console.log(`Found ${users.length} active users to add to dropdown`);
            
            // Sort users by last name then first name
            users.sort((a, b) => {
                const lastNameA = (a.lastName || '').toLowerCase();
                const lastNameB = (b.lastName || '').toLowerCase();
                const firstNameA = (a.firstName || '').toLowerCase();
                const firstNameB = (b.firstName || '').toLowerCase();
                
                if (lastNameA !== lastNameB) return lastNameA.localeCompare(lastNameB);
                return firstNameA.localeCompare(firstNameB);
            });
            
            // Add users to dropdown
            users.forEach(user => {
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = fullName || user.email || 'Unknown User';
                option.setAttribute('data-email', user.email || '');
                dropdown.appendChild(option);
            });
            
            // Trigger change event to update any dependent elements
            const event = new Event('change');
            dropdown.dispatchEvent(event);
            
            return users;
        })
        .catch(error => {
            console.error('Error loading users for dropdown:', error);
            
            // Show error in dropdown
            try {
                dropdown.removeChild(loadingOption);
            } catch (err) {
                console.warn("Could not remove loading option:", err);
            }
            
            const errorOption = document.createElement('option');
            errorOption.textContent = 'Error loading users';
            errorOption.disabled = true;
            dropdown.appendChild(errorOption);
            
            throw error;
        });
}

// Function to initialize all user dropdowns on a page
function initializeUserDropdowns() {
    console.log("Initializing user dropdowns from handler...");
    
    // Check if we're logged in first
    if (!firebase.auth().currentUser) {
        console.warn('User must be logged in to load user dropdowns');
        // Wait for auth state to change instead of returning
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // Now we can load the dropdowns
                _initializeDropdownsInternal();
            }
        });
        return;
    }
    
    // User is already logged in, initialize immediately
    _initializeDropdownsInternal();
    
    function _initializeDropdownsInternal() {
        console.log("User authenticated, initializing dropdowns");
        
        // Get all potential user dropdowns
        const dropdownSelectors = [
            // Reported By
            '#reportedByName',
            '#reportedBy',
            '[data-field="reportedBy"]',
            
            // Line Manager
            '#lineManagerDropdown',
            '#lineManager',
            '[data-field="lineManager"]'
        ];
        
        let initialized = false;
        
        // Try each selector
        for (const selector of dropdownSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`Found dropdown with selector: ${selector}`);
                const placeholder = selector.includes('lineManager') ? 'Select Line Manager' : 'Select Reporter';
                loadUsersIntoDropdown(element.id, placeholder);
                initialized = true;
            }
        }
        
        if (!initialized) {
            console.warn("No matching dropdown elements found on page");
        }
    }
}

// Initialize dropdowns when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Document ready, checking Firebase");
    // Check if Firebase is initialized
    if (typeof firebase !== 'undefined' && firebase.app()) {
        // Listen for auth state changes
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                console.log("User authenticated, initializing user dropdowns");
                // User is signed in, wait a moment to make sure the DOM is fully ready
                setTimeout(initializeUserDropdowns, 200);
            }
        });
    } else {
        console.error('Firebase is not initialized. Unable to load user dropdowns.');
        
        // Poll for Firebase to become available
        let attempts = 0;
        const checkFirebase = setInterval(() => {
            attempts++;
            if (typeof firebase !== 'undefined' && firebase.app()) {
                clearInterval(checkFirebase);
                console.log("Firebase is now available");
                
                firebase.auth().onAuthStateChanged(user => {
                    if (user) {
                        console.log("User authenticated, initializing user dropdowns");
                        initializeUserDropdowns();
                    }
                });
            } else if (attempts > 10) {
                clearInterval(checkFirebase);
                console.error("Gave up waiting for Firebase to initialize");
            }
        }, 500);
    }
});

// Export functions for direct calling from other scripts
window.loadUsersIntoDropdown = loadUsersIntoDropdown;
window.initializeUserDropdowns = initializeUserDropdowns;

// Log that the script has loaded
console.log("User dropdown handler script loaded and ready");
