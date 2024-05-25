/*script.js*/
let username = 'coalition';
let password = 'skills-test';
let auth = btoa(`${username}:${password}`);

async function callApi() {
    try {
        let response = await fetch('https://fedskillstest.coalitiontechnologies.workers.dev/', {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        let data = await response.json();
        console.log(data);

        let alluserdata = data.map(user => `
        <div class="allusers">
        <img src="${user.profile_picture}" alt"${user.name}" width="30px"/>
        <div><strong>${user.name}</strong> <br> <span style="font-size:12px;">${user.gender}, ${user.age}</span></div>
        </div>
            `).join('');
        document.getElementById('allusers').innerHTML = alluserdata;

        let jessicaData = data.filter(user => user.name === 'Jessica Taylor');

        if (jessicaData.length > 0) {
            let jessica = jessicaData[0];

            let userdataHtml = `
        <div>
        <center>
            <img src="${jessica.profile_picture}" alt="Jessica Taylor">
            <h2>${jessica.name}</h2>
            </center>
            <ul>
            <li><i class="ri-calendar-line"></i>  <strong>Date of Birth</strong> <br> <span style="margin-left:22px;">${jessica.date_of_birth}</span></li>
            <li><i class="ri-women-line"></i> <strong>Gender</strong> <br> <span style="margin-left:22px;">${jessica.gender}</span></li>
            <li><i class="ri-phone-line"></i> <strong>Contact Info</strong> <br> <span style="margin-left:22px;">${jessica.phone_number}</span></li>
            <li><i class="ri-phone-line"></i> <strong>Emergency Contacts</strong> <br> <span style="margin-left:22px;">${jessica.emergency_contact}<span></li>
            <li><i class="ri-shield-check-line"></i> <strong>Insurance Provider</strong> <br> <span style="margin-left:22px;">${jessica.incurance_type}</span></li>
            </ul>
            <button>Show All Information</button>
            </div>
            <div class="lab-results" id="lab_results">
                <br>
                
            <ul>
            <h2>Lab Results</h2>
                    ${jessica.lab_results.map(result => `<li>${result}    <i class="ri-download-2-line"></i></li> `).join('')} 
            </ul>

        </div>  
      
    `;
            let diagnosticListHtml = jessica.diagnostic_list.map(diagnostic => `
        <tr>
            <td>${diagnostic.name}</td>
            <td>${diagnostic.description}</td>
            <td>${diagnostic.status}</td>
        </tr>
    `).join('');

            document.getElementById("userdata").innerHTML = userdataHtml;
            document.getElementById("diagnostic_list").innerHTML = diagnosticListHtml;
        } else {
            document.getElementById("userdata").innerHTML = '<p>No data found for Jessica Taylor</p>';
        }
    } catch (error) {
        console.warn(error);
    }
}


function toggleDiagnosticList() {
    let diagnosticTable = document.getElementById("diagnosticTable");
    let labResults = document.getElementById("labResults");
    if (diagnosticTable.style.display === "none") {
        diagnosticTable.style.display = "table";
        labResults.style.display = "block";
    } else {
        diagnosticTable.style.display = "none";
        labResults.style.display = "none";
    }
}


callApi();


var xmlhttp = new XMLHttpRequest();
var url = 'https://fedskillstest.coalitiontechnologies.workers.dev/';
let user = 'coalition';
let pass = 'skills-test';
let autho = btoa(`${user}:${pass}`);

xmlhttp.open("GET", url, true);
xmlhttp.setRequestHeader('Authorization', `Basic ${autho}`);
xmlhttp.send();

xmlhttp.onreadystatechange = function() {
if (this.readyState == 4 && this.status == 200) {
var data = JSON.parse(this.responseText);
console.log(data);

var filteredUser = data.filter(mainuser => mainuser.name === 'Jessica Taylor')[0];
if (filteredUser) {
    console.log(filteredUser);

    var diagnosisHistory = filteredUser.diagnosis_history;
    console.log(diagnosisHistory);

    var firstEntry = diagnosisHistory[0];
    console.log(firstEntry);


    let diagnosis_history_meter = `
        <div style="background-color:#fca5a5;">
        <i class="ri-heart-pulse-line" style="font-size:3rem; color:red;"></i>
            <h3>Heart Rate   </h3>
            <h1>${firstEntry.heart_rate.value} bpm</h1>
            <p>${firstEntry.heart_rate.levels}</p>
        </div>
        <div style="background-color:#bae6fd;">
        <i class="ri-lungs-line" style="font-size:3rem; color:skyblue;"></i>
            <h3>Respiratory Rate </h3>
            <h1>${firstEntry.respiratory_rate.value} bpm</h1>
            <p> ${firstEntry.respiratory_rate.levels}</p>
        </div>
        <div style="background-color: #fde68a">
        <i class="ri-temp-hot-line" style="font-size:3rem; color:orange;"></i>
            <h3>Temperature</h3>
            <h1>${firstEntry.temperature.value} °F</h1>
            <p>${firstEntry.temperature.levels}</p>
        </div>
    `;

    document.getElementById("diagnosis_history_meter").innerHTML = diagnosis_history_meter;

    // Create the chart with the extracted blood pressure data
    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: diagnosisHistory.map(entry => `${entry.month} ${entry.year}`),
            datasets: [
                {
                    label: 'Systolic Blood Pressure',
                    data: diagnosisHistory.map(entry => entry.blood_pressure.systolic.value),
                    backgroundColor: 'transparent',
                    borderColor: 'red',
                    borderWidth: 2,
                    tension: 0.4 
                },
                {
                    label: 'Diastolic Blood Pressure',
                    data: diagnosisHistory.map(entry => entry.blood_pressure.diastolic.value),
                    backgroundColor: 'transparent',
                    borderColor: 'blue',
                    borderWidth: 2,
                    tension: 0.4 
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Blood Pressure (mmHg)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });

} else {
    console.log('User Jessica Taylor not found');
}

} else if (this.readyState == 4) {
console.error('Error fetching data:', this.status, this.statusText);
}
};



document.getElementById("menu-toggle").addEventListener("click", function() {
     document.querySelector(".navigation").classList.toggle("active");
 });


