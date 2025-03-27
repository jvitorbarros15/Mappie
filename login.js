import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { provider } from "./firebase.js";

document.addEventListener("DOMContentLoaded", function () {
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const googleLoginBtn = document.getElementById("google-login-btn");
  const signupLink = document.getElementById("signup-link");
  const loginLink = document.getElementById("login-link");

  // Login Function
  loginBtn.onclick = async function () {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      Swal.fire("Success", "Logged in successfully!", "success");
      updateUI(userCredential.user);
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  // Register Function
  registerBtn.onclick = async function () {
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      Swal.fire("Success", "Account created successfully!", "success");
      updateUI(userCredential.user);
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  // Google Login Function
  googleLoginBtn.onclick = async function () {
    try {
      const result = await signInWithPopup(auth, provider);
      Swal.fire("Success", "Logged in with Google!", "success");
      updateUI(result.user);
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  // Logout Function
  window.logout = async function () {
    try {
      await auth.signOut();
      Swal.fire("Success", "Logged out successfully!", "success");
      updateUI(null);
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
  };

  // Navigation between Login and Sign-Up
  signupLink.addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("signup-container").style.display = "flex";
  });

  loginLink.addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("signup-container").style.display = "none";
    document.getElementById("auth-container").style.display = "flex";
  });

  // Update UI based on user state
  function updateUI(user) {
    if (user) {
      document.getElementById("auth-container").style.display = "none";
      document.getElementById("signup-container").style.display = "none";
      document.getElementById("profile-container").style.display = "block";
      document.getElementById("game-container").style.display = "block";
      document.getElementById("user-email").innerText = user.email;
    } else {
      document.getElementById("auth-container").style.display = "block";
      document.getElementById("signup-container").style.display = "none";
      document.getElementById("profile-container").style.display = "none";
      document.getElementById("game-container").style.display = "none";
    }
  }

  // Listen for auth state changes
  auth.onAuthStateChanged(user => updateUI(user));
});
