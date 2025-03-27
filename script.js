import { auth, db } from "./firebase.js";

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
let canGuess = true;
let currentUser = null; // Store logged-in user

// 🔹 Check if user is logged in before allowing gameplay
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("✅ User logged in:", user.email);
    currentUser = user;
    try {
      await loadUserScore(user.uid);
    } catch (error) {
      console.error("Error loading user score:", error);
    }
  } else {
    console.log("❌ No user logged in.");
    // Prevent redirect loop
    if (!window.location.pathname.endsWith("index.html")) {
      window.location.href = "index.html"; // Redirect to login page
    }
  }
});

// 🔹 Load User Score from Firestore
async function loadUserScore(userId) {
  try {
    const docRef = db.collection("users").doc(userId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      score = docSnap.data().score || 0;
      streak = docSnap.data().streak || 0;
      updateScoreDisplay();
    } else {
      console.warn("No user data found in Firestore.");
    }
  } catch (error) {
    console.error("Error fetching user score:", error);
    throw error;
  }
}

// 🔹 Update Score Display
function updateScoreDisplay() {
  document.getElementById("score").innerText = `Score: ${score} | Streak: ${streak} 🔥 ${onFire ? "(ON FIRE!)" : ""}`;
}

// 🔹 Initialize the game when DOM is ready
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

// 🔹 Initialize the map
function initializeMap() {
  guessMap = L.map("guess-map").setView([20, 0], 2);

  // Borderless map with no country labels
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.carto.com/">CARTO</a>',
    maxZoom: 18,
  }).addTo(guessMap);

  // Create a custom control for the countdown
  countdownControl = L.control({ position: "topright" });
  countdownControl.onAdd = function () {
    this._div = L.DomUtil.create("div", "countdown");
    this.update(); // Initialize the countdown display
    return this._div;
  };
  countdownControl.update = function (time) {
    this._div.innerHTML = time ? `Next guess in: ${time} seconds` : "";
  };
  countdownControl.addTo(guessMap);

  guessMap.whenReady(() => {
    guessMap.on("click", function (e) {
      placeMarker(e.latlng);
    });
  });

  fetchCountries();
}

// 🔹 Place or move the marker
function placeMarker(latlng) {
  if (!userMarker) {
    userMarker = L.marker(latlng).addTo(guessMap);
  } else {
    userMarker.setLatLng(latlng);
  }
}

// 🔹 Fetch country data
async function fetchCountries() {
  try {
    const response = await fetch("https://restcountries.com/v3.1/all");
    const data = await response.json();

    countries = data
      .map((country) => ({
        name: country.name.common,
        coordinates: country.latlng ? country.latlng : [0, 0],
        flag: country.flags.svg,
      }))
      .filter((country) => country.coordinates.length === 2);

    console.log("Loaded countries:", countries);
    startGame();
  } catch (error) {
    console.error("Error fetching countries:", error);
    Swal.fire("Error", "Failed to load country data. Please try again later.", "error");
  }
}

// 🔹 Start a new round
function startGame() {
  if (countries.length === 0) {
    console.error("No country data available.");
    return;
  }

  // Pick a new random country
  currentCountry = countries[Math.floor(Math.random() * countries.length)];
  document.getElementById("country-name").innerHTML = `
    <img src="${currentCountry.flag}" alt="Flag of ${currentCountry.name}" style="width: 30px; height: auto; vertical-align: middle; margin-right: 10px;">
    ${currentCountry.name}`;
  document.getElementById("result").innerText = "";
  updateScoreDisplay();

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

  // Reset countdown
  clearInterval(countdownTimer);
  countdownControl.update("");
  canGuess = true; // Allow guessing again
}

// 🔹 Handle guess submission
document.getElementById("submit-guess").addEventListener("click", () => {
  if (!canGuess) {
    Swal.fire("Warning", "You can only guess once per round!", "warning");
    return;
  }

  if (!userMarker) {
    Swal.fire("Warning", "Please place a pin on the map before submitting your guess!", "warning");
    return;
  }

  const userGuess = userMarker.getLatLng();
  const actualCoordinates = L.latLng(currentCountry.coordinates[0], currentCountry.coordinates[1]);

  // Calculate distance
  const distance = userGuess.distanceTo(actualCoordinates) / 1000; // Convert meters to km

  // Scoring logic
  let earnedPoints;
  let color;

  if (distance < 100) {
    earnedPoints = onFire ? 150 : 100;
    color = "blue";
  } else if (distance < 500) {
    earnedPoints = onFire ? 115 : 75;
    color = "green";
  } else if (distance < 1500) {
    earnedPoints = onFire ? 80 : 50;
    color = "yellow";
  } else if (distance < 3000) {
    earnedPoints = onFire ? 40 : 25;
    color = "orange";
  } else {
    earnedPoints = 10;
    color = "red";
  }

  let message;

  if (earnedPoints >= 50) {
    streak++;
    if (streak >= 3) {
      onFire = true;
    }
    message = `✅ Correct! Your guess was ${Math.round(distance)} km away. You earned ${earnedPoints} points!`;
  } else {
    streak = 0;
    onFire = false;
    message = `❌ Wrong! Your guess was ${Math.round(distance)} km away. Streak reset!`;
  }

  score += earnedPoints;
  updateScoreDisplay();

  // Show correct location
  correctMarker = L.marker(actualCoordinates, { icon: L.divIcon({ className: "correct-marker", html: "✅" }) }).addTo(guessMap);
  circle = L.circle(actualCoordinates, {
    color: color,
    fillColor: color,
    fillOpacity: 0.4,
    radius: distance * 1000,
  }).addTo(guessMap);

  canGuess = false;
  startCountdown();
});

// 🔹 Start the countdown for the next guess
function startCountdown() {
  timeLeft = 5;
  countdownControl.update(timeLeft);

  clearInterval(countdownTimer);

  countdownTimer = setInterval(() => {
    timeLeft--;
    countdownControl.update(timeLeft);

    if (timeLeft <= 0) {
      clearInterval(countdownTimer);
      countdownControl.update("");
      startGame();
    }
  }, 1000);
}