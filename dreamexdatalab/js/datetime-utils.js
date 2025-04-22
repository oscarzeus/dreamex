/**
 * Date and Time Formatting Utilities
 */

// Check if moment.js is loaded, if not, dynamically load it
if (typeof moment === 'undefined') {
    console.warn('Moment.js not loaded. Some datetime functions may not work properly.');
}

/**
 * Retrieve user's datetime format preferences from Firebase
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Promise resolving to format preferences
 */
function getUserDateTimePreferences(userId) {
    return new Promise((resolve, reject) => {
        if (!firebase || !firebase.database) {
            reject(new Error('Firebase is not initialized'));
            return;
        }

        firebase.database().ref(`userPreferences/${userId}/datetimeFormat`).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    // Get full format string (e.g. "DD/MM/YYYY HH:mm")
                    const format = snapshot.val();
                    
                    // Split into date and time components
                    const parts = format.split(' ');
                    const dateFormat = parts[0];
                    const timeFormat = parts.slice(1).join(' ');
                    
                    // Save to localStorage for future quick access
                    localStorage.setItem(`userDatetimeFormat_${userId}`, format);
                    
                    resolve({
                        fullFormat: format,
                        dateFormat: dateFormat,
                        timeFormat: timeFormat
                    });
                } else {
                    // Default formats if no preference is found
                    const defaults = {
                        fullFormat: 'MM/DD/YYYY hh:mm A',
                        dateFormat: 'MM/DD/YYYY',
                        timeFormat: 'hh:mm A'
                    };
                    resolve(defaults);
                }
            })
            .catch(error => {
                console.error('Error fetching user datetime preferences:', error);
                reject(error);
            });
    });
}

/**
 * Save user's datetime format preferences to Firebase
 * @param {string} userId - The user ID
 * @param {string} dateFormat - The date format
 * @param {string} timeFormat - The time format
 * @returns {Promise} - Promise that resolves when preferences are saved
 */
function saveUserDateTimePreferences(userId, dateFormat, timeFormat) {
    return new Promise((resolve, reject) => {
        if (!firebase || !firebase.database) {
            reject(new Error('Firebase is not initialized'));
            return;
        }

        const fullFormat = `${dateFormat} ${timeFormat}`;
        
        // Save to localStorage for immediate use
        localStorage.setItem(`userDatetimeFormat_${userId}`, fullFormat);
        
        // Create updates for userPreferences path
        const updates = {};
        updates[`userPreferences/${userId}/datetimeFormat`] = fullFormat;
        
        // Save to Firebase using a multi-path update
        firebase.database().ref().update(updates)
        .then(() => {
            console.log('User datetime preferences saved successfully');
            
            // Trigger an event to notify components
            const event = new CustomEvent('datetimePreferencesChanged', {
                detail: { userId, dateFormat, timeFormat, fullFormat }
            });
            document.dispatchEvent(event);
            
            resolve();
        })
        .catch(error => {
            console.error('Error saving user datetime preferences:', error);
            reject(error);
        });
    });
}

/**
 * Format a date according to user preferences
 * @param {Date|string} date - Date to format
 * @param {string} userId - User ID to get preferences for
 * @returns {string} - Formatted date string
 */
function formatDate(date, userId) {
    if (!date) return '';
    
    // Try to get format from localStorage first (for performance)
    const cachedFormat = userId ? localStorage.getItem(`userDatetimeFormat_${userId}`) : null;
    
    if (cachedFormat) {
        // Extract just the date part
        const dateFormat = cachedFormat.split(' ')[0];
        return moment(date).format(dateFormat);
    }
    
    // If no cached format, use default
    return moment(date).format('MM/DD/YYYY');
}

/**
 * Format a time according to user preferences
 * @param {Date|string} date - Date to format
 * @param {string} userId - User ID to get preferences for
 * @returns {string} - Formatted time string
 */
function formatTime(date, userId) {
    if (!date) return '';
    
    // Try to get format from localStorage first
    const cachedFormat = userId ? localStorage.getItem(`userDatetimeFormat_${userId}`) : null;
    
    if (cachedFormat) {
        // Extract just the time part
        const parts = cachedFormat.split(' ');
        if (parts.length > 1) {
            const timeFormat = parts.slice(1).join(' ');
            return moment(date).format(timeFormat);
        }
    }
    
    // If no cached format, use default
    return moment(date).format('hh:mm A');
}

/**
 * Format a complete date and time according to user preferences
 * @param {Date|string} date - Date to format
 * @param {string} userId - User ID to get preferences for
 * @returns {string} - Formatted date and time string
 */
function formatDateTime(date, userId) {
    if (!date) return '';
    
    // Try to get format from localStorage first
    const cachedFormat = userId ? localStorage.getItem(`userDatetimeFormat_${userId}`) : null;
    
    if (cachedFormat) {
        return moment(date).format(cachedFormat);
    }
    
    // If no cached format, use default
    return moment(date).format('MM/DD/YYYY hh:mm A');
}

/**
 * Format a date for HTML date inputs (always YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} - Date formatted as YYYY-MM-DD
 */
function formatDateForInput(date) {
    if (!date) return '';
    
    // Ensure we have a Date object
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Format as YYYY-MM-DD for HTML date inputs
    return d.toISOString().split('T')[0];
}

/**
 * Apply user date format to form input fields
 * @param {string} userId - User ID to get preferences for
 * @param {Array|NodeList|string} inputSelectors - Input elements or selectors to update
 */
function applyUserDateFormatToInputs(userId, inputSelectors) {
    // Ensure moment.js is available
    if (typeof moment === 'undefined') {
        console.error('Moment.js is required for date formatting');
        return;
    }
    
    // Get current date
    const today = new Date();
    
    // Get user format from Firebase
    firebase.database().ref(`userPreferences/${userId}/datetimeFormat`).once('value')
        .then(snapshot => {
            // Get just the date part of the format
            const format = snapshot.exists() ? snapshot.val().split(' ')[0] : 'MM/DD/YYYY';
            
            // Format today's date according to user preference
            const formattedDate = moment(today).format(format);
            
            // Apply to specified inputs
            const inputs = typeof inputSelectors === 'string' 
                ? document.querySelectorAll(inputSelectors) 
                : inputSelectors;
            
            if (inputs) {
                // Handle both arrays/NodeLists and single elements
                if (inputs.forEach) {
                    inputs.forEach(input => {
                        if (input.tagName === 'INPUT') {
                            input.value = formattedDate;
                        }
                    });
                } else if (inputs.tagName === 'INPUT') {
                    inputs.value = formattedDate;
                }
            }
        })
        .catch(error => {
            console.error('Error applying user date format:', error);
        });
}

/**
 * Update all datetime elements on a page according to user preferences
 * @param {string} userId - User ID to get preferences for
 */
function updateAllDateTimeElements(userId) {
    if (typeof moment === 'undefined') {
        console.error('Moment.js is required for datetime formatting');
        return;
    }
    
    const cachedFormat = userId ? localStorage.getItem(`userDatetimeFormat_${userId}`) : null;
    
    // If not in localStorage, fetch from Firebase
    if (!cachedFormat) {
        firebase.database().ref(`userPreferences/${userId}/datetimeFormat`).once('value')
            .then(snapshot => {
                const format = snapshot.exists() ? snapshot.val() : 'MM/DD/YYYY hh:mm A';
                
                // Cache for future use
                localStorage.setItem(`userDatetimeFormat_${userId}`, format);
                
                // Update elements with this format
                updateElementsWithFormat(format);
            })
            .catch(error => {
                console.error('Error fetching user datetime format:', error);
                updateElementsWithFormat('MM/DD/YYYY hh:mm A'); // Use default on error
            });
    } else {
        // Use cached format
        updateElementsWithFormat(cachedFormat);
    }
    
    // Helper function to update elements with a specific format
    function updateElementsWithFormat(format) {
        // Split format into date and time parts
        const datePart = format.split(' ')[0];
        const timePart = format.split(' ').slice(1).join(' ');
        
        // Find all elements with data-time attribute
        document.querySelectorAll('[data-time]').forEach(element => {
            const timestamp = element.getAttribute('data-time');
            if (timestamp) {
                element.textContent = moment(timestamp).format(format);
            }
        });
        
        // Update elements with specific classes
        document.querySelectorAll('.formatted-date').forEach(element => {
            const timestamp = element.getAttribute('data-time');
            if (timestamp) {
                element.textContent = moment(timestamp).format(datePart);
            }
        });
        
        document.querySelectorAll('.formatted-time').forEach(element => {
            const timestamp = element.getAttribute('data-time');
            if (timestamp) {
                element.textContent = moment(timestamp).format(timePart);
            }
        });
        
        document.querySelectorAll('.formatted-datetime').forEach(element => {
            const timestamp = element.getAttribute('data-time');
            if (timestamp) {
                element.textContent = moment(timestamp).format(format);
            }
        });
    }
}

// Make functions available globally
window.DateTimeUtils = {
    getUserDateTimePreferences,
    saveUserDateTimePreferences,
    formatDate,
    formatTime,
    formatDateTime,
    updateAllDateTimeElements,
    applyUserDateFormatToInputs,
    formatDateForInput
};
