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

    // Fetch work history when freelancer navigates to their profile
    if (pageId === 'page-freelancer-profile') {
        fetchMyWorkHistory();
    }
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
        budget: parseInt(document.getElementById('job-budget').value, 10), postDate: new Date().toISOString().split('T')[0],
        status: 'open' // Initial status
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

        let applicantsSection = '';
        if (job.status === 'assigned') {
            applicantsSection = `
                <div class="job-status-assigned">
                    <img src="${job.hiredFreelancerPicture}" alt="${job.hiredFreelancerName}">
                    <span>Hired: <strong>${job.hiredFreelancerName}</strong></span>
                </div>`;
        } else {
            applicantsSection = `
                <div class="applicants-section" id="applicants-container-${jobId}">
                     <button class="view-applicants-btn" data-job-id="${jobId}">View Applicants</button>
                </div>`;
        }

        card.innerHTML = `
            <div class="job-card-header">
                <h3>${job.title}</h3>
                <button class="delete-btn" data-id="${jobId}">&times;</button>
            </div>
            <p class="job-card-category">${job.category}</p>
            <span>Budget: ${job.budget} THB</span>
            <p class="job-card-description">${job.description}</p>
            <div class="job-card-footer">Posted on ${job.postDate}</div>
            ${applicantsSection}`;
            
        card.querySelector('.delete-btn').addEventListener('click', () => handleJobDelete(jobId));
        if (job.status !== 'assigned') {
            card.querySelector('.view-applicants-btn').addEventListener('click', () => showApplicants(jobId, job.title));
        }
        listEl.appendChild(card);
    });
}

async function showApplicants(jobId, jobTitle) {
    const applicantsRef = firebase.database().ref(`applications/${jobId}`);
    const container = document.getElementById(`applicants-container-${jobId}`);
    container.innerHTML = `<div class="loader">Loading applicants...</div>`;

    try {
        const snapshot = await applicantsRef.once('value');
        const applicants = snapshot.val();

        if (!applicants) {
            container.innerHTML = "<p>No applications for this job yet.</p>"; return;
        }

        let applicantsHtml = '<h4>Applicants:</h4><div class="applicant-list">';
        Object.entries(applicants).forEach(([freelancerId, applicant]) => {
            // Add all applicant data as data-* attributes for the hire function
            applicantsHtml += `
                <div class="applicant-item">
                    <img src="${applicant.freelancerPicture}" alt="${applicant.freelancerName}">
                    <span>${applicant.freelancerName}</span>
                    <button class="contact-applicant-btn" data-freelancer-name="${applicant.freelancerName}" data-job-title="${jobTitle}">Contact</button>
                    <button class="hire-btn" 
                        data-job-id="${jobId}" 
                        data-freelancer-id="${freelancerId}" 
                        data-freelancer-name="${applicant.freelancerName}" 
                        data-freelancer-picture="${applicant.freelancerPicture}">Hire</button>
                </div>`;
        });
        applicantsHtml += '</div>';
        container.innerHTML = applicantsHtml;

        container.querySelectorAll('.contact-applicant-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                 const { freelancerName, jobTitle } = event.target.dataset;
                 if (liff.isApiAvailable('shareTargetPicker')) {
                    liff.shareTargetPicker([{ type: 'text', text: `Hello ${freelancerName}, I'd like to discuss the job "${jobTitle}" you applied for.` }])
                        .catch((error) => console.error('Share Target Picker error:', error));
                 }
            });
        });
        container.querySelectorAll('.hire-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                 const { jobId, freelancerId, freelancerName, freelancerPicture } = event.target.dataset;
                 handleHire(jobId, freelancerId, freelancerName, freelancerPicture);
            });
        });

    } catch (error) {
        console.error("Error fetching applicants:", error);
        container.innerHTML = "<p>Error loading applicants.</p>";
    }
}

async function handleHire(jobId, freelancerId, freelancerName, freelancerPicture) {
    if (!confirm(`Are you sure you want to hire ${freelancerName} for this job? This will close the job to other applicants.`)) {
        return;
    }
    const updates = {};
    updates[`/jobs/${jobId}/status`] = 'assigned';
    updates[`/jobs/${jobId}/hiredFreelancerId`] = freelancerId;
    updates[`/jobs/${jobId}/hiredFreelancerName`] = freelancerName;
    updates[`/jobs/${jobId}/hiredFreelancerPicture`] = freelancerPicture;
    updates[`/applications/${jobId}/${freelancerId}/status`] = 'hired';

    try {
        await firebase.database().ref().update(updates);
        alert(`${freelancerName} has been hired!`);
        fetchMyJobs(); // Refresh the job list
    } catch (error) {
        console.error("Failed to hire freelancer:", error);
        alert("Error: Could not complete the hiring process.");
    }
}

async function handleJobDelete(jobId) {
    if (confirm('Are you sure you want to delete this job post?')) {
        try {
            await firebase.database().ref('jobs/' + jobId).remove();
            await firebase.database().ref('applications/' + jobId).remove();
            alert('Job deleted successfully!');
            fetchMyJobs();
        } catch (error) { alert('Failed to delete job.'); console.error(error); }
    }
}

async function fetchFreelancers() {
    const snapshot = await firebase.database().ref('services').once('value');
    const services = snapshot.val() || {};
    const freelancersMap = new Map();
    Object.values(services).forEach(service => {
        if (!freelancersMap.has(service.freelancerId)) {
            freelancersMap.set(service.freelancerId, {
                id: service.freelancerId, name: service.freelancerName, image_url: service.freelancerPicture,
                skills: service.skills, portfolio_url: service.portfolio_url
            });
        }
    });
    allFreelancers = Array.from(freelancersMap.values());
    displayFreelancers(allFreelancers);
    displayClientChats(allFreelancers);
}

function displayFreelancers(freelancers) {
    const listEl = document.getElementById('freelancer-list-client');
    listEl.innerHTML = '';
    if (freelancers.length === 0) { listEl.innerHTML = '<p>No freelancers found. Tip: Freelancers appear here after they post a service.</p>'; return; }
    freelancers.forEach(f => {
        const card = document.createElement('div');
        card.className = 'freelancer-card';
        card.innerHTML = `<img src="${f.image_url || 'https://via.placeholder.com/60'}" alt="${f.name}"><div class="freelancer-info"><h3>${f.name}</h3><p>${f.skills || 'No skills listed'}</p><a href="${f.portfolio_url}" target="_blank" class="portfolio-btn">View Portfolio</a></div>`;
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
    if (Object.keys(services).length === 0) { listEl.innerHTML = "<p>You haven't posted any services yet.</p>"; return; }
    Object.entries(services).reverse().forEach(([serviceId, service]) => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `<div class="job-card-header"><h3>${service.title}</h3><button class="delete-btn" data-id="${serviceId}">&times;</button></div><p class="job-card-category">${service.skills}</p><p class="job-card-description">${service.description}</p><a href="${service.portfolio_url}" target="_blank" class="portfolio-btn">View Portfolio</a>`;
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
    const jobsSnapshot = await firebase.database().ref('jobs').once('value');
    allJobs = jobsSnapshot.val() || {};
    // Also fetch all of my applications to check status efficiently
    const myAppsSnapshot = await firebase.database().ref('applications').orderByKey().once('value');
    const myApps = myAppsSnapshot.val() || {};
    displayAllJobs(allJobs, myApps);
}

function displayAllJobs(jobs, myApps) {
    const listEl = document.getElementById('all-jobs-list');
    listEl.innerHTML = '';
    if (Object.keys(jobs).length === 0) { listEl.innerHTML = "<p>No jobs available right now.</p>"; return; }

    Object.entries(jobs).reverse().forEach(([jobId, job]) => {
        const card = document.createElement('div');
        card.className = 'job-card';

        let actionButtonHtml = '';
        const myApplication = myApps[jobId] ? myApps[jobId][currentUserProfile.userId] : null;

        if (job.status === 'assigned') {
            if (job.hiredFreelancerId === currentUserProfile.userId) {
                actionButtonHtml = `<div class="application-status"><span>🎉 You were hired for this job!</span></div>`;
            } else {
                actionButtonHtml = `<div class="application-status"><span>Job Closed</span></div>`;
            }
        } else if (myApplication) {
            actionButtonHtml = `
                <div class="application-status">
                    <span>✓ Application Sent</span>
                    <button class="cancel-apply-btn" data-job-id="${jobId}">Cancel</button>
                </div>`;
        } else {
            actionButtonHtml = `<button class="apply-btn" data-job-id="${jobId}">Apply Now</button>`;
        }
        
        card.innerHTML = `
            <div class="job-card-header"><h3>${job.title}</h3><span>Budget: ${job.budget} THB</span></div>
            <p class="job-card-category">${job.category}</p>
            <p class="job-card-description">${job.description}</p>
            <div class="job-card-client-info"><img src="${job.clientPicture}" alt="${job.clientName}"><span>Posted by ${job.clientName}</span></div>
            ${actionButtonHtml}`;

        const applyBtn = card.querySelector('.apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', (e) => handleJobApply(e, jobId));
        }
        const cancelBtn = card.querySelector('.cancel-apply-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => handleCancelApplication(e, jobId));
        }

        listEl.appendChild(card);
    });
}

async function handleJobApply(event, jobId) {
    const applyButton = event.target;
    applyButton.disabled = true;
    applyButton.textContent = 'Applying...';

    const applicationRef = firebase.database().ref(`applications/${jobId}/${currentUserProfile.userId}`);

    try {
        await applicationRef.set({
            freelancerName: currentUserProfile.displayName,
            freelancerPicture: currentUserProfile.pictureUrl,
            applicationDate: new Date().toISOString(),
            status: 'applied'
        });
        alert("Application submitted successfully!");
        fetchAllJobs(); // Refresh the list to show the "Cancel" button
    } catch (error) {
        console.error("Error applying for job:", error);
        alert("Failed to submit application.");
        applyButton.disabled = false;
        applyButton.textContent = 'Apply Now';
    }
}

async function handleCancelApplication(event, jobId) {
    if (!confirm("Are you sure you want to cancel your application?")) return;
    
    const cancelButton = event.target;
    cancelButton.disabled = true;
    cancelButton.textContent = 'Cancelling...';

    const applicationRef = firebase.database().ref(`applications/${jobId}/${currentUserProfile.userId}`);
    try {
        await applicationRef.remove();
        alert("Application cancelled.");
        fetchAllJobs(); // Refresh the list
    } catch (error) {
        console.error("Error cancelling application:", error);
        alert("Failed to cancel application.");
        cancelButton.disabled = false;
        cancelButton.textContent = 'Cancel';
    }
}

async function fetchMyWorkHistory() {
    const historyListEl = document.getElementById('work-history-list');
    historyListEl.innerHTML = '<div class="loader">Loading history...</div>';
    
    const jobsRef = firebase.database().ref('jobs');
    try {
        const snapshot = await jobsRef.orderByChild('hiredFreelancerId').equalTo(currentUserProfile.userId).once('value');
        const myJobs = snapshot.val();
        
        if (!myJobs || Object.keys(myJobs).length === 0) {
            historyListEl.innerHTML = "<p>You have no completed or hired jobs yet.</p>";
            return;
        }

        historyListEl.innerHTML = '';
        Object.values(myJobs).reverse().forEach(job => {
            const card = document.createElement('div');
            card.className = 'job-card'; // Reuse job-card style
            card.innerHTML = `
                <h3>${job.title}</h3>
                <p class="job-card-category">${job.category}</p>
                <p>Budget: ${job.budget} THB</p>
                <div class="job-card-client-info" style="margin-top: 10px;">
                    <img src="${job.clientPicture}" alt="${job.clientName}">
                    <span>Hired by: <strong>${job.clientName}</strong></span>
                </div>`;
            historyListEl.appendChild(card);
        });

    } catch(error) {
        console.error("Error fetching work history:", error);
        historyListEl.innerHTML = '<p>Could not load work history.</p>';
    }
}
