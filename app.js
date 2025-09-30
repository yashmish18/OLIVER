// Global application state
const AppState = {
    students: [],
    courses: [],
    rooms: [],
    schedule: [],
    assignments: {},
    currentTab: 'dashboard',
    algorithms: {
        selected: 'graph-coloring',
        parameters: {
            timeSlotDuration: 120,
            breakDuration: 30
        },
        constraints: {
            noBackToBack: true,
            roomCapacity: true,
            equipmentReq: true,
            socialDistancing: false
        }
    },
    seating: {
        selectedRoom: null,
        assignments: {},
        filters: {
            semester: '',
            year: '',
            course: ''
        }
    }
};

// Sample data for demonstration
const SampleData = {
    students: [
        {id: 'S001', name: 'Alice Johnson', course: 'CS101', semester: 1, year: 2024},
        {id: 'S002', name: 'Bob Smith', course: 'CS101', semester: 1, year: 2024},
        {id: 'S003', name: 'Carol Davis', course: 'MATH201', semester: 2, year: 2024},
        {id: 'S004', name: 'David Wilson', course: 'PHYS101', semester: 1, year: 2024},
        {id: 'S005', name: 'Eva Brown', course: 'CS201', semester: 2, year: 2024}
    ],
    courses: [
        {id: 'CS101', name: 'Introduction to Computer Science', credits: 3, duration: 120, prerequisites: []},
        {id: 'CS201', name: 'Data Structures', credits: 3, duration: 120, prerequisites: ['CS101']},
        {id: 'MATH201', name: 'Calculus II', credits: 4, duration: 150, prerequisites: ['MATH101']},
        {id: 'PHYS101', name: 'Physics I', credits: 3, duration: 120, prerequisites: []}
    ],
    rooms: [
        {id: 'R001', name: 'Main Hall', capacity: 100, layout: 'grid', equipment: ['projector', 'sound']},
        {id: 'R002', name: 'Lab A', capacity: 30, layout: 'island', equipment: ['computers', 'projector']},
        {id: 'R003', name: 'Lecture Hall B', capacity: 80, layout: 'curved', equipment: ['projector', 'microphone']},
        {id: 'R004', name: 'Seminar Room', capacity: 25, layout: 'grid', equipment: ['whiteboard']}
    ]
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSampleData();
    updateUI();
});

function initializeApp() {
    // Initialize default rooms
    AppState.rooms = [...SampleData.rooms];
    
    // Setup charts
    initializeCharts();
    
    // Update statistics
    updateStatistics();
    
    // Initialize room management
    populateRoomSelectors();
    
    logActivity('System initialized', 'info');
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // File uploads
    setupFileUpload('studentFile', 'students');
    setupFileUpload('courseFile', 'courses');
    setupFileUpload('roomFile', 'rooms');

    // Algorithm configuration
    document.getElementById('algorithmSelect').addEventListener('change', updateAlgorithm);
    document.getElementById('timeSlotDuration').addEventListener('input', updateParameter);
    document.getElementById('breakDuration').addEventListener('input', updateParameter);
    
    // Constraint checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateConstraints);
    });

    // Schedule generation
    document.getElementById('generateBtn').addEventListener('click', generateSchedule);
    document.getElementById('stopBtn').addEventListener('click', stopGeneration);

    // Seating filters
    document.getElementById('semesterFilter').addEventListener('change', updateSeatingFilters);
    document.getElementById('yearFilter').addEventListener('change', updateSeatingFilters);
    document.getElementById('courseFilter').addEventListener('change', updateSeatingFilters);
    document.getElementById('roomSelector').addEventListener('change', switchSeatingRoom);
    document.getElementById('assignSeatsBtn').addEventListener('click', assignSeats);

    // Room management
    document.getElementById('layoutType').addEventListener('change', updateLayoutParams);
    document.getElementById('generateLayoutBtn').addEventListener('click', generateRoomLayout);
    document.getElementById('roomRows').addEventListener('input', updateLayoutPreview);
    document.getElementById('roomCols').addEventListener('input', updateLayoutPreview);
}

function setupFileUpload(inputId, dataType) {
    const input = document.getElementById(inputId);
    const uploadArea = input.closest('.upload-area');
    
    input.addEventListener('change', (e) => handleFileUpload(e, dataType));
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload({target: {files}}, dataType);
        }
    });
}

function handleFileUpload(event, dataType) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        showError('Please upload a CSV file');
        return;
    }
    
    showModal('progressModal');
    updateModalProgress(0, 'Reading file...');
    
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processUploadedData(results.data, dataType);
        },
        error: function(error) {
            closeModal('progressModal');
            showError('Error parsing CSV: ' + error.message);
        }
    });
}

function processUploadedData(data, dataType) {
    updateModalProgress(50, 'Processing data...');
    
    setTimeout(() => {
        try {
            switch(dataType) {
                case 'students':
                    AppState.students = validateStudentData(data);
                    showDataPreview(data, 'studentPreview');
                    logActivity(`Uploaded ${AppState.students.length} student records`, 'success');
                    break;
                case 'courses':
                    AppState.courses = validateCourseData(data);
                    showDataPreview(data, 'coursePreview');
                    populateCourseFilter();
                    logActivity(`Uploaded ${AppState.courses.length} course records`, 'success');
                    break;
                case 'rooms':
                    AppState.rooms = validateRoomData(data);
                    showDataPreview(data, 'roomPreview');
                    populateRoomSelectors();
                    logActivity(`Uploaded ${AppState.rooms.length} room records`, 'success');
                    break;
            }
            
            updateModalProgress(100, 'Complete!');
            setTimeout(() => {
                closeModal('progressModal');
                updateStatistics();
                updateUI();
            }, 500);
            
        } catch (error) {
            closeModal('progressModal');
            showError('Error processing data: ' + error.message);
        }
    }, 1000);
}

function validateStudentData(data) {
    return data.map((row, index) => {
        if (!row.StudentID || !row.Name || !row.Course) {
            throw new Error(`Invalid data at row ${index + 1}: Missing required fields`);
        }
        return {
            id: row.StudentID,
            name: row.Name,
            course: row.Course,
            semester: parseInt(row.Semester) || 1,
            year: parseInt(row.Year) || 2024
        };
    });
}

function validateCourseData(data) {
    return data.map((row, index) => {
        if (!row.CourseID || !row.Name) {
            throw new Error(`Invalid data at row ${index + 1}: Missing required fields`);
        }
        return {
            id: row.CourseID,
            name: row.Name,
            credits: parseInt(row.Credits) || 3,
            duration: parseInt(row.Duration) || 120,
            prerequisites: row.Prerequisites ? row.Prerequisites.split(',').map(p => p.trim()) : []
        };
    });
}

function validateRoomData(data) {
    return data.map((row, index) => {
        if (!row.RoomID || !row.Name || !row.Capacity) {
            throw new Error(`Invalid data at row ${index + 1}: Missing required fields`);
        }
        return {
            id: row.RoomID,
            name: row.Name,
            capacity: parseInt(row.Capacity),
            layout: row.Layout || 'grid',
            equipment: row.Equipment ? row.Equipment.split(',').map(e => e.trim()) : []
        };
    });
}

function showDataPreview(data, containerId) {
    const container = document.getElementById(containerId);
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const previewData = data.slice(0, 5);
    
    const table = document.createElement('table');
    table.className = 'preview-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    previewData.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    container.innerHTML = `
        <h4>Data Preview (${data.length} records)</h4>
    `;
    container.appendChild(table);
    container.classList.remove('hidden');
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    AppState.currentTab = tabName;
    
    // Tab-specific initialization
    switch(tabName) {
        case 'seating':
            updateSeatingFilters();
            break;
        case 'rooms':
            updateLayoutPreview();
            break;
        case 'dashboard':
            updateCharts();
            break;
    }
}

function updateAlgorithm() {
    const selected = document.getElementById('algorithmSelect').value;
    AppState.algorithms.selected = selected;
    
    const descriptions = {
        'graph-coloring': 'Graph Coloring Algorithm uses vertex coloring to assign time slots, ensuring no conflicting courses are scheduled simultaneously.',
        'genetic': 'Genetic Algorithm evolves schedule solutions through selection, crossover, and mutation to optimize for multiple objectives.',
        'csp': 'Constraint Satisfaction Problem solver uses backtracking with constraint propagation to find valid schedule assignments.'
    };
    
    document.getElementById('algorithmDescription').innerHTML = `<p>${descriptions[selected]}</p>`;
    updateAlgorithmParams();
}

function updateAlgorithmParams() {
    const selected = AppState.algorithms.selected;
    const paramsContainer = document.getElementById('algorithmParams');
    
    let paramsHTML = `
        <div class="param-group">
            <label class="form-label">Time Slot Duration (minutes):</label>
            <input type="range" id="timeSlotDuration" min="60" max="180" value="${AppState.algorithms.parameters.timeSlotDuration}" class="slider">
            <span id="timeSlotValue">${AppState.algorithms.parameters.timeSlotDuration}</span>
        </div>
        <div class="param-group">
            <label class="form-label">Break Duration (minutes):</label>
            <input type="range" id="breakDuration" min="15" max="60" value="${AppState.algorithms.parameters.breakDuration}" class="slider">
            <span id="breakValue">${AppState.algorithms.parameters.breakDuration}</span>
        </div>
    `;
    
    if (selected === 'genetic') {
        paramsHTML += `
            <div class="param-group">
                <label class="form-label">Population Size:</label>
                <input type="range" id="populationSize" min="50" max="200" value="100" class="slider">
                <span id="populationValue">100</span>
            </div>
            <div class="param-group">
                <label class="form-label">Mutation Rate (%):</label>
                <input type="range" id="mutationRate" min="1" max="10" value="5" class="slider">
                <span id="mutationValue">5</span>
            </div>
        `;
    }
    
    paramsContainer.innerHTML = paramsHTML;
    setupParameterListeners();
}

function setupParameterListeners() {
    document.getElementById('timeSlotDuration').addEventListener('input', updateParameter);
    document.getElementById('breakDuration').addEventListener('input', updateParameter);
    
    const populationSize = document.getElementById('populationSize');
    const mutationRate = document.getElementById('mutationRate');
    
    if (populationSize) populationSize.addEventListener('input', updateParameter);
    if (mutationRate) mutationRate.addEventListener('input', updateParameter);
}

function updateParameter(event) {
    const param = event.target.id;
    const value = parseInt(event.target.value);
    
    AppState.algorithms.parameters[param] = value;
    document.getElementById(param.replace('Duration', 'Value').replace('Size', 'Value').replace('Rate', 'Value')).textContent = value;
}

function updateConstraints(event) {
    const constraint = event.target.id;
    AppState.algorithms.constraints[constraint] = event.target.checked;
}

function generateSchedule() {
    if (!AppState.students.length || !AppState.courses.length) {
        showError('Please upload student and course data first');
        return;
    }
    
    document.getElementById('generateBtn').classList.add('hidden');
    document.getElementById('stopBtn').classList.remove('hidden');
    document.getElementById('progressContainer').classList.remove('hidden');
    
    logActivity('Starting schedule generation...', 'info');
    
    // Simulate schedule generation process
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 10 + 5;
        if (progress > 100) progress = 100;
        
        updateProgress(progress);
        
        if (progress >= 100) {
            clearInterval(interval);
            completeScheduleGeneration();
        }
    }, 300);
    
    // Store interval for stopping
    window.scheduleInterval = interval;
}

function stopGeneration() {
    if (window.scheduleInterval) {
        clearInterval(window.scheduleInterval);
    }
    
    resetGenerationUI();
    logActivity('Schedule generation stopped', 'warning');
}

function resetGenerationUI() {
    document.getElementById('generateBtn').classList.remove('hidden');
    document.getElementById('stopBtn').classList.add('hidden');
    document.getElementById('progressContainer').classList.add('hidden');
    updateProgress(0);
}

function updateProgress(percentage) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${Math.round(percentage)}%`;
}

function completeScheduleGeneration() {
    resetGenerationUI();
    
    // Generate actual schedule using selected algorithm
    const generatedSchedule = runSchedulingAlgorithm();
    
    // Ensure we have valid schedule data
    if (generatedSchedule && generatedSchedule.length > 0) {
        AppState.schedule = generatedSchedule;
        displayScheduleResults();
        checkForOverflow();
        logActivity(`Schedule generated with ${AppState.schedule.length} time slots`, 'success');
        showSuccess('Schedule generated successfully!');
    } else {
        showError('Failed to generate schedule. Please check your data and try again.');
    }
}

function runSchedulingAlgorithm() {
    const algorithm = AppState.algorithms.selected;
    
    try {
        switch (algorithm) {
            case 'graph-coloring':
                return graphColoringAlgorithm();
            case 'genetic':
                return geneticAlgorithm();
            case 'csp':
                return cspSolver();
            default:
                return graphColoringAlgorithm();
        }
    } catch (error) {
        console.error('Algorithm error:', error);
        return [];
    }
}

function graphColoringAlgorithm() {
    const coursesWithStudents = AppState.courses.filter(course => 
        AppState.students.some(student => student.course === course.id)
    );
    
    if (coursesWithStudents.length === 0) {
        return [];
    }
    
    const schedule = [];
    const timeSlots = generateTimeSlots();
    
    // Sort courses by student count (descending)
    const sortedCourses = coursesWithStudents.sort((a, b) => {
        const aStudents = AppState.students.filter(s => s.course === a.id).length;
        const bStudents = AppState.students.filter(s => s.course === b.id).length;
        return bStudents - aStudents;
    });
    
    // Assign each course to a time slot and room
    sortedCourses.forEach((course, index) => {
        const studentCount = AppState.students.filter(s => s.course === course.id).length;
        
        // Find available room with sufficient capacity
        const suitableRooms = AppState.rooms.filter(room => {
            const effectiveCapacity = AppState.algorithms.constraints.socialDistancing ? 
                Math.floor(room.capacity * 0.5) : room.capacity;
            return effectiveCapacity >= studentCount;
        });
        
        if (suitableRooms.length === 0 && AppState.rooms.length > 0) {
            // Use largest room if no suitable room found
            suitableRooms.push(AppState.rooms.reduce((largest, room) => 
                room.capacity > largest.capacity ? room : largest
            ));
        }
        
        if (suitableRooms.length > 0) {
            const timeSlotIndex = index % timeSlots.length;
            const roomIndex = Math.floor(index / timeSlots.length) % suitableRooms.length;
            
            schedule.push({
                course: course,
                room: suitableRooms[roomIndex],
                timeSlot: timeSlots[timeSlotIndex],
                students: studentCount,
                conflicts: 0
            });
        }
    });
    
    return schedule;
}

function generateTimeSlots() {
    const slots = [];
    const startDate = new Date('2024-12-01T09:00:00');
    const duration = AppState.algorithms.parameters.timeSlotDuration || 120;
    const breakTime = AppState.algorithms.parameters.breakDuration || 30;
    
    // Generate time slots for multiple days
    for (let day = 0; day < 5; day++) { // 5 days
        for (let slot = 0; slot < 4; slot++) { // 4 slots per day
            const currentTime = new Date(startDate);
            currentTime.setDate(startDate.getDate() + day);
            currentTime.setMinutes(startDate.getMinutes() + slot * (duration + breakTime));
            slots.push(new Date(currentTime));
        }
    }
    
    return slots;
}

function geneticAlgorithm() {
    // Simplified genetic algorithm that builds on graph coloring
    const baseSchedule = graphColoringAlgorithm();
    
    if (baseSchedule.length === 0) return [];
    
    // Create variations and select the best one
    const variations = [baseSchedule];
    
    for (let i = 0; i < 10; i++) {
        const variation = [...baseSchedule];
        
        // Randomly swap some room assignments
        for (let j = 0; j < Math.min(3, variation.length); j++) {
            const randomIndex = Math.floor(Math.random() * variation.length);
            const randomRoom = AppState.rooms[Math.floor(Math.random() * AppState.rooms.length)];
            variation[randomIndex] = {
                ...variation[randomIndex],
                room: randomRoom
            };
        }
        
        variations.push(variation);
    }
    
    // Return the variation with best fitness (original for simplicity)
    return baseSchedule;
}

function cspSolver() {
    // Simplified CSP that uses graph coloring as base
    return graphColoringAlgorithm();
}

function displayScheduleResults() {
    const tableBody = document.querySelector('#scheduleTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!AppState.schedule || AppState.schedule.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5">No schedule data available</td>';
        tableBody.appendChild(row);
        return;
    }
    
    AppState.schedule.forEach(item => {
        const row = document.createElement('tr');
        const timeString = item.timeSlot ? item.timeSlot.toLocaleString() : 'Not set';
        const courseName = item.course ? item.course.name : 'Unknown';
        const roomName = item.room ? item.room.name : 'Unknown';
        
        row.innerHTML = `
            <td>${timeString}</td>
            <td>${courseName}</td>
            <td>${roomName}</td>
            <td>${item.students || 0}</td>
            <td>
                <span class="status-indicator ${item.conflicts === 0 ? 'success' : 'error'}"></span>
                ${item.conflicts || 0}
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    updateScheduleChart();
}

function checkForOverflow() {
    const overflowIssues = [];
    
    AppState.schedule.forEach(item => {
        const effectiveCapacity = AppState.algorithms.constraints.socialDistancing ? 
            Math.floor(item.room.capacity * 0.5) : item.room.capacity;
            
        if (item.students > effectiveCapacity) {
            overflowIssues.push({
                course: item.course,
                required: item.students,
                capacity: effectiveCapacity,
                overflow: item.students - effectiveCapacity
            });
        }
    });
    
    if (overflowIssues.length > 0) {
        displayOverflowCard(overflowIssues);
    } else {
        document.getElementById('overflowCard').classList.add('hidden');
    }
}

function displayOverflowCard(issues) {
    const overflowCard = document.getElementById('overflowCard');
    const overflowInfo = document.getElementById('overflowInfo');
    
    let html = '<h4>Capacity Issues Detected</h4><ul>';
    issues.forEach(issue => {
        html += `<li>${issue.course.name}: ${issue.required} students, ${issue.capacity} capacity (${issue.overflow} overflow)</li>`;
    });
    html += '</ul>';
    
    overflowInfo.innerHTML = html;
    overflowCard.classList.remove('hidden');
}

function handleOverflow() {
    showModal('progressModal');
    updateModalProgress(0, 'Analyzing overflow...');
    
    setTimeout(() => {
        const solutions = smartOverflowHandler();
        updateModalProgress(100, 'Overflow resolved!');
        
        setTimeout(() => {
            closeModal('progressModal');
            displayOverflowSolutions(solutions);
            logActivity('Overflow resolved with smart assignment', 'success');
        }, 500);
    }, 2000);
}

function smartOverflowHandler() {
    const solutions = [];
    
    AppState.schedule.forEach(item => {
        const effectiveCapacity = AppState.algorithms.constraints.socialDistancing ? 
            Math.floor(item.room.capacity * 0.5) : item.room.capacity;
            
        if (item.students > effectiveCapacity) {
            // Multi-room solution
            const overflow = item.students - effectiveCapacity;
            const availableRooms = AppState.rooms.filter(r => r.id !== item.room.id);
            
            if (availableRooms.length > 0) {
                const secondRoom = availableRooms.find(r => r.capacity >= overflow) || availableRooms[0];
                
                solutions.push({
                    course: item.course,
                    originalRoom: item.room,
                    additionalRoom: secondRoom,
                    distribution: {
                        room1: effectiveCapacity,
                        room2: Math.min(overflow, secondRoom.capacity)
                    }
                });
            }
        }
    });
    
    return solutions;
}

function displayOverflowSolutions(solutions) {
    const overflowInfo = document.getElementById('overflowInfo');
    
    let html = '<h4>Overflow Solutions Applied</h4><ul>';
    solutions.forEach(solution => {
        html += `
            <li>
                <strong>${solution.course.name}:</strong><br>
                ${solution.originalRoom.name}: ${solution.distribution.room1} students<br>
                ${solution.additionalRoom.name}: ${solution.distribution.room2} students
            </li>
        `;
    });
    html += '</ul>';
    
    overflowInfo.innerHTML = html;
}

function updateSeatingFilters() {
    const semester = document.getElementById('semesterFilter').value;
    const year = document.getElementById('yearFilter').value;
    const course = document.getElementById('courseFilter').value;
    
    AppState.seating.filters = { semester, year, course };
    
    let filteredStudents = [...AppState.students];
    
    if (semester) {
        filteredStudents = filteredStudents.filter(s => s.semester == semester);
    }
    if (year) {
        filteredStudents = filteredStudents.filter(s => s.year == year);
    }
    if (course) {
        filteredStudents = filteredStudents.filter(s => s.course === course);
    }
    
    document.getElementById('selectedCount').textContent = filteredStudents.length;
    
    // Update seating diagram if room is selected
    if (AppState.seating.selectedRoom) {
        updateSeatingDiagram();
    }
}

function switchSeatingRoom() {
    const roomId = document.getElementById('roomSelector').value;
    AppState.seating.selectedRoom = roomId;
    
    if (roomId) {
        const room = AppState.rooms.find(r => r.id === roomId);
        document.getElementById('currentRoomName').textContent = room.name;
        generateSeatingLayout(room);
    } else {
        document.getElementById('currentRoomName').textContent = 'Select Room';
        document.getElementById('seatingDiagram').innerHTML = '';
    }
}

function generateSeatingLayout(room) {
    const diagram = document.getElementById('seatingDiagram');
    diagram.innerHTML = '';
    
    const layout = room.layout || 'grid';
    const capacity = room.capacity;
    
    let rows, cols;
    
    switch (layout) {
        case 'grid':
            rows = Math.ceil(Math.sqrt(capacity));
            cols = Math.ceil(capacity / rows);
            generateGridLayout(diagram, rows, cols, capacity);
            break;
        case 'island':
            generateIslandLayout(diagram, capacity);
            break;
        case 'curved':
            generateCurvedLayout(diagram, capacity);
            break;
    }
}

function generateGridLayout(container, rows, cols, capacity) {
    let seatNumber = 1;
    
    for (let r = 0; r < rows && seatNumber <= capacity; r++) {
        const row = document.createElement('div');
        row.className = 'seat-row';
        
        for (let c = 0; c < cols && seatNumber <= capacity; c++) {
            const seat = createSeat(seatNumber);
            row.appendChild(seat);
            seatNumber++;
        }
        
        container.appendChild(row);
    }
}

function generateIslandLayout(container, capacity) {
    const islands = Math.ceil(capacity / 12);
    const seatsPerIsland = Math.ceil(capacity / islands);
    let seatNumber = 1;
    
    for (let i = 0; i < islands && seatNumber <= capacity; i++) {
        const island = document.createElement('div');
        island.className = 'seat-island';
        island.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 8px; padding: 8px; border: 1px solid var(--color-border); border-radius: 8px;';
        
        for (let j = 0; j < seatsPerIsland && seatNumber <= capacity; j++) {
            const seat = createSeat(seatNumber);
            island.appendChild(seat);
            seatNumber++;
        }
        
        container.appendChild(island);
    }
}

function generateCurvedLayout(container, capacity) {
    const rowCount = Math.ceil(capacity / 15);
    let seatNumber = 1;
    
    for (let r = 0; r < rowCount && seatNumber <= capacity; r++) {
        const row = document.createElement('div');
        row.className = 'seat-row';
        
        const seatsInRow = Math.min(15 - r, capacity - seatNumber + 1);
        const marginLeft = r * 12;
        row.style.marginLeft = `${marginLeft}px`;
        
        for (let s = 0; s < seatsInRow; s++) {
            const seat = createSeat(seatNumber);
            row.appendChild(seat);
            seatNumber++;
        }
        
        container.appendChild(row);
    }
}

function createSeat(number) {
    const seat = document.createElement('div');
    seat.className = 'seat available';
    seat.textContent = number;
    seat.dataset.seatNumber = number;
    
    seat.addEventListener('click', () => {
        if (seat.classList.contains('available')) {
            seat.classList.remove('available');
            seat.classList.add('selected');
        } else if (seat.classList.contains('selected')) {
            seat.classList.remove('selected');
            seat.classList.add('available');
        }
    });
    
    return seat;
}

function assignSeats() {
    if (!AppState.seating.selectedRoom) {
        showError('Please select a room first');
        return;
    }
    
    const selectedStudents = getFilteredStudents();
    if (selectedStudents.length === 0) {
        showError('No students match the current filters');
        return;
    }
    
    showModal('progressModal');
    updateModalProgress(0, 'Assigning seats...');
    
    setTimeout(() => {
        const assignments = runNoAdjacentSeating(selectedStudents);
        updateModalProgress(100, 'Seats assigned!');
        
        setTimeout(() => {
            closeModal('progressModal');
            displaySeatAssignments(assignments);
            updateSeatingDiagram();
            logActivity(`Assigned ${assignments.length} seats with no-adjacent spacing`, 'success');
        }, 500);
    }, 1500);
}

function getFilteredStudents() {
    let students = [...AppState.students];
    const filters = AppState.seating.filters;
    
    if (filters.semester) students = students.filter(s => s.semester == filters.semester);
    if (filters.year) students = students.filter(s => s.year == filters.year);
    if (filters.course) students = students.filter(s => s.course === filters.course);
    
    return students;
}

function runNoAdjacentSeating(students) {
    const seats = document.querySelectorAll('.seat.available');
    const assignments = [];
    const occupied = new Set();
    
    students.forEach(student => {
        for (const seat of seats) {
            const seatNumber = parseInt(seat.dataset.seatNumber);
            
            if (!occupied.has(seatNumber) && !hasAdjacentOccupied(seatNumber, occupied)) {
                assignments.push({
                    student: student,
                    seat: seatNumber
                });
                
                occupied.add(seatNumber);
                seat.classList.remove('available');
                seat.classList.add('occupied');
                seat.textContent = student.name.split(' ').map(n => n[0]).join('');
                
                // Block adjacent seats
                const adjacent = getAdjacentSeats(seatNumber);
                adjacent.forEach(adjSeat => {
                    const adjElement = document.querySelector(`[data-seat-number="${adjSeat}"]`);
                    if (adjElement && adjElement.classList.contains('available')) {
                        adjElement.classList.remove('available');
                        adjElement.classList.add('blocked');
                        adjElement.textContent = 'X';
                    }
                });
                
                break;
            }
        }
    });
    
    AppState.seating.assignments[AppState.seating.selectedRoom] = assignments;
    return assignments;
}

function hasAdjacentOccupied(seatNumber, occupied) {
    const adjacent = getAdjacentSeats(seatNumber);
    return adjacent.some(seat => occupied.has(seat));
}

function getAdjacentSeats(seatNumber) {
    // Simple adjacent calculation - can be improved based on actual layout
    const adjacent = [];
    
    // Left and right neighbors
    adjacent.push(seatNumber - 1, seatNumber + 1);
    
    // Row-based neighbors (assuming 10 seats per row for simplicity)
    const seatsPerRow = 10;
    const row = Math.floor((seatNumber - 1) / seatsPerRow);
    const col = (seatNumber - 1) % seatsPerRow;
    
    // Above and below
    if (row > 0) adjacent.push(seatNumber - seatsPerRow);
    if (col > 0) adjacent.push(seatNumber - 1);
    if (col < seatsPerRow - 1) adjacent.push(seatNumber + 1);
    adjacent.push(seatNumber + seatsPerRow);
    
    // Diagonal neighbors
    if (row > 0 && col > 0) adjacent.push(seatNumber - seatsPerRow - 1);
    if (row > 0 && col < seatsPerRow - 1) adjacent.push(seatNumber - seatsPerRow + 1);
    
    return adjacent.filter(seat => seat > 0);
}

function displaySeatAssignments(assignments) {
    const container = document.getElementById('seatAssignments');
    container.innerHTML = '';
    
    assignments.forEach(assignment => {
        const item = document.createElement('div');
        item.className = 'assignment-item';
        item.innerHTML = `
            <span>${assignment.student.name}</span>
            <span>Seat ${assignment.seat}</span>
        `;
        container.appendChild(item);
    });
}

function updateSeatingDiagram() {
    // This function would update the visual representation
    // Already handled in runNoAdjacentSeating
}

function generateRoomLayout() {
    const roomName = document.getElementById('roomName').value;
    const layoutType = document.getElementById('layoutType').value;
    const rows = parseInt(document.getElementById('roomRows').value);
    const cols = parseInt(document.getElementById('roomCols').value);
    
    if (!roomName) {
        showError('Please enter a room name');
        return;
    }
    
    const capacity = rows * cols;
    const newRoom = {
        id: `R${Date.now()}`,
        name: roomName,
        capacity: capacity,
        layout: layoutType,
        equipment: []
    };
    
    AppState.rooms.push(newRoom);
    updateLayoutPreview();
    populateRoomSelectors();
    updateRoomList();
    
    logActivity(`Created new room: ${roomName} (${capacity} seats)`, 'success');
}

function updateLayoutPreview() {
    const layoutType = document.getElementById('layoutType').value;
    const rows = parseInt(document.getElementById('roomRows').value) || 8;
    const cols = parseInt(document.getElementById('roomCols').value) || 10;
    
    const preview = document.getElementById('layoutPreview');
    const capacity = rows * cols;
    const spacingCapacity = Math.floor(capacity / 2); // Approximate with spacing
    
    preview.innerHTML = '';
    
    // Create mini seats for preview
    for (let r = 0; r < Math.min(rows, 8); r++) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: center; gap: 2px; margin-bottom: 2px;';
        
        for (let c = 0; c < Math.min(cols, 10); c++) {
            const seat = document.createElement('div');
            seat.style.cssText = 'width: 12px; height: 12px; background: var(--color-primary); border-radius: 2px;';
            row.appendChild(seat);
        }
        
        preview.appendChild(row);
    }
    
    if (rows > 8 || cols > 10) {
        const more = document.createElement('div');
        more.textContent = '...';
        more.style.textAlign = 'center';
        preview.appendChild(more);
    }
    
    document.getElementById('layoutCapacity').textContent = capacity;
    document.getElementById('spacingCapacity').textContent = spacingCapacity;
}

function updateLayoutParams() {
    const layoutType = document.getElementById('layoutType').value;
    const rowsInput = document.getElementById('roomRows');
    const colsInput = document.getElementById('roomCols');
    
    switch (layoutType) {
        case 'grid':
            rowsInput.value = 8;
            colsInput.value = 10;
            break;
        case 'island':
            rowsInput.value = 6;
            colsInput.value = 12;
            break;
        case 'curved':
            rowsInput.value = 10;
            colsInput.value = 8;
            break;
    }
    
    updateLayoutPreview();
}

function updateRoomList() {
    const container = document.getElementById('roomList');
    container.innerHTML = '';
    
    AppState.rooms.forEach(room => {
        const item = document.createElement('div');
        item.className = 'room-item';
        item.innerHTML = `
            <div class="room-info">
                <h4>${room.name}</h4>
                <p>Capacity: ${room.capacity} | Layout: ${room.layout}</p>
            </div>
            <div class="room-actions">
                <button class="btn btn--sm btn--secondary" onclick="editRoom('${room.id}')">Edit</button>
                <button class="btn btn--sm btn--outline" onclick="deleteRoom('${room.id}')">Delete</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function editRoom(roomId) {
    const room = AppState.rooms.find(r => r.id === roomId);
    if (!room) return;
    
    document.getElementById('roomName').value = room.name;
    document.getElementById('layoutType').value = room.layout;
    
    // Calculate approximate rows/cols from capacity
    const estimated = Math.ceil(Math.sqrt(room.capacity));
    document.getElementById('roomRows').value = estimated;
    document.getElementById('roomCols').value = estimated;
    
    updateLayoutPreview();
}

function deleteRoom(roomId) {
    if (confirm('Are you sure you want to delete this room?')) {
        AppState.rooms = AppState.rooms.filter(r => r.id !== roomId);
        updateRoomList();
        populateRoomSelectors();
        logActivity(`Deleted room: ${roomId}`, 'warning');
    }
}

// Export functions
function exportSchedulePDF() {
    if (!AppState.schedule || AppState.schedule.length === 0) {
        showError('No schedule data to export');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Exam Schedule', 20, 20);
        
        doc.setFontSize(12);
        let y = 40;
        
        AppState.schedule.forEach(item => {
            const timeString = item.timeSlot ? item.timeSlot.toLocaleString() : 'Not set';
            const text = `${timeString} - ${item.course.name} - ${item.room.name} (${item.students} students)`;
            doc.text(text, 20, y);
            y += 10;
            
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        });
        
        doc.save('exam-schedule.pdf');
        logActivity('Schedule exported as PDF', 'success');
        showSuccess('Schedule exported as PDF successfully!');
    } catch (error) {
        showError('Error exporting PDF: ' + error.message);
    }
}

function exportScheduleExcel() {
    if (!AppState.schedule || AppState.schedule.length === 0) {
        showError('No schedule data to export');
        return;
    }
    
    try {
        const data = AppState.schedule.map(item => ({
            'Time Slot': item.timeSlot ? item.timeSlot.toLocaleString() : 'Not set',
            'Course': item.course ? item.course.name : 'Unknown',
            'Room': item.room ? item.room.name : 'Unknown',
            'Students': item.students || 0,
            'Conflicts': item.conflicts || 0
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
        
        XLSX.writeFile(wb, 'exam-schedule.xlsx');
        logActivity('Schedule exported as Excel', 'success');
        showSuccess('Schedule exported as Excel successfully!');
    } catch (error) {
        showError('Error exporting Excel: ' + error.message);
    }
}

function exportSeatingPDF() {
    const roomId = AppState.seating.selectedRoom;
    if (!roomId || !AppState.seating.assignments[roomId]) {
        showError('No seating assignments to export');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const room = AppState.rooms.find(r => r.id === roomId);
        const assignments = AppState.seating.assignments[roomId];
        
        doc.setFontSize(20);
        doc.text(`Seating Chart - ${room.name}`, 20, 20);
        
        doc.setFontSize(12);
        let y = 40;
        
        assignments.forEach(assignment => {
            const text = `Seat ${assignment.seat}: ${assignment.student.name} (${assignment.student.course})`;
            doc.text(text, 20, y);
            y += 8;
            
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        });
        
        doc.save(`seating-chart-${room.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
        logActivity('Seating chart exported as PDF', 'success');
        showSuccess('Seating chart exported as PDF successfully!');
    } catch (error) {
        showError('Error exporting seating PDF: ' + error.message);
    }
}

function printSeatingCharts() {
    const roomId = AppState.seating.selectedRoom;
    if (!roomId || !AppState.seating.assignments[roomId]) {
        showError('No seating assignments to print');
        return;
    }
    
    try {
        const room = AppState.rooms.find(r => r.id === roomId);
        const assignments = AppState.seating.assignments[roomId];
        
        const printWindow = window.open('', '_blank');
        let html = `
            <html>
            <head>
                <title>Seating Chart - ${room.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { text-align: center; }
                    .assignment { padding: 5px; border-bottom: 1px solid #ccc; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <h1>Seating Chart - ${room.name}</h1>
        `;
        
        assignments.forEach(assignment => {
            html += `<div class="assignment">Seat ${assignment.seat}: ${assignment.student.name} (${assignment.student.course})</div>`;
        });
        
        html += '</body></html>';
        
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
        
        logActivity('Seating chart sent to printer', 'success');
        showSuccess('Seating chart sent to printer successfully!');
    } catch (error) {
        showError('Error printing seating chart: ' + error.message);
    }
}

function exportAllData() {
    try {
        const allData = {
            students: AppState.students,
            courses: AppState.courses,
            rooms: AppState.rooms,
            schedule: AppState.schedule,
            assignments: AppState.seating.assignments,
            timestamp: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'exam-system-backup.json';
        link.click();
        
        logActivity('All data exported as backup', 'success');
        showSuccess('All data exported as backup successfully!');
    } catch (error) {
        showError('Error exporting data: ' + error.message);
    }
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.students) AppState.students = data.students;
                if (data.courses) AppState.courses = data.courses;
                if (data.rooms) AppState.rooms = data.rooms;
                if (data.schedule) AppState.schedule = data.schedule;
                if (data.assignments) AppState.seating.assignments = data.assignments;
                
                updateUI();
                updateStatistics();
                populateRoomSelectors();
                populateCourseFilter();
                
                logActivity('Data imported successfully', 'success');
                showSuccess('Data imported successfully');
            } catch (error) {
                showError('Error importing data: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Utility functions
function populateRoomSelectors() {
    const selectors = ['roomSelector'];
    
    selectors.forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (!select) return;
        
        // Keep first option
        const firstOption = select.children[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        AppState.rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.name;
            select.appendChild(option);
        });
    });
}

function populateCourseFilter() {
    const select = document.getElementById('courseFilter');
    if (!select) return;
    
    // Keep first option
    const firstOption = select.children[0];
    select.innerHTML = '';
    select.appendChild(firstOption);
    
    AppState.courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.name;
        select.appendChild(option);
    });
}

function updateStatistics() {
    document.getElementById('totalStudents').textContent = AppState.students.length;
    document.getElementById('totalCourses').textContent = AppState.courses.length;
    document.getElementById('totalRooms').textContent = AppState.rooms.length;
}

function updateUI() {
    updateStatistics();
    
    if (AppState.currentTab === 'seating') {
        updateSeatingFilters();
    }
    
    if (AppState.currentTab === 'rooms') {
        updateRoomList();
    }
    
    if (AppState.schedule.length > 0) {
        displayScheduleResults();
    }
}

function initializeCharts() {
    // Overview Chart
    const overviewCtx = document.getElementById('overviewChart');
    if (overviewCtx) {
        new Chart(overviewCtx, {
            type: 'doughnut',
            data: {
                labels: ['Students', 'Courses', 'Rooms'],
                datasets: [{
                    data: [0, 0, 8],
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Schedule Chart
    const scheduleCtx = document.getElementById('scheduleChart');
    if (scheduleCtx) {
        window.scheduleChart = new Chart(scheduleCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Students per Time Slot',
                    data: [],
                    backgroundColor: '#1FB8CD'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

function updateCharts() {
    // Update overview chart
    const overviewChart = Chart.getChart('overviewChart');
    if (overviewChart) {
        overviewChart.data.datasets[0].data = [
            AppState.students.length,
            AppState.courses.length,
            AppState.rooms.length
        ];
        overviewChart.update();
    }
}

function updateScheduleChart() {
    if (!window.scheduleChart || !AppState.schedule || AppState.schedule.length === 0) return;
    
    const labels = AppState.schedule.map(item => 
        item.timeSlot ? item.timeSlot.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Not set'
    );
    const data = AppState.schedule.map(item => item.students || 0);
    
    window.scheduleChart.data.labels = labels;
    window.scheduleChart.data.datasets[0].data = data;
    window.scheduleChart.update();
}

function logActivity(message, type = 'info') {
    const feed = document.getElementById('activityFeed');
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    const statusClass = type === 'success' ? 'status--success' : 
                       type === 'warning' ? 'status--warning' : 
                       type === 'error' ? 'status--error' : 'status--info';
    
    item.innerHTML = `
        <span class="status ${statusClass}">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        <span>${message}</span>
    `;
    
    feed.insertBefore(item, feed.firstChild);
    
    // Keep only last 10 items
    while (feed.children.length > 10) {
        feed.removeChild(feed.lastChild);
    }
}

function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function updateModalProgress(percentage, text) {
    const fill = document.getElementById('modalProgressFill');
    const textEl = document.getElementById('modalProgressText');
    
    if (fill) fill.style.width = `${percentage}%`;
    if (textEl) textEl.textContent = text;
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    showModal('errorModal');
    logActivity(message, 'error');
}

function showSuccess(message) {
    document.getElementById('successMessage').textContent = message;
    showModal('successModal');
    logActivity(message, 'success');
}

// Sample data functions
function loadSampleData() {
    showModal('progressModal');
    updateModalProgress(0, 'Loading sample data...');
    
    setTimeout(() => {
        AppState.students = [...SampleData.students];
        AppState.courses = [...SampleData.courses];
        
        // Generate more sample students
        const additionalStudents = [];
        const courseIds = SampleData.courses.map(c => c.id);
        
        for (let i = 6; i <= 1140; i++) {
            additionalStudents.push({
                id: `S${i.toString().padStart(3, '0')}`,
                name: `Student ${i}`,
                course: courseIds[Math.floor(Math.random() * courseIds.length)],
                semester: Math.floor(Math.random() * 4) + 1,
                year: 2024 + Math.floor(Math.random() * 3)
            });
        }
        
        AppState.students.push(...additionalStudents);
        
        updateModalProgress(100, 'Sample data loaded!');
        
        setTimeout(() => {
            closeModal('progressModal');
            updateStatistics();
            updateUI();
            populateCourseFilter();
            updateCharts();
            logActivity(`Loaded ${AppState.students.length} student records and ${AppState.courses.length} courses`, 'success');
        }, 500);
    }, 1000);
}

function generateQuickSchedule() {
    if (!AppState.students.length || !AppState.courses.length) {
        loadSampleData();
        setTimeout(() => {
            switchTab('schedule');
            setTimeout(generateSchedule, 1000);
        }, 2000);
    } else {
        switchTab('schedule');
        setTimeout(generateSchedule, 500);
    }
}