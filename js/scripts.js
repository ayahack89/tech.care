/*
 * Tech.Care Patient Dashboard Script
 * Final Version: 2.3.1
 * Description: Changed default patient to Emily Williams.
 */
document.addEventListener('DOMContentLoaded', () => {

    const app = {
        // Cache frequently accessed DOM elements for performance
        dom: {
            themeToggle: document.getElementById('themeToggle'),
            userList: document.getElementById('allusers'),
            profileContainer: document.getElementById('userdata'),
            diagnosticList: document.getElementById('diagnostic_list'),
            vitalsContainer: document.getElementById('diagnosis_history_meter'),
            chartCanvas: document.getElementById('myChart'),
            // Filters and Controls
            searchInput: document.getElementById('searchInput'),
            filterGender: document.getElementById('filterGender'),
            minAge: document.getElementById('minAge'),
            maxAge: document.getElementById('maxAge'),
            lastVisitAfter: document.getElementById('lastVisitAfter'),
            clearFiltersBtn: document.getElementById('clearFilters'),
            rangeFrom: document.getElementById('rangeFrom'),
            rangeTo: document.getElementById('rangeTo'),
            applyRangeBtn: document.getElementById('applyRange'),
            resetRangeBtn: document.getElementById('resetRange'),
            exportChartBtn: document.getElementById('exportChart'),
            exportPatientCsvBtn: document.getElementById('exportPatientCSV'),
            exportAllCsvBtn: document.getElementById('exportAllCSV'),
        },

        // Application state
        state: {
            rawData: [],
            chartInstance: null,
            selectedUser: null,
        },

        // API configuration
        api: {
            URL: 'https://fedskillstest.coalitiontechnologies.workers.dev/',
            AUTH_HEADER: 'Basic ' + btoa('coalition:skills-test'),
        },

        // Main initialization function
        init() {
            this.theme.init();
            this.events.init();
            this.data.fetch();
            this.serviceWorker.register();
        },

        // --- MODULES ---

        theme: {
            init() {
                const savedTheme = localStorage.getItem('techcare_theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = savedTheme || (prefersDark ? 'dark' : 'light');
                this.apply(theme);
            },
            apply(theme) {
                document.body.classList.toggle('dark', theme === 'dark');
                const icon = app.dom.themeToggle.querySelector('i');
                if (icon) {
                    icon.className = theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
                }
                localStorage.setItem('techcare_theme', theme);
            },
            toggle() {
                const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
                this.apply(currentTheme === 'dark' ? 'light' : 'dark');
            }
        },

        events: {
            init() {
                app.dom.themeToggle.addEventListener('click', () => app.theme.toggle());
                app.dom.userList.addEventListener('click', this.handleUserSelect);

                const debouncedFilter = app.utils.debounce(app.ui.applyFilters, 300);
                [app.dom.searchInput, app.dom.filterGender, app.dom.minAge, app.dom.maxAge, app.dom.lastVisitAfter].forEach(el => {
                    if (el) el.addEventListener('input', debouncedFilter);
                });

                app.dom.clearFiltersBtn.addEventListener('click', app.ui.clearFilters);
                app.dom.applyRangeBtn.addEventListener('click', () => app.chart.applyDateRange());
                app.dom.resetRangeBtn.addEventListener('click', () => app.chart.resetDateRange());
                app.dom.exportChartBtn.addEventListener('click', app.utils.exportChartPNG);

                app.dom.exportPatientCsvBtn.addEventListener('click', () => app.utils.exportPatientCSV());
                app.dom.exportAllCsvBtn.addEventListener('click', () => app.utils.exportAllCSV());
            },
            handleUserSelect(e) {
                const li = e.target.closest('li[data-name]');
                if (li) {
                    app.ui.selectUser(decodeURIComponent(li.dataset.name));
                }
            }
        },

        data: {
            async fetch() {
                try {
                    const res = await fetch(app.api.URL, { headers: { 'Authorization': app.api.AUTH_HEADER } });
                    if (!res.ok) throw new Error(`API Error: ${res.status}`);
                    
                    app.state.rawData = await res.json();
                    app.ui.renderUserList(app.state.rawData);

                    // [CHANGED] Set default patient to "Emily Williams"
                    const defaultUser = app.state.rawData.find(u => u.name === 'Emily Williams') || app.state.rawData[0];
                    if (defaultUser) {
                        app.ui.selectUser(defaultUser.name);
                    }
                } catch (err) {
                    console.error('Failed to fetch data:', err);
                    app.dom.userList.innerHTML = `<li class="error">Unable to load patient data.</li>`;
                }
            }
        },

        ui: {
            renderUserList(users) {
                const html = users.map(user => `
                    <li data-name="${encodeURIComponent(user.name)}" role="button" tabindex="0">
                        <img loading="lazy" src="${app.utils.safeText(user.profile_picture)}" alt="${app.utils.safeText(user.name)}'s profile" />
                        <div class="user-info">
                            <div class="name">${app.utils.safeText(user.name)}</div>
                            <div class="sub">${app.utils.safeText(user.gender)}, ${app.utils.safeText(user.age)}</div>
                        </div>
                    </li>`).join('');
                app.dom.userList.innerHTML = html || '<li>No patients found.</li>';
            },

            selectUser(name) {
                const user = app.state.rawData.find(u => u.name === name);
                if (!user) return;
                app.state.selectedUser = user;
                
                app.dom.userList.querySelectorAll('li').forEach(li => {
                    li.classList.toggle('active', decodeURIComponent(li.dataset.name) === name);
                });
                
                this.renderProfile(user);
                this.renderDiagnosticList(user);
                this.renderVitals(user);
                app.chart.init(user);
            },

            renderProfile(user) {
                const labResultsHtml = (user.lab_results || []).map(r => `<li>${app.utils.safeText(r)} <i class="ri-download-2-line"></i></li>`).join('');
                app.dom.profileContainer.innerHTML = `
                    <img loading="lazy" src="${app.utils.safeText(user.profile_picture)}" alt="${app.utils.safeText(user.name)}" />
                    <h2>${app.utils.safeText(user.name)}</h2>
                    <ul>
                        <li><strong>Date of Birth</strong> <span>${app.utils.safeText(user.date_of_birth)}</span></li>
                        <li><strong>Gender</strong> <span>${app.utils.safeText(user.gender)}</span></li>
                        <li><strong>Contact Info</strong> <span>${app.utils.safeText(user.phone_number)}</span></li>
                        <li><strong>Emergency Contact</strong> <span>${app.utils.safeText(user.emergency_contact)}</span></li>
                        <li><strong>Insurance Provider</strong> <span>${app.utils.safeText(user.insurance_type)}</span></li>
                    </ul>
                    <h3>Lab Results</h3>
                    <ul class="lab-results">${labResultsHtml}</ul>`;
            },
            
            renderDiagnosticList(user) {
                const rows = (user.diagnostic_list || []).map(d => `
                    <tr>
                        <td>${app.utils.safeText(d.name)}</td>
                        <td>${app.utils.safeText(d.description)}</td>
                        <td>${app.utils.safeText(d.status)}</td>
                    </tr>`).join('');
                app.dom.diagnosticList.innerHTML = rows || '<tr><td colspan="3">No diagnostic records found.</td></tr>';
            },

            renderVitals(user) {
                const latestVitals = user.diagnosis_history?.[0]; // Assuming most recent is first
                if (!latestVitals) {
                    app.dom.vitalsContainer.innerHTML = '<p>No vitals available.</p>';
                    return;
                }
                const vitalsData = [
                    { type: 'heart-rate', icon: 'ri-heart-pulse-line', label: 'Heart Rate', data: latestVitals.heart_rate, unit: 'bpm' },
                    { type: 'respiratory', icon: 'ri-lungs-line', label: 'Respiratory Rate', data: latestVitals.respiratory_rate, unit: 'bpm' },
                    { type: 'temperature', icon: 'ri-temp-hot-line', label: 'Temperature', data: latestVitals.temperature, unit: '°F' }
                ];
                app.dom.vitalsContainer.innerHTML = vitalsData.map(vital => `
                    <div class="vital-card vital-card--${vital.type}">
                        <div class="vital-label"><i class="${vital.icon}"></i> ${vital.label}</div>
                        <div class="vital-value">${app.utils.safeText(vital.data?.value)} ${vital.unit}</div>
                        <div class="vital-status">${app.utils.safeText(vital.data?.levels)}</div>
                    </div>`).join('');
            },

            applyFilters() {
                const q = app.dom.searchInput.value.trim().toLowerCase();
                const gender = app.dom.filterGender.value;
                const minAge = parseInt(app.dom.minAge.value) || null;
                const maxAge = parseInt(app.dom.maxAge.value) || null;
                const lastVisitAfter = app.dom.lastVisitAfter.value ? new Date(app.dom.lastVisitAfter.value) : null;
                const filtered = app.state.rawData.filter(u => {
                    if (q && !(u.name || '').toLowerCase().includes(q)) return false;
                    if (gender && (u.gender || '') !== gender) return false;
                    if (minAge !== null && u.age < minAge) return false;
                    if (maxAge !== null && u.age > maxAge) return false;
                    if (lastVisitAfter) {
                        if (!Array.isArray(u.diagnosis_history) || !u.diagnosis_history.length) return false;
                        const dates = u.diagnosis_history.map(app.utils.parseEntryDate).filter(Boolean);
                        if (!dates.length) return false;
                        const latest = new Date(Math.max(...dates.map(d => d.getTime())));
                        if (latest < lastVisitAfter) return false;
                    }
                    return true;
                });
                app.ui.renderUserList(filtered);
            },
            
            clearFilters() {
                app.dom.searchInput.value = '';
                app.dom.filterGender.value = '';
                app.dom.minAge.value = '';
                app.dom.maxAge.value = '';
                app.dom.lastVisitAfter.value = '';
                app.ui.renderUserList(app.state.rawData);
                if (app.state.rawData[0]) app.ui.selectUser(app.state.rawData[0].name);
            }
        },
        
        chart: {
            init(user, fromDate = null, toDate = null) {
                const history = (user.diagnosis_history || []).slice().reverse();
                let dataPoints = history.map(entry => ({
                    date: app.utils.parseEntryDate(entry),
                    systolic: entry.blood_pressure?.systolic?.value,
                    diastolic: entry.blood_pressure?.diastolic?.value,
                })).filter(p => p.date);
        
                if (fromDate) dataPoints = dataPoints.filter(p => p.date >= fromDate);
                if (toDate) dataPoints = dataPoints.filter(p => p.date <= toDate);
        
                const labels = dataPoints.map(p => p.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
                const datasets = [
                    { label: 'Systolic', data: dataPoints.map(p => p.systolic), borderColor: '#E11D48', tension: 0.3, pointBackgroundColor: '#E11D48', pointBorderColor: '#FFF' },
                    { label: 'Diastolic', data: dataPoints.map(p => p.diastolic), borderColor: '#3B82F6', tension: 0.3, pointBackgroundColor: '#3B82F6', pointBorderColor: '#FFF' }
                ];
        
                if (app.state.chartInstance) {
                    app.state.chartInstance.data.labels = labels;
                    app.state.chartInstance.data.datasets = datasets;
                    app.state.chartInstance.update();
                } else {
                    app.state.chartInstance = new Chart(app.dom.chartCanvas.getContext('2d'), {
                        type: 'line', data: { labels, datasets },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, title: { display: true, text: 'mmHg' } } }, plugins: { legend: { position: 'top', align: 'end' } } }
                    });
                }
            },
            
            applyDateRange() {
                const from = app.dom.rangeFrom.value;
                const to = app.dom.rangeTo.value;
                const fromDate = from ? new Date(from + 'T00:00:00') : null;
                const toDate = to ? new Date(to + 'T23:59:59') : null;
                this.init(app.state.selectedUser, fromDate, toDate);
            },
            
            resetDateRange() {
                app.dom.rangeFrom.value = '';
                app.dom.rangeTo.value = '';
                this.init(app.state.selectedUser);
            }
        },

        utils: {
            safeText: (s) => s ?? '',
            debounce(func, delay) {
                let timeout;
                return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
            },
            parseEntryDate(entry) {
                const monthMap = { "January":0, "February":1, "March":2, "April":3, "May":4, "June":5, "July":6, "August":7, "September":8, "October":9, "November":10, "December":11 };
                return new Date(entry.year, monthMap[entry.month], 1);
            },
            exportChartPNG() {
                if (!app.state.chartInstance) return alert('Chart not available.');
                const a = document.createElement('a');
                a.href = app.state.chartInstance.toBase64Image();
                a.download = `${app.state.selectedUser.name.replace(/\s+/g, '_')}_chart.png`;
                a.click();
            },
            arrayToCSV(rows) {
                return rows.map(row => 
                    row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
                ).join('\r\n');
            },
            exportPatientCSV() {
                const user = app.state.selectedUser;
                if (!user) return alert('No patient selected.');
                const rows = [
                    ['Field', 'Value'],
                    ['Name', user.name],
                    ['Gender', user.gender],
                    ['Age', user.age],
                    [],
                    ['Problem', 'Description', 'Status'],
                    ...(user.diagnostic_list || []).map(d => [d.name, d.description, d.status])
                ];
                const csv = this.arrayToCSV(rows);
                this.downloadBlob(csv, `${user.name.replace(/\s+/g, '_')}_data.csv`, 'text/csv;charset=utf-8;');
            },
            exportAllCSV() {
                if (!app.state.rawData.length) return alert('No data to export.');
                const rows = [['Name', 'Gender', 'Age', 'Phone']];
                app.state.rawData.forEach(u => rows.push([u.name, u.gender, u.age, u.phone_number]));
                const csv = this.arrayToCSV(rows);
                this.downloadBlob(csv, `techcare_all_patients.csv`, 'text/csv;charset=utf-8;');
            },
            downloadBlob(content, fileName, contentType) {
                const blob = new Blob([content], { type: contentType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        },

        serviceWorker: {
            register() {
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.register('/sw.js')
                        .catch(err => console.warn('Service Worker registration failed:', err));
                }
            }
        }
    };

    // Boot the application
    app.init();
});