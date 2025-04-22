document.addEventListener('DOMContentLoaded', function() {
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyCUTmTn0rRBb0M-UkQJxnUMrWqXYU_BgIc",
        authDomain: "users-8be65.firebaseapp.com",
        databaseURL: "https://users-8be65-default-rtdb.firebaseio.com",
        projectId: "users-8be65",
        storageBucket: "users-8be65.firebasestorage.app",
        messagingSenderId: "829083030831",
        appId: "1:829083030831:web:36a370e62691e560bc3dda"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();
    const auth = firebase.auth();

    // Variables to store dynamic data
    let workers = [];
    let isolationPoints = [];
    let customHazards = [];
    let customControls = [];

    // Generate permit number
    function generatePermitNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `PTW-${year}${month}-${random}`;
    }

    // Populate permit number and current date on load
    document.getElementById('permitNumber').value = generatePermitNumber();
    document.getElementById('requestDate').value = new Date().toISOString().split('T')[0]; // Set current date

    // Permit type selection
    const permitTypes = document.querySelectorAll('.permit-type-card');
    permitTypes.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selection from other cards
            permitTypes.forEach(c => c.classList.remove('selected'));
            // Add selection to clicked card
            this.classList.add('selected');
            // Update hazards and control measures based on permit type
            updateHazardsAndControls(this.dataset.type);
        });
    });

    // Hazard and control measure mappings
    const permitHazards = {
        'hot-work': [
            'Fire/Explosion',
            'Burns',
            'Toxic Fumes',
            'Eye Damage',
            'Electrical Hazards',
            'Confined Space',
            'Noise',
            'Fall from Height'
        ],
        'cold-work': [
            'Mechanical Hazards',
            'Falling Objects',
            'Noise',
            'Sharp Edges',
            'Slips/Trips',
            'Heavy Lifting',
            'Vibration'
        ],
        'electrical': [
            'Electric Shock',
            'Arc Flash/Blast',
            'Fire',
            'Burns',
            'Explosion',
            'Stored Energy',
            'Accidental Start-up'
        ],
        'confined-space': [
            'Oxygen Deficiency',
            'Toxic Atmosphere',
            'Flammable Atmosphere',
            'Engulfment',
            'Heat Stress',
            'Noise',
            'Limited Egress'
        ],
        'height': [
            'Falls',
            'Falling Objects',
            'Weather Conditions',
            'Structural Failure',
            'Overhead Hazards',
            'Equipment Failure'
        ],
        'excavation': [
            'Cave-in/Collapse',
            'Falling into Trench',
            'Striking Underground Utilities',
            'Hazardous Atmosphere',
            'Water Accumulation',
            'Adjacent Structures'
        ]
    };

    const controlMeasures = {
        'hot-work': [
            'Fire extinguisher must be readily available',
            'Area must be clear of flammable materials within 10 meters',
            'Fire watch required during and 30 minutes after work',
            'Proper PPE including face shield and flame-resistant clothing',
            'Gas detection equipment required',
            'Ventilation system operational',
            'All combustible materials covered with fire-resistant blankets',
            'Smoke/heat detectors temporarily isolated with proper authorization'
        ],
        'cold-work': [
            'Area barricaded and signed',
            'Tools and equipment inspected',
            'Proper PPE for task',
            'Emergency response plan in place',
            'First aid kit available',
            'Adequate lighting in place',
            'Proper tool storage when not in use',
            'Backup safety equipment available'
        ],
        'electrical': [
            'Lock-out/tag-out procedures in place',
            'Verification of zero energy state',
            'Insulated tools and equipment',
            'Rubber mats for electrical insulation',
            'Signage to warn others',
            'Ensure equipment is properly grounded',
            'Use voltage testing equipment before work',
            'Wear appropriate electrical-rated PPE'
        ],
        'confined-space': [
            'Atmospheric testing before and during entry',
            'Ventilation equipment in place',
            'Entry permit completed and posted',
            'Rescue equipment readily available',
            'Continuous communication system established',
            'Attendant stationed at entry point',
            'Emergency evacuation plan in place',
            'All entrants trained for confined space entry'
        ],
        'height': [
            'Fall protection equipment inspected',
            'Anchor points verified',
            'Guardrails installed where possible',
            'Safety nets deployed as needed',
            'Secure all tools to prevent drops',
            'Area below work zone cordoned off',
            'Work suspended during adverse weather',
            'Rescue plan established for fallen workers'
        ],
        'excavation': [
            'Proper shoring/sloping/benching in place',
            'Daily inspections by competent person',
            'Safe access/egress points established',
            'Underground utilities located and marked',
            'Atmospheric testing if deeper than 4 feet',
            'Surface water diverted away from excavation',
            'Spoil pile at least 2 feet from edge',
            'Protective systems inspected after rain'
        ]
    };

    function updateHazardsAndControls(permitType) {
        // Update hazards
        const hazardList = document.querySelector('.hazard-checklist');
        const hazards = permitHazards[permitType] || [];
        hazardList.innerHTML = hazards.map(hazard => `
            <div class="checklist-item">
                <input type="checkbox" id="hazard-${hazard.toLowerCase().replace(/\s+/g, '-')}" name="hazard-${hazard.toLowerCase().replace(/\s+/g, '-')}">
                <label for="hazard-${hazard.toLowerCase().replace(/\s+/g, '-')}">${hazard}</label>
            </div>
        `).join('');

        // Update control measures
        const controlList = document.querySelector('.control-measures');
        const controls = controlMeasures[permitType] || [];
        controlList.innerHTML = controls.map((control, index) => `
            <div class="control-measure-item">
                <input type="checkbox" id="control-${index}" name="control-${index}" required>
                <label for="control-${index}">${control}</label>
            </div>
        `).join('');
        
        // Show relevant sections for specific permit types
        if (permitType === 'electrical' || permitType === 'confined-space') {
            document.getElementById('energy-isolation-section').style.display = 'block';
        } else {
            document.getElementById('energy-isolation-section').style.display = 'block'; // Show for all types for now
        }
    }

    // Custom Hazards Management
    const addCustomHazardBtn = document.getElementById('add-custom-hazard-btn');
    const customHazardsContainer = document.getElementById('custom-hazards-list');
    
    if (addCustomHazardBtn) {
        addCustomHazardBtn.addEventListener('click', function() {
            const description = document.getElementById('custom-hazard-description').value.trim();
            const severity = document.getElementById('custom-hazard-severity').value;
            
            if (description && severity) {
                const hazardId = Date.now(); // Generate unique ID
                
                // Add to custom hazards array
                customHazards.push({
                    id: hazardId,
                    description,
                    severity
                });
                
                // Clear inputs
                document.getElementById('custom-hazard-description').value = '';
                document.getElementById('custom-hazard-severity').selectedIndex = 0;
                
                // Render custom hazards list
                renderCustomHazards();
            } else {
                alert('Please provide both a hazard description and severity level');
            }
        });
    }
    
    function renderCustomHazards() {
        if (customHazardsContainer) {
            customHazardsContainer.innerHTML = customHazards.map(hazard => `
                <div class="custom-hazard-item" data-id="${hazard.id}" style="display: flex; justify-content: space-between; background: #f8f9fa; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                    <div>
                        <strong>${hazard.description}</strong>
                        <span class="badge ${getSeverityBadgeClass(hazard.severity)}" style="margin-left: 10px; padding: 3px 8px; border-radius: 12px; font-size: 12px;">${formatSeverity(hazard.severity)}</span>
                    </div>
                    <button type="button" class="btn-remove-hazard" onclick="removeCustomHazard(${hazard.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    function getSeverityBadgeClass(severity) {
        switch (severity) {
            case 'low': return 'status-approved';
            case 'medium': return 'status-pending';
            case 'high': return 'status-rejected';
            default: return 'status-draft';
        }
    }
    
    function formatSeverity(severity) {
        return severity.charAt(0).toUpperCase() + severity.slice(1) + ' Risk';
    }
    
    // Make removeCustomHazard accessible from global scope
    window.removeCustomHazard = function(hazardId) {
        customHazards = customHazards.filter(hazard => hazard.id !== hazardId);
        renderCustomHazards();
    };

    // Custom Control Measures Management
    const addCustomControlBtn = document.getElementById('add-custom-control-btn');
    const customControlsContainer = document.getElementById('custom-controls-list');
    
    if (addCustomControlBtn) {
        addCustomControlBtn.addEventListener('click', function() {
            const description = document.getElementById('custom-control-description').value.trim();
            const type = document.getElementById('custom-control-type').value;
            
            if (description && type) {
                const controlId = Date.now(); // Generate unique ID
                
                // Add to custom controls array
                customControls.push({
                    id: controlId,
                    description,
                    type
                });
                
                // Clear inputs
                document.getElementById('custom-control-description').value = '';
                document.getElementById('custom-control-type').selectedIndex = 0;
                
                // Render custom controls list
                renderCustomControls();
            } else {
                alert('Please provide both a control measure description and type');
            }
        });
    }
    
    function renderCustomControls() {
        if (customControlsContainer) {
            customControlsContainer.innerHTML = customControls.map(control => `
                <div class="custom-control-item" data-id="${control.id}" style="display: flex; justify-content: space-between; background: #f8f9fa; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                    <div>
                        <strong>${control.description}</strong>
                        <span class="badge ${getControlTypeBadgeClass(control.type)}" style="margin-left: 10px; padding: 3px 8px; border-radius: 12px; font-size: 12px;">${formatControlType(control.type)}</span>
                    </div>
                    <button type="button" class="btn-remove-control" onclick="removeCustomControl(${control.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    function getControlTypeBadgeClass(type) {
        switch (type) {
            case 'elimination': return 'status-approved';
            case 'substitution': return 'status-approved';
            case 'engineering': return 'status-pending';
            case 'administrative': return 'status-pending';
            case 'ppe': return 'status-draft';
            default: return 'status-draft';
        }
    }
    
    function formatControlType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    // Make removeCustomControl accessible from global scope
    window.removeCustomControl = function(controlId) {
        customControls = customControls.filter(control => control.id !== controlId);
        renderCustomControls();
    };

    // Workers List Management
    const addWorkerBtn = document.getElementById('add-worker-btn');
    const workersListContainer = document.getElementById('workers-list');
    
    if (addWorkerBtn) {
        addWorkerBtn.addEventListener('click', function() {
            const name = document.getElementById('worker-name').value.trim();
            const position = document.getElementById('worker-position').value.trim();
            const training = document.getElementById('worker-training').value;
            
            if (name && position && training) {
                const workerId = Date.now(); // Generate unique ID
                
                // Add to workers array
                workers.push({
                    id: workerId,
                    name,
                    position,
                    training
                });
                
                // Clear inputs
                document.getElementById('worker-name').value = '';
                document.getElementById('worker-position').value = '';
                document.getElementById('worker-training').selectedIndex = 0;
                
                // Render workers list
                renderWorkers();
            } else {
                alert('Please complete all worker information fields');
            }
        });
    }
    
    function renderWorkers() {
        if (workersListContainer) {
            workersListContainer.innerHTML = workers.map(worker => `
                <div class="worker-item" data-id="${worker.id}" style="display: flex; justify-content: space-between; background: #f8f9fa; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                    <div>
                        <strong>${worker.name}</strong> - ${worker.position}
                        <span class="badge ${getTrainingBadgeClass(worker.training)}">${formatTrainingStatus(worker.training)}</span>
                    </div>
                    <button type="button" class="btn-remove-worker" onclick="removeWorker(${worker.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    function getTrainingBadgeClass(training) {
        switch (training) {
            case 'complete': return 'bg-success';
            case 'incomplete': return 'bg-warning';
            case 'not-required': return 'bg-secondary';
            default: return 'bg-secondary';
        }
    }
    
    function formatTrainingStatus(status) {
        switch (status) {
            case 'complete': return 'Training Complete';
            case 'incomplete': return 'Training Incomplete';
            case 'not-required': return 'Not Required';
            default: return status;
        }
    }
    
    // Make removeWorker accessible from global scope
    window.removeWorker = function(workerId) {
        workers = workers.filter(worker => worker.id !== workerId);
        renderWorkers();
    };

    // Energy Isolation Points Management
    const addIsolationBtn = document.getElementById('add-isolation-btn');
    const isolationPointsContainer = document.getElementById('isolation-points-list');
    
    if (addIsolationBtn) {
        addIsolationBtn.addEventListener('click', function() {
            const type = document.getElementById('isolation-type').value;
            const location = document.getElementById('isolation-location').value.trim();
            const method = document.getElementById('isolation-method').value;
            
            if (type && location && method) {
                const isolationId = Date.now(); // Generate unique ID
                
                // Add to isolation points array
                isolationPoints.push({
                    id: isolationId,
                    type,
                    location,
                    method
                });
                
                // Clear inputs
                document.getElementById('isolation-type').selectedIndex = 0;
                document.getElementById('isolation-location').value = '';
                document.getElementById('isolation-method').selectedIndex = 0;
                
                // Render isolation points list
                renderIsolationPoints();
            } else {
                alert('Please complete all isolation point fields');
            }
        });
    }
    
    function renderIsolationPoints() {
        if (isolationPointsContainer) {
            isolationPointsContainer.innerHTML = isolationPoints.map(point => `
                <div class="isolation-point-item" data-id="${point.id}" style="display: flex; justify-content: space-between; background: #f8f9fa; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                    <div>
                        <strong>${formatIsolationType(point.type)}</strong> - ${point.location}
                        <span class="badge bg-info">${formatIsolationMethod(point.method)}</span>
                    </div>
                    <button type="button" class="btn-remove-isolation" onclick="removeIsolationPoint(${point.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    function formatIsolationType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1) + ' Energy';
    }
    
    function formatIsolationMethod(method) {
        return method.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('/');
    }
    
    // Make removeIsolationPoint accessible from global scope
    window.removeIsolationPoint = function(pointId) {
        isolationPoints = isolationPoints.filter(point => point.id !== pointId);
        renderIsolationPoints();
    };

    // Risk calculation
    function calculateRiskScore(likelihood, severity) {
        return likelihood * severity;
    }
    
    // Initial risk assessment
    const initialLikelihood = document.getElementById('initial-likelihood');
    const initialSeverity = document.getElementById('initial-severity');
    const initialRiskScore = document.getElementById('initial-risk-score');
    
    if (initialLikelihood && initialSeverity && initialRiskScore) {
        initialLikelihood.addEventListener('change', updateInitialRiskScore);
        initialSeverity.addEventListener('change', updateInitialRiskScore);
        
        function updateInitialRiskScore() {
            const likelihood = parseInt(initialLikelihood.value) || 0;
            const severity = parseInt(initialSeverity.value) || 0;
            
            if (likelihood && severity) {
                const score = calculateRiskScore(likelihood, severity);
                initialRiskScore.value = score;
                
                // Set background color based on risk score
                if (score >= 15) {
                    initialRiskScore.style.backgroundColor = '#f8d7da'; // High risk (red)
                } else if (score >= 8) {
                    initialRiskScore.style.backgroundColor = '#fff3cd'; // Medium risk (yellow)
                } else {
                    initialRiskScore.style.backgroundColor = '#d1e7dd'; // Low risk (green)
                }
            } else {
                initialRiskScore.value = '';
                initialRiskScore.style.backgroundColor = '';
            }
        }
    }
    
    // Residual risk assessment
    const residualLikelihood = document.getElementById('residual-likelihood');
    const residualSeverity = document.getElementById('residual-severity');
    const residualRiskScore = document.getElementById('residual-risk-score');
    
    if (residualLikelihood && residualSeverity && residualRiskScore) {
        residualLikelihood.addEventListener('change', updateResidualRiskScore);
        residualSeverity.addEventListener('change', updateResidualRiskScore);
        
        function updateResidualRiskScore() {
            const likelihood = parseInt(residualLikelihood.value) || 0;
            const severity = parseInt(residualSeverity.value) || 0;
            
            if (likelihood && severity) {
                const score = calculateRiskScore(likelihood, severity);
                residualRiskScore.value = score;
                
                // Set background color based on risk score
                if (score >= 15) {
                    residualRiskScore.style.backgroundColor = '#f8d7da'; // High risk (red)
                } else if (score >= 8) {
                    residualRiskScore.style.backgroundColor = '#fff3cd'; // Medium risk (yellow)
                } else {
                    residualRiskScore.style.backgroundColor = '#d1e7dd'; // Low risk (green)
                }
            } else {
                residualRiskScore.value = '';
                residualRiskScore.style.backgroundColor = '';
            }
        }
    }

    // Form submission
    document.getElementById('ptwForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const selectedPermitType = document.querySelector('.permit-type-card.selected');
        if (!selectedPermitType) {
            alert('Please select a permit type');
            return;
        }

        // Collect hazards data
        const selectedHazards = {};
        document.querySelectorAll('.hazard-checklist input[type="checkbox"]').forEach(checkbox => {
            selectedHazards[checkbox.id] = checkbox.checked;
        });
        
        // Collect control measures data
        const selectedControls = {};
        document.querySelectorAll('.control-measures input[type="checkbox"]').forEach(checkbox => {
            selectedControls[checkbox.id] = checkbox.checked;
        });
        
        // Collect PPE data
        const selectedPPE = {};
        document.querySelectorAll('.ppe-grid input[type="checkbox"]').forEach(checkbox => {
            selectedPPE[checkbox.id] = checkbox.checked;
        });
        
        // Collect emergency equipment data
        const emergencyEquipment = {};
        document.querySelectorAll('input[name^="emerg-"]').forEach(checkbox => {
            emergencyEquipment[checkbox.id] = checkbox.checked;
        });

        const permitData = {
            // Basic Information
            permitNumber: document.getElementById('permitNumber').value,
            requestDate: document.getElementById('requestDate').value,
            validFrom: document.getElementById('validFrom').value,
            validTo: document.getElementById('validTo').value,
            
            // Permit Type
            permitType: selectedPermitType.dataset.type,
            
            // Work Details
            location: document.getElementById('location').value,
            description: document.getElementById('description').value,
            contractor: document.getElementById('contractor').value,
            supervisorName: document.getElementById('supervisorName').value,
            
            // PIC Information
            picName: document.getElementById('picName').value,
            picPosition: document.getElementById('picPosition').value,
            picPhone: document.getElementById('picPhone').value,
            picEmail: document.getElementById('picEmail').value,
            
            // Workers
            workers: workers,
            
            // Hazard Identification & Risk Assessment
            hazards: selectedHazards,
            customHazards: customHazards,
            additionalHazards: document.getElementById('additional-hazards').value,
            initialRisk: {
                likelihood: parseInt(document.getElementById('initial-likelihood').value) || 0,
                severity: parseInt(document.getElementById('initial-severity').value) || 0,
                score: parseInt(document.getElementById('initial-risk-score').value) || 0
            },
            
            // PPE
            ppe: selectedPPE,
            additionalPPE: document.getElementById('additional-ppe').value,
            
            // Control Measures
            controls: selectedControls,
            customControls: customControls,
            additionalControls: document.getElementById('additional-controls').value,
            residualRisk: {
                likelihood: parseInt(document.getElementById('residual-likelihood').value) || 0,
                severity: parseInt(document.getElementById('residual-severity').value) || 0,
                score: parseInt(document.getElementById('residual-risk-score').value) || 0
            },
            
            // Energy Isolation
            isolationPoints: isolationPoints,
            isolationVerification: document.getElementById('isolation-verification').checked,
            
            // Emergency Response
            emergencyContacts: document.getElementById('emergency-contacts').value,
            emergencyProcedures: document.getElementById('emergency-procedures').value,
            emergencyEquipment: emergencyEquipment,
            nearestHospital: document.getElementById('nearest-hospital').value,
            emergencyPlanVerification: document.getElementById('emergency-plan-verification').checked,
            
            // Metadata
            status: 'pending',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: auth.currentUser.uid,
            lastModified: firebase.database.ServerValue.TIMESTAMP
        };

        // Save to Firebase
        const newPermitRef = database.ref('permits').push();
        newPermitRef.set(permitData)
            .then(() => {
                alert('Permit request submitted successfully');
                window.location.href = 'permitboard.html'; // Redirect to permit board
            })
            .catch(error => {
                console.error('Error submitting permit:', error);
                alert('Error submitting permit. Please try again.');
            });
    });
    
    // Save as draft
    document.querySelector('.btn-secondary').addEventListener('click', function() {
        const selectedPermitType = document.querySelector('.permit-type-card.selected');
        
        const draftData = {
            permitNumber: document.getElementById('permitNumber').value,
            requestDate: document.getElementById('requestDate').value,
            validFrom: document.getElementById('validFrom').value || '',
            validTo: document.getElementById('validTo').value || '',
            permitType: selectedPermitType ? selectedPermitType.dataset.type : '',
            location: document.getElementById('location').value || '',
            description: document.getElementById('description').value || '',
            contractor: document.getElementById('contractor').value || '',
            supervisorName: document.getElementById('supervisorName').value || '',
            picName: document.getElementById('picName').value || '',
            workers: workers,
            customHazards: customHazards,
            customControls: customControls,
            isolationPoints: isolationPoints,
            status: 'draft',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: auth.currentUser.uid,
            lastModified: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Save to Firebase
        const newDraftRef = database.ref('permits').push();
        newDraftRef.set(draftData)
            .then(() => {
                alert('Permit saved as draft');
                window.location.href = 'permitboard.html'; // Redirect to permit board
            })
            .catch(error => {
                console.error('Error saving draft:', error);
                alert('Error saving draft. Please try again.');
            });
    });

    // Check authentication
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            // Populate requestor name field if user is logged in
            document.getElementById('requestorName').textContent = user.displayName || user.email;
            document.getElementById('requestorDate').textContent = new Date().toLocaleDateString();
        }
    });
});
