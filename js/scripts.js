/*
         * Tech.Care Patient Dashboard Script
         */
document.addEventListener('DOMContentLoaded', () => {

    const app = {
        // Cache frequently accessed DOM elements for performance
        dom: {
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
            clearFiltersBtn: document.getElementById('clearFilters'),
            exportChartBtn: document.getElementById('exportChart'),
            exportPatientCsvBtn: document.getElementById('exportPatientCSV'),
            exportAllCsvBtn: document.getElementById('exportAllCSV'),
            menuToggle: document.getElementById('menu-toggle'),
            navigation: document.getElementById('mainNav')
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
            this.events.init();
            this.data.fetch();
            this.serviceWorker.register();
        },

        // --- MODULES ---

        events: {
            init() {
                app.dom.userList.addEventListener('click', this.handleUserSelect);
                app.dom.menuToggle.addEventListener('click', () => {
                    app.dom.navigation.classList.toggle('active');
                });

                const debouncedFilter = app.utils.debounce(app.ui.applyFilters, 300);
                [app.dom.searchInput, app.dom.filterGender, app.dom.minAge, app.dom.maxAge].forEach(el => {
                    if (el) el.addEventListener('input', debouncedFilter);
                });

                app.dom.clearFiltersBtn.addEventListener('click', app.ui.clearFilters);
                app.dom.exportChartBtn.addEventListener('click', app.utils.exportChartPNG);
                app.dom.exportPatientCsvBtn.addEventListener('click', () => app.utils.exportPatientCSV());
                app.dom.exportAllCsvBtn.addEventListener('click', () => app.utils.exportAllCSV());

                // Close navigation when clicking outside
                document.addEventListener('click', (e) => {
                    if (app.dom.navigation.classList.contains('active') &&
                        !e.target.closest('.navigation') &&
                        !e.target.closest('.menu-btn')) {
                        app.dom.navigation.classList.remove('active');
                    }
                });
            },
            handleUserSelect(e) {
                const li = e.target.closest('li[data-name]');
                if (li) {
                    app.ui.selectUser(decodeURIComponent(li.dataset.name));
                    // Close navigation on mobile after selection
                    if (window.innerWidth < 880) {
                        app.dom.navigation.classList.remove('active');
                    }
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

                    // Set default patient to "Emily Williams"
                    const defaultUser = app.state.rawData.find(u => u.name === 'Emily Williams') || app.state.rawData[0];
                    if (defaultUser) {
                        app.ui.selectUser(defaultUser.name);
                    }
                } catch (err) {
                    console.error('Failed to fetch data:', err);
                    app.dom.userList.innerHTML = `<li class="error">Unable to load patient data. Please check your connection.</li>`;
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
                const labResultsHtml = (user.lab_results || []).map(r => `
                            <li>
                                <i class="ri-file-text-line"></i>
                                ${app.utils.safeText(r)} 
                                <i class="ri-download-2-line"></i>
                            </li>`).join('');

                app.dom.profileContainer.innerHTML = `
                            <img loading="lazy" src="${app.utils.safeText(user.profile_picture)}" alt="${app.utils.safeText(user.name)}" />
                            <h2>${app.utils.safeText(user.name)}</h2>
                            <p class="muted">Patient ID: ${app.utils.generatePatientId(user.name)}</p>
                            <ul>
                                <li><i class="ri-calendar-event-line"></i> <strong>Date of Birth</strong> <span>${app.utils.safeText(user.date_of_birth)}</span></li>
                                <li><i class="ri-user-line"></i> <strong>Gender</strong> <span>${app.utils.safeText(user.gender)}</span></li>
                                <li><i class="ri-phone-line"></i> <strong>Contact Info</strong> <span>${app.utils.safeText(user.phone_number)}</span></li>
                                <li><i class="ri-contacts-line"></i> <strong>Emergency Contact</strong> <span>${app.utils.safeText(user.emergency_contact)}</span></li>
                                <li><i class="ri-health-book-line"></i> <strong>Insurance Provider</strong> <span>${app.utils.safeText(user.insurance_type)}</span></li>
                            </ul>
                            <h3>Lab Results</h3>
                            <ul class="lab-results">${labResultsHtml}</ul>`;
            },

            renderDiagnosticList(user) {
                const rows = (user.diagnostic_list || []).map(d => `
                            <tr data-status="${d.status.toLowerCase()}">
                                <td>${app.utils.safeText(d.name)}</td>
                                <td>${app.utils.safeText(d.description)}</td>
                                <td>${app.utils.safeText(d.status)}</td>
                            </tr>`).join('');
                app.dom.diagnosticList.innerHTML = rows || '<tr><td colspan="3">No diagnostic records found.</td></tr>';
            },

            renderVitals(user) {
                const latestVitals = user.diagnosis_history?.[0];
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

                const filtered = app.state.rawData.filter(u => {
                    if (q && !(u.name || '').toLowerCase().includes(q)) return false;
                    if (gender && (u.gender || '') !== gender) return false;
                    if (minAge !== null && u.age < minAge) return false;
                    if (maxAge !== null && u.age > maxAge) return false;
                    return true;
                });
                app.ui.renderUserList(filtered);
            },

            clearFilters() {
                app.dom.searchInput.value = '';
                app.dom.filterGender.value = '';
                app.dom.minAge.value = '';
                app.dom.maxAge.value = '';
                app.ui.renderUserList(app.state.rawData);
                if (app.state.rawData[0]) app.ui.selectUser(app.state.rawData[0].name);
            }
        },

        chart: {
            init(user) {
                const history = (user.diagnosis_history || []).slice().reverse();
                let dataPoints = history.map(entry => ({
                    date: app.utils.parseEntryDate(entry),
                    systolic: entry.blood_pressure?.systolic?.value,
                    diastolic: entry.blood_pressure?.diastolic?.value,
                })).filter(p => p.date);

                const labels = dataPoints.map(p => p.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

                // Chart colors
                const gridColor = 'rgba(0, 0, 0, 0.05)';
                const textColor = '#171717';

                const datasets = [
                    {
                        label: 'Systolic',
                        data: dataPoints.map(p => p.systolic),
                        borderColor: '#E11D48',
                        backgroundColor: 'rgba(225, 29, 72, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#E11D48',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Diastolic',
                        data: dataPoints.map(p => p.diastolic),
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#3B82F6',
                        pointBorderColor: '#fff',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ];

                if (app.state.chartInstance) {
                    app.state.chartInstance.data.labels = labels;
                    app.state.chartInstance.data.datasets = datasets;
                    app.state.chartInstance.update();
                } else {
                    const ctx = app.dom.chartCanvas.getContext('2d');

                    // Create gradient for chart background
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(248, 250, 252, 0.5)');
                    gradient.addColorStop(1, 'rgba(248, 250, 252, 0.1)');

                    app.state.chartInstance = new Chart(ctx, {
                        type: 'line',
                        data: { labels, datasets },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'top',
                                    labels: {
                                        color: textColor,
                                        usePointStyle: true,
                                        padding: 20,
                                        font: {
                                            family: "'Ubuntu', sans-serif",
                                            size: 13,
                                            weight: '600'
                                        }
                                    }
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    titleColor: textColor,
                                    bodyColor: textColor,
                                    borderColor: 'rgba(0, 0, 0, 0.1)',
                                    borderWidth: 1,
                                    cornerRadius: 8,
                                    displayColors: false,
                                    callbacks: {
                                        title: function (tooltipItems) {
                                            return tooltipItems[0].label;
                                        },
                                        label: function (context) {
                                            return `${context.dataset.label}: ${context.parsed.y} mmHg`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: {
                                        color: gridColor,
                                        drawBorder: false
                                    },
                                    ticks: {
                                        color: textColor,
                                        maxRotation: 0,
                                        font: {
                                            family: "'Ubuntu', sans-serif",
                                            size: 11
                                        }
                                    }
                                },
                                y: {
                                    beginAtZero: false,
                                    grid: {
                                        color: gridColor,
                                        drawBorder: false
                                    },
                                    ticks: {
                                        color: textColor,
                                        font: {
                                            family: "'Ubuntu', sans-serif",
                                            size: 11
                                        }
                                    },
                                    title: {
                                        display: true,
                                        text: 'mmHg',
                                        color: textColor,
                                        font: {
                                            family: "'Ubuntu', sans-serif",
                                            size: 12,
                                            weight: '600'
                                        }
                                    }
                                }
                            },
                            elements: {
                                line: {
                                    borderWidth: 2
                                }
                            },
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            animation: {
                                duration: 1000,
                                easing: 'easeOutQuart'
                            }
                        }
                    });
                }
            }
        },

        utils: {
            safeText: (s) => s ?? '',
            debounce(func, delay) {
                let timeout;
                return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
            },
            parseEntryDate(entry) {
                const monthMap = { "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5, "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11 };
                return new Date(entry.year, monthMap[entry.month], 1);
            },
            generatePatientId(name) {
                // Simple hash function to generate a consistent patient ID from name
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    hash = ((hash << 5) - hash) + name.charCodeAt(i);
                    hash = hash & hash;
                }
                return `PT-${Math.abs(hash).toString().substring(0, 6)}`;
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