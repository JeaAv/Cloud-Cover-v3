// Initializing the Map
var map = L.map('map').setView([7.8592, 125.0515], 13);
var currentMarker = null;
let hourlyChart;

// Adding the Tile Layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

// Function to update the Windy iframe based on Leaflet map's center and zoom
function updateWindyMap() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const windyIframe = document.getElementById('windy-iframe');
    windyIframe.src = `https://embed.windy.com/embed.html?type=map&location=${center.lat},${center.lng}&metricRain=default&metricTemp=default&metricWind=default&zoom=${zoom}&overlay=clouds&product=ecmwf&level=surface&lat=${center.lat}&lon=${center.lng}`;
}

updateWindyMap();

// Event listener for map move
map.on('move', updateWindyMap);


// Function to Create or Update the Chart
function createOrUpdateChart(chart, ctx, labels, data, label) {
    if (chart) {
        // Updates the existing chart with new data
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.data.labels.push(...labels);
        chart.data.datasets[0].data.push(...data);
        chart.update();
    } else {
        // Creates a new chart if none exists
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                }
            }
        });
    }
    return chart;
}

// Handling Map Click Events
function handleMapClick(e) {
    document.getElementById('chatbot-container').style.display = 'flex'; // Show chatbot container
    var lat = e.latlng.lat.toFixed(6);
    var lng = e.latlng.lng.toFixed(6);
    document.getElementById('latitude').textContent = lat;
    document.getElementById('longitude').textContent = lng;

    fetchCloudCoverData(lat, lng);
    fetchChatbotResponse(lat, lng);
    updateWindyMap();
    // Update custom marker position
    updateCustomMarkerPosition(e.latlng);
}


// Function to update custom marker position
function updateCustomMarkerPosition(latlng) {
    const customMarker = document.getElementById('custom-marker');
    const point = map.latLngToContainerPoint(latlng); // Convert lat/lng to pixel

    customMarker.style.left = point.x + 'px';
    customMarker.style.top = point.y + 'px';
    customMarker.style.display = 'block'; // Show the marker
}

// Fetching Cloud Cover Data
function fetchCloudCoverData(lat, lng) {
    fetch('/get-stored-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Fetched Data:', data); // Debugging line

        if (data.success) {
            updateCloudCoverData(data.current);
            document.getElementById('latitude').innerText = lat;
            document.getElementById('longitude').innerText = lng;

            // Updating map marker
            if (currentMarker) map.removeLayer(currentMarker);
            currentMarker = L.marker([lat, lng]).addTo(map)
                .bindPopup(`Latitude: ${lat}<br>Longitude: ${lng}`)
                .openPopup();

            // Plotting hourly cloud cover data
            const hourlyCtx = document.getElementById('hourlyCloudCoverChart').getContext('2d');
            hourlyChart = createOrUpdateChart(
                hourlyChart,
                hourlyCtx,
                data.hourly.time,
                data.hourly.cloud_cover_total,
                'Hourly Cloud Cover'
            );
        } else {
            alert(data.message || 'No data found for this location.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while fetching data. Please try again.');
    });
}

// Updating Cloud Cover Data
function updateCloudCoverData(data) {
    document.getElementById('cloudCoverTotal').innerText = data.cloud_cover_total || 'N/A';
    document.getElementById('cloudCoverLow').innerText = data.cloud_cover_low || 'N/A';
    document.getElementById('cloudCoverMid').innerText = data.cloud_cover_mid || 'N/A';
    document.getElementById('cloudCoverHigh').innerText = data.cloud_cover_high || 'N/A';
    document.getElementById('visibility').innerText = data.visibility || 'N/A';
}

// Event listener for map click
map.on('click', handleMapClick);

// Fetch user's first name from the backend
fetch('/get-user-fname')
.then(response => response.json())
.then(data => {
    console.log ('Response from /get-user-fname:', data);  // Debugging line
    if (data.success && data.f_name) {
        document.getElementById('user-name').textContent = data.f_name;
    } else {
        document.getElementById('user-name').textContent = 'Guest';
    }
})
.catch(error => {
    console.error('Error fetching user name:', error);
});

// Function to open the modal and fetch user data
document.getElementById('edit-profile-button').onclick = function() {
    fetch('/edit-profile', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const user = data.user;
            document.getElementById('first_name').value = user.f_name || '';
            document.getElementById('last_name').value = user.l_name || '';
            document.getElementById('username').value = user.username || '';
            document.getElementById('email').value = user.email || '';
            // Show the modal
            document.getElementById('edit-profile-modal').style.display = 'block';
        }
    });
};

// Close modal functionality
document.getElementById('close-modal-button').addEventListener('click', function() {
    document.getElementById('edit-profile-modal').style.display = 'none';  // Hide the modal
});

// Handle form submission
document.getElementById('edit-profile-form').onsubmit = function(event) {
    event.preventDefault();
    const formData = new FormData(this);
    
    fetch('/edit-profile', {
        method: 'POST',
        body: formData,
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show a success notification
            const successNotification = document.createElement('div');
            successNotification.className = 'success-notification';
            successNotification.textContent = 'Profile updated successfully!';
            document.body.appendChild(successNotification);

            // Auto-remove the notification after 3 seconds with fade-out effect
            setTimeout(() => {
                successNotification.classList.add('fade-out');
                setTimeout(() => {
                    successNotification.remove();
                }, 500); // Wait for fade-out transition to complete
            }, 2000);

            document.getElementById('edit-profile-modal').style.display = 'none'; // Close the modal
        } else {
            alert(data.message || 'Failed to update profile.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An unexpected error occurred. Please try again later.');
    });
};



// Sidebar Toggle
const sidebar = document.querySelector('.sidebar');
const toggleButton = document.getElementById('sidebar-toggle-btn');

toggleButton.addEventListener('click', function() {
    sidebar.classList.toggle('open');
});

// Handling Logout and User Page Navigation
document.getElementById('logout-btn').addEventListener('click', function() {
    sessionStorage.clear();
    window.location.href = '/';
});

document.getElementById('view-users-btn').addEventListener('click', function() {
    window.location.href = '/all-users';
});

// Chatbot response fetching
function fetchChatbotResponse(lat, lng) {
    const apiUrl = `https://barmmdrr.com/connect_ai/message?prompt=cloud%20cover&lat=${lat}&lng=${lng}`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayChatbotMessages(data); // Adjust this based on the actual structure of the response
        })
        .catch(error => {
            console.error('Error fetching chatbot response:', error);
        });
}

// Display chatbot messages
function displayChatbotMessages(responses) {
    const chatbot = document.getElementById('chatbot');
    chatbot.innerHTML = ''; // Clear previous messages

    // Assuming responses is an array of messages
    responses.forEach(response => {
        const messageElement = document.createElement('div');
        messageElement.textContent = response; // Adjust based on the actual structure
        chatbot.appendChild(messageElement);
    });
}

// Dropdown menu toggle
const dropdownButton = document.querySelector('.dropdown-button');
const dropdownMenu = document.querySelector('.dropdown-menu');

dropdownButton.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent closing when clicking inside the dropdown button
    dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
});

// Close dropdown menu if clicked outside of it
document.addEventListener('click', function(event) {
    if (!dropdownButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
        dropdownMenu.style.display = 'none';
    }
});


