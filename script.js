// !!! สำคัญ: แก้เป็น LIFF ID ของคุณ !!!
const liffId = "2007867348-RQ0pAK5j";
let allFreelancers = [], allJobs = {};
let currentUserProfile = null;
let currentRole = null; // 'client' or 'freelancer'

document.addEventListener('DOMContentLoaded', main);

async function main() {
    try {
        await liff.init({ liffId: liffId });
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        setupRoleSelection();
    } catch (error) {
        console.error("Initialization Failed:", error);
        alert("Initialization Failed. Please check console.");
    }
}

function setupRoleSelection() {
    const roleSelectionPage = document.getElementById('page-role-selection');
    const clientApp = document.getElementById('client-app');
    const freelancerApp = document.getElementById('freelancer-app');

    document.getElementById('client-button').addEventListener('click', () => {
        currentRole = 'client';
        roleSelectionPage.style.display = 'none';
        clientApp.style.display = 'block';
        startApp();
    });

    document.getElementById('freelancer-button').addEventListener('click', () => {
        currentRole = 'freelancer';
        roleSelectionPage.style.display = 'none';
        freelancerApp.style.display = 'block';
        startApp();
    });
}

async function startApp() {
    await loadAllData();
    setupEventListeners();
}

async function loadAllData() {
    await getUserProfile();
    if (currentRole === 'client') {
        await Promise.all([fetchFreelancers(), fetchMyJobs()]);
    } else if (currentRole === 'freelancer') {
        await Promise.all([fetchAllJobs(), fetchMyServices()]);
    }
}

function setupEventListeners() {
    const navId = `#nav-${currentRole}`;
    document.querySelectorAll(`${navId} button`).forEach(button => {
        button.addEventListener('click', () => navigateTo(button.dataset.page));
    });

    if (currentRole === 'client') {
        document.getElementById('search-box-client').addEventListener('input', filterFreelancers);
        const modal = document.getElementById('post-job-modal');
        document.getElementById('show-post-job-modal-button').addEventListener('click', () => modal.classList.add('visible'));
        modal.querySelector('.close-button').addEventListener('click', () => modal.classList.remove('visible'));
        document.getElementById('post-job-form').addEventListener('submit', handleJobPost);
    } else if (currentRole === 'freelancer') {
        const modal = document.getElementById('post-service-modal');
        document.getElementById('show-post-service-modal-button').addEventListener('click', () => modal.classList.add('visible'));
        modal.querySelector('.close-button').addEventListener('click', () => modal.classList.remove('visible'));
        document.getElementById('post-service-form').addEventListener('submit', handleServicePost);
    }
}

function navigateTo(pageId) {
    document.querySelectorAll(`#${currentRole}-app .page`).forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll(`#${currentRole}-app .bottom-nav button`).forEach(b => {
        b.classList.toggle('active', b.dataset.page === pageId);
    });
}

async function getUserProfile() {
    currentUserProfile = await liff.getProfile();
    const profileHtml = `
        <img src="${currentUserProfile.pictureUrl}" alt="Profile Picture">
        <h2>${currentUserProfile.displayName}</h2>
        <p><b>Status:</b> ${currentUserProfile.statusMessage || 'N/A'}</p><hr>
        <p><b>User ID:</b> ${currentUserProfile.userId}</p>
        <p><b>Email:</b> ${liff.getDecodedIDToken() ? liff.getDecodedIDToken().email : 'N/A'}</p>`;
    
    const profileContainerId = `profile-display-${currentRole}`;
    document.getElementById(profileContainerId).innerHTML = profileHtml;
}

// ========= CLIENT FUNCTIONS =========
async function handleJobPost(event) {
    event.preventDefault();
    const jobData = {
        clientId: currentUserProfile.userId, clientName: currentUserProfile.displayName,
        clientPicture: currentUserProfile.pictureUrl, title: document.getElementById('job-title').value,
        description: document.getElementById('job-description').value, category: document.getElementById('job-category').value,
        budget: parseInt(document.getElementById('job-budget').value, 10), postDate: new Date().toISOString().split('T')[0]
    };
    try {
        await firebase.database().ref('jobs').push(jobData);
        alert("Job posted successfully!");
        document.getElementById('post-job-form').reset();
        document.getElementById('post-job-modal').classList.remove('visible');
        fetchMyJobs();
    } catch (error) { console.error("Error posting job:", error); alert("Failed to post job."); }
}

async function fetchMyJobs() {
    const jobsRef = firebase.database().ref('jobs');
    const snapshot = await jobsRef.orderByChild('clientId').equalTo(currentUserProfile.userId).once('value');
    displayMyJobs(snapshot.val() || {});
}

function displayMyJobs(jobs) {
    const listEl = document.getElementById('my-jobs-list');
    listEl.innerHTML = '';
    if (Object.keys(jobs).length === 0) {
        listEl.innerHTML = "<p>You haven't posted any jobs yet.</p>"; return;
    }
    Object.entries(jobs).reverse().forEach(([jobId, job]) => {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-card-header">
                <h3>${job.title}</h3>
                <button class="delete-btn" data-id="${jobId}">&times;</button>
            </div>
            <p class="job-card-category">${job.category}</p>
            <span>Budget: ${job.budget} THB</span>
            <p class="job-card-description">${job.description}</p>
            <div class="job-card-footer">Posted on ${job.postDate}</div>`;
        card.querySelector('.delete-btn').addEventListener('click', () => handleJobDelete(jobId));
        listEl.appendChild(card);
    });
}

async function handleJobDelete(jobId) {
    if (confirm('Are you sure you want to delete this job post?')) {
        try {
            await firebase.database().ref('jobs/' + jobId).remove();
            alert('Job deleted successfully!');
            fetchMyJobs();
        } catch (error) { alert('Failed to delete job.'); console.error(error); }
    }
}

async function fetchFreelancers() {
    const snapshot = await firebase.database().ref('freelancers').once('value');
    allFreelancers = Object.values(snapshot.val() || {});
    displayFreelancers(allFreelancers);
    displayClientChats(allFreelancers);
}

function displayFreelancers(freelancers) {
    const listEl = document.getElementById('freelancer-list-client');
    listEl.innerHTML = '';
    if (freelancers.length === 0) { listEl.innerHTML = '<p>No freelancers found.</p>'; return; }
    freelancers.forEach(f => {
        const card = document.createElement('div');
        card.className = 'freelancer-card';
        card.innerHTML = `
            <img src="${f.image_url || 'https://via.placeholder.com/60'}" alt="${f.name}">
            <div class="freelancer-info">
                <h3>${f.name}</h3>
                <p>${f.skills || 'No skills listed'}</p>
                <a href="${f.portfolio_url}" target="_blank" class="portfolio-btn">View Portfolio</a>
            </div>`;
        listEl.appendChild(card);
    });
}

function filterFreelancers() {
    const searchTerm = document.getElementById('search-box-client').value.toLowerCase();
    const filtered = allFreelancers.filter(f => (f.skills && f.skills.toLowerCase().includes(searchTerm)));
    displayFreelancers(filtered);
}

function displayClientChats(freelancers) {
    const chatListContainer = document.getElementById('chat-list-container-client');
    chatListContainer.innerHTML = '';
    if (freelancers.length === 0) { chatListContainer.innerHTML = '<p>No one to chat with yet.</p>'; return; }
    freelancers.forEach(f => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.innerHTML = `<img src="${f.image_url}" alt="${f.name}"><div class="chat-info"><strong>${f.name}</strong><p>Freelancer</p></div><button class="contact-btn">Chat</button>`;
        chatListContainer.appendChild(chatItem);
    });
}

// ========= FREELANCER FUNCTIONS =========
async function handleServicePost(event) {
    event.preventDefault();
    const serviceData = {
        freelancerId: currentUserProfile.userId, freelancerName: currentUserProfile.displayName,
        freelancerPicture: currentUserProfile.pictureUrl, title: document.getElementById('service-title').value,
        description: document.getElementById('service-description').value, skills: document.getElementById('service-skills').value,
        portfolio_url: document.getElementById('service-portfolio').value, postDate: new Date().toISOString().split('T')[0]
    };
    try {
        await firebase.database().ref('services').push(serviceData);
        alert("Service posted successfully!");
        document.getElementById('post-service-form').reset();
        document.getElementById('post-service-modal').classList.remove('visible');
        fetchMyServices();
    } catch (error) { console.error("Error posting service:", error); alert("Failed to post service."); }
}

async function fetchMyServices() {
    const servicesRef = firebase.database().ref('services');
    const snapshot = await servicesRef.orderByChild('freelancerId').equalTo(currentUserProfile.userId).once('value');
    displayMyServices(snapshot.val() || {});
}

function displayMyServices(services) {
    const listEl = document.getElementById('my-services-list');
    listEl.innerHTML = '';
    if (Object.keys(services).length === 0) {
        listEl.innerHTML = "<p>You haven't posted any services yet.</p>"; return;
    }
    Object.entries(services).reverse().forEach(([serviceId, service]) => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <div class="job-card-header">
                <h3>${service.title}</h3>
                <button class="delete-btn" data-id="${serviceId}">&times;</button>
            </div>
            <p class="job-card-category">${service.skills}</p>
            <p class="job-card-description">${service.description}</p>
            <a href="${service.portfolio_url}" target="_blank" class="portfolio-btn">View Portfolio</a>`;
        card.querySelector('.delete-btn').addEventListener('click', () => handleServiceDelete(serviceId));
        listEl.appendChild(card);
    });
}

async function handleServiceDelete(serviceId) {
     if (confirm('Are you sure you want to delete this service?')) {
        try {
            await firebase.database().ref('services/' + serviceId).remove();
            alert('Service deleted successfully!');
            fetchMyServices();
        } catch (error) { alert('Failed to delete service.'); console.error(error); }
    }
}

async function fetchAllJobs() {
    const snapshot = await firebase.database().ref('jobs').once('value');
    allJobs = snapshot.val() || {};
    displayAllJobs(allJobs);
}

function displayAllJobs(jobs) {
    const listEl = document.getElementById('all-jobs-list');
    listEl.innerHTML = '';
    if (Object.keys(jobs).length === 0) {
        listEl.innerHTML = "<p>No jobs available right now.</p>"; return;
    }
    Object.values(jobs).reverse().forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-card-header"><h3>${job.title}</h3><span>Budget: ${job.budget} THB</span></div>
            <p class="job-card-category">${job.category}</p>
            <p class="job-card-description">${job.description}</p>
            <div class="job-card-client-info">
                <img src="${job.clientPicture}" alt="${job.clientName}">
                <span>Posted by ${job.clientName}</span>
            </div>
            <button class="apply-btn">Apply Now</button>`;
        listEl.appendChild(card);
    });
}
