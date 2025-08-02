// !!! สำคัญ: แก้เป็น LIFF ID ของคุณ !!!
const liffId = "2007867348-RQ0pAK5j"; 
let allFreelancers = [];
let currentUserProfile = null;

// --- ฟังก์ชันหลักที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จ ---
document.addEventListener('DOMContentLoaded', function () {
    // 1. ตั้งค่าปุ่มเลือก Role ทันที ไม่ต้องรอ LIFF
    setupRoleSelection();
    
    // 2. ตั้งค่า Event Listener อื่นๆ ที่ไม่เกี่ยวกับ LIFF
    setupStaticEventListeners();
});

// --- ฟังก์ชันสำหรับตั้งค่าปุ่มเลือก Role ---
function setupRoleSelection() {
    const roleSelectionPage = document.getElementById('page-role-selection');
    const mainApp = document.getElementById('main-app');
    const clientButton = document.getElementById('client-button');

    clientButton.addEventListener('click', () => {
        // เมื่อกดปุ่ม ให้สลับหน้าและ "ค่อย" เริ่มแอป LIFF
        roleSelectionPage.style.display = 'none';
        mainApp.style.display = 'block';
        startLiffApp(); // <--- เรียกฟังก์ชันเพื่อเริ่มแอปหลัก
    });
}

// --- ฟังก์ชันสำหรับเริ่มแอป LIFF หลัก (จะถูกเรียกหลังกดปุ่ม) ---
async function startLiffApp() {
    try {
        await liff.init({ liffId: liffId });

        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }

        // โหลดข้อมูลทั้งหมดหลังจาก LIFF พร้อมใช้งาน
        await Promise.all([
            getUserProfile(),
            fetchFreelancers()
        ]);

    } catch (e) {
        console.error('LIFF Initialization failed', e);
        alert('LIFF Initialization failed. Error: ' + JSON.stringify(e));
    }
}

// --- ฟังก์ชันสำหรับ Event Listener ที่ไม่ขึ้นกับ LIFF ---
function setupStaticEventListeners() {
    const navButtons = document.querySelectorAll('.bottom-nav button');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const pageId = button.dataset.page;
            navigateTo(pageId);
        });
    });

    document.getElementById('back-to-chat-list').addEventListener('click', () => {
        navigateTo('page-chat');
    });

    const searchBox = document.getElementById('search-box');
    if (searchBox) {
        searchBox.addEventListener('input', filterFreelancers);
    }
    
    // ตั้งค่า Modal
    const modal = document.getElementById('post-job-modal');
    const showModalButton = document.getElementById('show-post-job-modal-button');
    const closeModalButton = document.getElementById('close-modal-button');
    const jobForm = document.getElementById('post-job-form');

    showModalButton.addEventListener('click', () => modal.classList.add('visible'));
    closeModalButton.addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('visible');
        }
    });
    jobForm.addEventListener('submit', handleJobPost);
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    document.querySelector('.bottom-nav').style.display = pageId === 'page-chat-room' ? 'none' : 'flex';
}

// --- ฟังก์ชันดึงโปรไฟล์ ---
async function getUserProfile() {
    try {
        currentUserProfile = await liff.getProfile();
        document.getElementById('pictureUrl').src = currentUserProfile.pictureUrl;
        document.getElementById('userId').innerHTML = `<b>User ID:</b> ${currentUserProfile.userId}`;
        document.getElementById('displayName').innerText = currentUserProfile.displayName;
        document.getElementById('statusMessage').innerHTML = `<b>Status:</b> ${currentUserProfile.statusMessage || 'ไม่มีข้อความสถานะ'}`;

        if (liff.getDecodedIDToken()) {
            document.getElementById('email').innerHTML = `<b>Email:</b> ${liff.getDecodedIDToken().email}`;
        }
    } catch(err) {
        console.error("Error getting profile:", err);
    }
}

// --- ฟังก์ชันจัดการข้อมูลฟรีแลนซ์ ---
async function fetchFreelancers() {
    try {
        const database = firebase.database();
        const snapshot = await database.ref('freelancers').once('value');
        const freelancersData = snapshot.val();
        allFreelancers = Object.values(freelancersData || {});
        displayFreelancers(allFreelancers);
        displayChats();
    } catch (error) {
        console.error('Failed to fetch freelancers', error);
        document.getElementById('freelancer-list').innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

function displayFreelancers(freelancers) {
    const listElement = document.getElementById('freelancer-list');
    listElement.innerHTML = '';
    if (!freelancers || freelancers.length === 0) {
        listElement.innerHTML = '<p>ไม่พบฟรีแลนซ์</p>';
        return;
    }
    freelancers.forEach(f => {
        const card = document.createElement('div');
        card.className = 'freelancer-card';
        card.innerHTML = `
            <img src="${f.image_url || 'https://via.placeholder.com/60'}" alt="${f.name}">
            <div class="freelancer-info">
                <h3>${f.name}</h3>
                <p>${f.skills ? f.skills.replace(/,/g, ', ') : 'No skills listed'}</p>
                <a href="${f.portfolio_url}" target="_blank" class="portfolio-btn">ดูผลงาน</a>
            </div>
        `;
        listElement.appendChild(card);
    });
}

function filterFreelancers() {
    const searchTerm = document.getElementById('search-box').value.toLowerCase();
    const filtered = allFreelancers.filter(f =>
        (f.name && f.name.toLowerCase().includes(searchTerm)) ||
        (f.skills && f.skills.toLowerCase().includes(searchTerm))
    );
    displayFreelancers(filtered);
}

// --- ฟังก์ชันจัดการหน้าแชท ---
function displayChats() {
    const chatListContainer = document.getElementById('chat-list-container');
    chatListContainer.innerHTML = '';
    if (!allFreelancers || allFreelancers.length === 0) return;
    
    allFreelancers.forEach(freelancer => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.innerHTML = `
            <img src="${freelancer.image_url}" alt="${freelancer.name}">
            <div class="chat-info">
                <strong>${freelancer.name}</strong>
                <p>สถานะ: รอตอบกลับ</p>
            </div>
            <button class="contact-btn">คุยต่อ</button>
        `;
        chatItem.querySelector('.contact-btn').addEventListener('click', () => {
            openChatRoom(freelancer.name);
        });
        chatListContainer.appendChild(chatItem);
    });
}

function openChatRoom(freelancerName) {
    document.getElementById('chat-with-name').innerText = freelancerName;
    navigateTo('page-chat-room');
}

// --- ฟังก์ชันจัดการการโพสต์งาน ---
async function handleJobPost(event) {
    event.preventDefault();
    if (!currentUserProfile) {
        alert("Cannot get user profile. Please try again.");
        return;
    }

    const jobData = {
        clientId: currentUserProfile.userId,
        clientName: currentUserProfile.displayName,
        clientPicture: currentUserProfile.pictureUrl,
        title: document.getElementById('job-title').value,
        description: document.getElementById('job-description').value,
        category: document.getElementById('job-category').value,
        budget: parseInt(document.getElementById('job-budget').value, 10),
        postDate: new Date().toISOString().split('T')[0]
    };

    try {
        const database = firebase.database();
        await database.ref('jobs').push(jobData);
        alert("Job posted successfully!");
        document.getElementById('post-job-form').reset();
        document.getElementById('post-job-modal').classList.remove('visible');
        fetchMyJobs();
    } catch (error) {
        console.error("Error posting job:", error);
        alert("Failed to post job. Please try again.");
    }
}

// --- ฟังก์ชันดึงและแสดงงานที่เคยโพสต์ ---
async function fetchMyJobs() {
    if (!currentUserProfile) return;
    try {
        const database = firebase.database();
        const jobsRef = database.ref('jobs');
        const snapshot = await jobsRef.orderByChild('clientId').equalTo(currentUserProfile.userId).once('value');
        const jobsData = snapshot.val();
        const myJobs = Object.values(jobsData || {});
        displayMyJobs(myJobs);
    } catch (error) {
        console.error("Error fetching my jobs:", error);
    }
}

function displayMyJobs(jobs) {
    const listElement = document.getElementById('my-jobs-list');
    listElement.innerHTML = '';
    if (jobs.length === 0) {
        listElement.innerHTML = "<p>You haven't posted any jobs yet.</p>";
        return;
    }
    jobs.reverse().forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-card-header">
                <h3>${job.title}</h3>
                <span>Budget: ${job.budget} THB</span>
            </div>
            <p class="job-card-category">${job.category}</p>
            <p class="job-card-description">${job.description}</p>
            <div class="job-card-footer">
                Posted on ${job.postDate}
            </div>
        `;
        listElement.appendChild(card);
    });
}
