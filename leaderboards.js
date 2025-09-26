// leaderboards.js

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBdDwCslP5RGHi37xjFo89x8rY3kKbhUwQ",
    authDomain: "semulight-db.firebaseapp.com",
    projectId: "semulight-db",
    storageBucket: "semulight-db.firebasestorage.app",
    messagingSenderId: "693934626490",
    appId: "1:693934626490:web:87c36c26026509f86f1483",
    measurementId: "G-QFFLDWLW2L"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const signUpBtn = document.getElementById('signUpBtn');
const logInBtn = document.getElementById('logInBtn');
const logOutBtn = document.getElementById('logOutBtn');
const userRole = document.getElementById('userRole');
const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".nav-links");
const leaderboardBody = document.getElementById('leaderboard-body');
const stateFilter = document.getElementById('state-filter');
const eventFilter = document.getElementById('event-filter');
const timeframeButtons = document.querySelectorAll('.timeframe-btn');
const viewButtons = document.querySelectorAll('.view-btn');
const topDonorName = document.getElementById('top-donor-name');
const topDonorAmount = document.getElementById('top-donor-amount');
const adminInfo = document.getElementById('admin-info');

// Current user data
let currentUser = null;
let currentUserRole = null;
let allDonations = [];
let allEvents = [];
let allUsers = {};
let currentTimeframe = 'all';
let currentView = 'quantity';

// Navigation scroll behavior
let lastScrollTop = 0;
const nav = document.querySelector('nav');

window.addEventListener('scroll', function () {
    let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    if (currentScroll > lastScrollTop && currentScroll > 100) {
        nav.style.top = '-100px';
    } else {
        nav.style.top = '0';
    }
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
});

// Hamburger menu functionality
hamburger.addEventListener("click", function() {
    navLinks.classList.toggle("active");
});

// Check if user is logged in and get role
auth.onAuthStateChanged(async function (user) {
    if (user) {
        currentUser = user;

        // User is signed in
        signUpBtn.style.display = 'none';
        logInBtn.style.display = 'none';
        logOutBtn.style.display = 'inline-block';
        userRole.style.display = 'inline-block';

        // Get user role from Firestore
        try {
            const userDoc = await db.collection("users").doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                currentUserRole = userData.role || 'user';
                userRole.textContent = currentUserRole === 'admin' ? 'Admin' : 'User';
                
                // Show admin info if user is admin
                if (currentUserRole === 'admin') {
                    adminInfo.style.display = 'block';
                }
            } else {
                currentUserRole = 'user';
                userRole.textContent = 'User';
            }
        } catch (error) {
            console.error("Error getting user document:", error);
            currentUserRole = 'user';
            userRole.textContent = 'User';
        }
    } else {
        // User is signed out
        currentUser = null;
        currentUserRole = null;

        signUpBtn.style.display = 'inline-block';
        logInBtn.style.display = 'inline-block';
        logOutBtn.style.display = 'none';
        userRole.style.display = 'none';
        adminInfo.style.display = 'none';
    }
    
    // Load data regardless of login status
    await loadLeaderboardData();
});

// Log out functionality
logOutBtn.addEventListener('click', function () {
    auth.signOut().then(function() {
        currentUser = null;
        currentUserRole = null;
        window.location.href = "menu.html";
    }).catch(function(error) {
        console.error("Error signing out:", error);
    });
});

// Timeframe buttons
timeframeButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
        timeframeButtons.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        currentTimeframe = this.getAttribute('data-timeframe');
        updateLeaderboard();
    });
});

// View buttons
viewButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
        viewButtons.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        currentView = this.getAttribute('data-view');
        updateLeaderboard();
    });
});

// Filter change events
stateFilter.addEventListener('change', updateLeaderboard);
eventFilter.addEventListener('change', updateLeaderboard);

// Load leaderboard data
async function loadLeaderboardData() {
    try {
        // Load all users data first
        await loadAllUsers();
        
        // Load events for filter
        await loadEvents();
        
        // Load donations
        const querySnapshot = await db.collection("donations").orderBy("timestamp", "desc").get();
        allDonations = [];
        
        querySnapshot.forEach(function(doc) {
            const donationData = doc.data();
            donationData.id = doc.id;
            
            // Find event name for this donation
            const event = allEvents.find(function(e) { return e.id === donationData.eventId; });
            donationData.eventName = event ? event.name : 'Unknown Event';
            
            allDonations.push(donationData);
        });
        
        console.log(`Loaded ${allDonations.length} donations for leaderboard`);
        updateLeaderboard();
        
    } catch (error) {
        console.error("Error loading leaderboard data:", error);
        leaderboardBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">Error loading leaderboard data. Please try again later.</td></tr>';
    }
}

// Load all users data
async function loadAllUsers() {
    try {
        const querySnapshot = await db.collection("users").get();
        allUsers = {};
        
        querySnapshot.forEach(function(doc) {
            allUsers[doc.id] = doc.data();
        });
        
        console.log(`Loaded ${Object.keys(allUsers).length} users for leaderboard`);
    } catch (error) {
        console.error("Error loading users data:", error);
    }
}

// Load events for filter
async function loadEvents() {
    try {
        const querySnapshot = await db.collection("events").get();
        allEvents = [];
        
        // Keep "All Events" option
        eventFilter.innerHTML = '<option value="all">All Events</option>';
        
        querySnapshot.forEach(function(doc) {
            const eventData = doc.data();
            eventData.id = doc.id;
            allEvents.push(eventData);
            
            // Add to filter dropdown
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = eventData.name;
            eventFilter.appendChild(option);
        });
        
    } catch (error) {
        console.error("Error loading events:", error);
    }
}

// Calculate points from user profile
function getUserProfilePoints(userId) {
    if (allUsers[userId] && allUsers[userId].points) {
        return allUsers[userId].points;
    }
    return 0;
}

// Calculate points based on event participation from donations
function calculateEventParticipationPoints(uniqueEventsCount) {
    let points = 0;
    
    // 1 point for each unique event participation
    points += uniqueEventsCount;
    
    // Bonus: 10 points for 5 or more different events
    if (uniqueEventsCount >= 5) {
        points += 10;
    }
    
    return points;
}

// Update leaderboard based on filters - FIXED: Don't double-count donation points
async function updateLeaderboard() {
    // Apply filters
    const selectedState = stateFilter.value;
    const selectedEvent = eventFilter.value;
    
    let filteredDonations = [...allDonations];
    
    // Filter by state
    if (selectedState !== 'all') {
        filteredDonations = filteredDonations.filter(function(d) { return d.state === selectedState; });
    }
    
    // Filter by event
    if (selectedEvent !== 'all') {
        filteredDonations = filteredDonations.filter(function(d) { return d.eventId === selectedEvent; });
    }
    
    // Filter by timeframe
    if (currentTimeframe !== 'all') {
        const now = new Date();
        let startDate;
        
        if (currentTimeframe === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (currentTimeframe === 'week') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        
        filteredDonations = filteredDonations.filter(function(d) {
            if (!d.timestamp) return false;
            const donationDate = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
            return donationDate >= startDate;
        });
    }
    
    console.log(`Filtered to ${filteredDonations.length} donations`);
    
    // Group donations by individual person (name + phone combination)
    const userStats = {};
    
    filteredDonations.forEach(function(donation) {
        // Create a unique key for each individual person
        const userKey = `${donation.name || 'Anonymous'}_${donation.phone || 'NoPhone'}`;
        
        if (!userStats[userKey]) {
            userStats[userKey] = {
                name: donation.name || 'Anonymous Donor',
                phone: donation.phone || 'N/A',
                totalQuantity: 0,
                totalValue: 0,
                userProfilePoints: 0,
                eventParticipationPoints: 0,
                totalPoints: 0,
                events: new Set(), // Track unique event IDs
                donations: 0,
                userId: donation.userId || null
            };
            
            // Add user profile points if we have user ID
            if (donation.userId && allUsers[donation.userId]) {
                userStats[userKey].userProfilePoints = allUsers[donation.userId].points || 0;
            }
        }
        
        // Add this donation to the person's totals
        userStats[userKey].totalQuantity += parseFloat(donation.quantity) || 0;
        userStats[userKey].totalValue += parseTotalValue(donation.total) || 0;
        
        // Add event ID to track unique event participation
        if (donation.eventId) {
            userStats[userKey].events.add(donation.eventId);
        }
        
        userStats[userKey].donations += 1;
    });
    
    // Calculate points for each user - FIXED: Don't double-count donation points
    Object.keys(userStats).forEach(function(userKey) {
        const user = userStats[userKey];
        const uniqueEventsCount = user.events.size;
        
        // Calculate points from event participation only
        user.eventParticipationPoints = calculateEventParticipationPoints(uniqueEventsCount);
        
        // Total points = user profile points (which already include donation points) + event participation points
        user.totalPoints = user.userProfilePoints + user.eventParticipationPoints;
    });
    
    // Convert to array and sort
    const userArray = Object.values(userStats);
    
    if (currentView === 'quantity') {
        userArray.sort(function(a, b) { return b.totalQuantity - a.totalQuantity; });
    } else if (currentView === 'value') {
        userArray.sort(function(a, b) { return b.totalValue - a.totalValue; });
    } else {
        userArray.sort(function(a, b) { return b.totalPoints - a.totalPoints; });
    }
    
    // Update leaderboard table
    displayLeaderboard(userArray);
    
    // Update top donor info
    updateTopDonorInfo(userArray);
}

// Parse total value from string or number
function parseTotalValue(value) {
    if (typeof value === 'string') {
        return parseFloat(value.replace('RM ', '').replace(',', '')) || 0;
    }
    return parseFloat(value) || 0;
}

// Display leaderboard in table - FIXED: Removed points breakdown display
function displayLeaderboard(users) {
    leaderboardBody.innerHTML = '';
    
    if (users.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">No donations found for the selected filters.</td></tr>';
        return;
    }
    
    users.forEach(function(user, index) {
        const rank = index + 1;
        const row = document.createElement('tr');
        
        // Add special classes for top 3
        if (rank === 1) row.classList.add('top-1');
        if (rank === 2) row.classList.add('top-2');
        if (rank === 3) row.classList.add('top-3');
        
        // Create user avatar from initials
        const initials = user.name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().substring(0, 2);
        
        // Show phone number only if user is admin
        const phoneDisplay = currentUserRole === 'admin' ? user.phone : '***';
        
        // Determine which badge to show based on current view
        let rankBadge = '';
        if (rank === 1) {
            rankBadge = '<span class="badge badge-gold">Top Donor</span>';
        } else if (rank === 2) {
            rankBadge = '<span class="badge badge-silver">2nd</span>';
        } else if (rank === 3) {
            rankBadge = '<span class="badge badge-bronze">3rd</span>';
        }
        
        // Points breakdown tooltip - FIXED: Removed donation quantity points
        const uniqueEventsCount = user.events.size;
        const pointsBreakdown = `
Points Breakdown:
- User Profile: ${user.userProfilePoints} pts (signup, quiz, donations, etc.)
- Event Participation: ${user.eventParticipationPoints} pts (${uniqueEventsCount} events)
= TOTAL: ${user.totalPoints} points
        `.trim();
        
        row.innerHTML = `
            <td class="rank-cell">
                ${rank <= 3 ? '' : rank}
                ${rank === 1 ? '<i class="fas fa-crown"></i>' : ''}
            </td>
            <td>
                <div class="user-cell">
                    <div class="user-avatar">${initials}</div>
                    <div>
                        <div class="user-name">${user.name}</div>
                        <div class="contact-info">${phoneDisplay}</div>
                    </div>
                </div>
            </td>
            <td class="quantity-cell">
                ${user.totalQuantity.toFixed(2)} kg
                ${currentView === 'quantity' ? rankBadge : ''}
            </td>
            <td class="value-cell">RM ${user.totalValue.toFixed(2)}</td>
            <td class="points-cell" title="${pointsBreakdown}">
                <strong>${user.totalPoints} pts</strong>
                ${currentView === 'points' ? rankBadge : ''}
            </td>
            <td>${uniqueEventsCount} <span class="badge badge-green">Events</span></td>
        `;
        
        leaderboardBody.appendChild(row);
    });
}

// Update top donor information
function updateTopDonorInfo(users) {
    if (users.length > 0) {
        const topDonor = users[0];
        topDonorName.textContent = topDonor.name;
        
        if (currentView === 'quantity') {
            topDonorAmount.textContent = `${topDonor.totalQuantity.toFixed(2)} kg`;
        } else if (currentView === 'value') {
            topDonorAmount.textContent = `RM ${topDonor.totalValue.toFixed(2)}`;
        } else {
            topDonorAmount.textContent = `${topDonor.totalPoints} points`;
        }
    } else {
        topDonorName.textContent = '-';
        topDonorAmount.textContent = '-';
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Add any initialization code here if needed
});