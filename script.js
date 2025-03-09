let countries = [];
let currentCountry;
let score = 0;
let streak = 0; 
let onFire = false; 
let userMarker, correctMarker, circle;
let guessMap;
let countdownTimer; 
let timeLeft; 
let countdownControl; 
let canGuess = true; // New variable to control guessing

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("start-game").addEventListener("click", function () {
        document.getElementById("start-container").style.display = "none"; // Hide start button
        document.getElementById("game-container").style.display = "block"; // Show game UI

        let mapElement = document.getElementById("guess-map");
        mapElement.classList.add("active"); // Unblur map

        setTimeout(() => {
            mapElement.style.filter = "none"; // Ensure blur is removed
            mapElement.style.pointerEvents = "all"; // Allow interactions
        }, 100); // Small delay to apply changes smoothly

        initializeMap();
    });
});

function initializeMap() {
    guessMap = L.map('guess-map').setView([20, 0], 2);

    // Borderless map with no country labels
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.carto.com/">CARTO</a>',
        maxZoom: 18
    }).addTo(guessMap);

    // Create a custom control for the countdown
    countdownControl = L.control({ position: 'topright' });
    countdownControl.onAdd = function () {
        this._div = L.DomUtil.create('div', 'countdown'); 
        this.update(); // Initialize the countdown display
        return this._div;
    };
    countdownControl.update = function (time) {
        this._div.innerHTML = time ? `Next guess in: ${time} seconds` : ''; 
    };
    countdownControl.addTo(guessMap); 

    guessMap.whenReady(() => {
        guessMap.on('click', function (e) {
            placeMarker(e.latlng);
        });
    });

    fetchCountries(); 
}

// Place or move the marker
function placeMarker(latlng) {
    if (!userMarker) {
        userMarker = L.marker(latlng).addTo(guessMap);
    } else {
        userMarker.setLatLng(latlng);
    }
}

// Fetch country data
async function fetchCountries() {
    try {
        const response = await fetch('https://restcountries.com/v3.1/all');
        const data = await response.json();

        countries = data
            .map(country => ({
                name: country.name.common,
                coordinates: country.latlng ? country.latlng : [0, 0],
                flag: country.flags.svg
            }))
            .filter(country => country.coordinates.length === 2);

        console.log("Loaded countries:", countries);
        startGame();
    } catch (error) {
        console.error("Error fetching countries:", error);
    }
}

// Start a new round
function startGame() {
    if (countries.length === 0) {
        console.error("No country data available.");
        return;
    }

    // Pick a new random country
    currentCountry = countries[Math.floor(Math.random() * countries.length)];
    document.getElementById('country-name').innerHTML = `
        <img src="${currentCountry.flag}" alt="Flag of ${currentCountry.name}" style="width: 30px; height: auto; vertical-align: middle; margin-right: 10px;">
        ${currentCountry.name}`;
    document.getElementById('result').innerText = "";
    document.getElementById('score').innerText = `Score: ${score} | Streak: ${streak} 🔥 ${onFire ? "(ON FIRE!)" : ""}`;

    if (userMarker) {
        guessMap.removeLayer(userMarker);
        userMarker = null;
    }
    if (correctMarker) {
        guessMap.removeLayer(correctMarker);
        correctMarker = null;
    }
    if (circle) {
        guessMap.removeLayer(circle);
        circle = null;
    }

    guessMap.setView([20, 0], 2);
    document.getElementById('score').innerText = `Score: ${score} | Streak: ${streak} 🔥 ${onFire ? "(ON FIRE!)" : ""}`;
    
    streak = 0;

    // Reset countdown
    clearInterval(countdownTimer);
    countdownControl.update(''); 
    canGuess = true; // Allow guessing again
}

// Function to start the countdown for new guess
function startCountdown() {
    timeLeft = 5; 
    countdownControl.update(timeLeft); 

    // Clear any existing timer
    clearInterval(countdownTimer);
    
    // Start a new countdown
    countdownTimer = setInterval(() => {
        timeLeft--;
        countdownControl.update(timeLeft); 
        
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            countdownControl.update('');
            startGame(); 
        }
    }, 1000);
}

// Handle guess submission
document.getElementById('submit-guess').addEventListener('click', () => {
    if (!canGuess) {
        Swal.fire({
            icon: 'warning',
            title: 'No Guess!',
            text: 'You can only guess once per round!',
        });
        return;
    }

    if (!userMarker) {
        Swal.fire({
            icon: 'warning',
            title: 'No Guess!',
            text: 'Please place a pin on the map before submitting your guess!',
        });
        return;
    }

    const userGuess = userMarker.getLatLng();
    const actualCoordinates = L.latLng(currentCountry.coordinates[0], currentCountry.coordinates[1]);

    // Calculate distance
    const distance = userGuess.distanceTo(actualCoordinates) / 1000; // Convert meters to km

    // **Streak-Based Scoring System**
    let earnedPoints;
    let color;

    if (distance < 100) {
        earnedPoints = onFire ? 150 : 100; color = "blue";  // 🔵 100 points (150 if ON FIRE)
    } else if (distance < 500) {
        earnedPoints = onFire ? 115 : 75; color = "green"; // 🟢 75 points (115 if ON FIRE)
    } else if (distance < 1500) {
        earnedPoints = onFire ? 80 : 50; color = "yellow"; // 🟡 50 points (80 if ON FIRE)
    } else if (distance < 3000) {
        earnedPoints = onFire ? 40 : 25; color = "orange"; // 🟠 25 points (40 if ON FIRE)
    } else {
        earnedPoints = 10; color = "red"; // 🔴 10 points (minimum, no fire bonus)
    }

    let message;

    if (earnedPoints >= 50) {
        streak++; // Increase streak if the guess is reasonably close
        if (streak >= 3) {
            onFire = true; // **Enter "On Fire" mode after 3 correct guesses**
        }
        message = `✅ Correct! Your guess was ${Math.round(distance)} km away. You earned ${earnedPoints} points!`;
    } else {
        streak = 0; // **Streak resets on a bad guess**
        onFire = false;
        message = `❌ Wrong! Your guess was ${Math.round(distance)} km away. Streak reset!`;
        
        // ✅ MOVE MAP TO THE CORRECT LOCATION
        guessMap.flyTo(actualCoordinates, 4, {
            animate: true,
            duration: 2
        });
    }

    score += earnedPoints; // Add points based on accuracy

    // Display results
    document.getElementById('result').innerText = message;
    document.getElementById('score').innerText = `Score: ${score} | Streak: ${streak} 🔥 ${onFire ? "(ON FIRE!)" : ""}`;

    // ✅ Show correct location with marker
    correctMarker = L.marker(actualCoordinates, { icon: L.divIcon({ className: 'correct-marker', html: '✅' }) }).addTo(guessMap);

    // ✅ Draw circle showing accuracy level
    circle = L.circle(actualCoordinates, {
        color: color,
        fillColor: color,
        fillOpacity: 0.4,
        radius: distance * 1000 // Convert km to meters for circle radius
    }).addTo(guessMap);

    // Prevent further guesses until the next round
    canGuess = false;

    // Start the countdown for the next guess
    startCountdown();
});